import * as vscode from 'vscode';
import { AnalysisContext } from './analyzer';
import { classifyRefactor } from './refactorType';
import { UnifiedAnalysisReport } from './pipeline/unifiedPipeline';
import { BenchmarkRunner, BenchmarkSuiteResult } from './benchmark/benchmarkRunner';
import { MetaheuristicComparisonEngine } from './natureInspired/comparisonEngine';
import { TraceGenerators } from './visualization/traceGenerators';
import { NPAdvisor } from './npCompleteness/npAdvisor';
import { EdgeCaseRunner } from './validation/edgeCaseRunner';
import { BeforeAfterRunner } from './benchmark/beforeAfterRunner';

export interface AdaptationRecord {
    from: string;
    to: string;
    reason: string;
    time: string;
}

export interface FileAnalysisInfo {
    fileName: string;
    filePath: string;
    uri: string;
    version: number;
    lastAnalyzed: string;
}

export interface RecentAnalysisRecord {
    fileName: string;
    filePath: string;
    timestamp: string;
    findingsCount: number;
    status: 'Analyzed' | 'Clean' | 'Optimized';
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export class AdaptixViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'adaptix.insightsView';
    private _view?: vscode.WebviewView;
    private _latestData: Map<string, AnalysisContext> = new Map();
    private _history: AdaptationRecord[] = [];
    private _latestReport?: UnifiedAnalysisReport;
    private _activeTab: string = 'overview';
    private _academicMode: boolean = false;
    private _optimizationBias: 'memory' | 'balanced' | 'speed' = 'speed';
    private _currentFile?: FileAnalysisInfo;
    private _recentAnalyses: RecentAnalysisRecord[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {
        const config = vscode.workspace.getConfiguration('adaptix');
        this._academicMode = config.get<boolean>('academicMode', false);
        this._optimizationBias = config.get<'memory' | 'balanced' | 'speed'>('optimizationBias', 'speed');
    }

    public setAcademicMode(enabled: boolean): void {
        this._academicMode = enabled;
        if (this._view) {
            this._view.webview.postMessage({ type: 'stateUpdate', academicMode: enabled });
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    public setOptimizationBias(bias: 'memory' | 'balanced' | 'speed'): void {
        this._optimizationBias = bias;
        if (this._view) {
            this._view.webview.postMessage({ type: 'stateUpdate', optimizationBias: bias });
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Handle bidirectional communication between Webview and Extension Backend
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'analyzeAgain':
                    vscode.commands.executeCommand('adaptix.analyzeCurrentFile');
                    break;

                case 'applyRefactor':
                    vscode.commands.executeCommand('adaptix.applyRefactor', message.varName, message.targetStructure);
                    break;

                case 'openSmartDiff':
                    vscode.commands.executeCommand('adaptix.openSmartDiff', message.varName, message.targetStructure);
                    break;

                case 'injectTemplate':
                    vscode.commands.executeCommand('adaptix.injectTemplate', message.paradigm);
                    break;

                case 'runEdgeCaseTest':
                    try {
                        const editor = vscode.window.activeTextEditor;
                        const code = editor ? editor.document.getText() : 'int fib(int n) { if (n <= 1) return n; return fib(n-1) + fib(n-2); }';
                        const report = await EdgeCaseRunner.runCounterexampleTest(code);
                        this._view?.webview.postMessage({ type: 'edgeCaseResult', payload: report });
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Adaptix Counterexample Test Error: ${err.message}`);
                    }
                    break;

                case 'runBeforeAfterBenchmark':
                    try {
                        const editor = vscode.window.activeTextEditor;
                        const code = editor ? editor.document.getText() : '';
                        const res = await BeforeAfterRunner.runBenchmark(code, code, {
                            varName: message.varName || 'arr',
                            fromStructure: message.fromStructure || 'std::vector',
                            toStructure: message.toStructure || 'std::unordered_set'
                        });
                        this._view?.webview.postMessage({ type: 'beforeAfterResult', payload: res });
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Adaptix Benchmark Error: ${err.message}`);
                    }
                    break;

                case 'setAcademicMode':
                    this._academicMode = !!message.enabled;
                    await vscode.workspace.getConfiguration('adaptix').update('academicMode', this._academicMode, vscode.ConfigurationTarget.Global);
                    if (this._view) {
                        this._view.webview.html = this._getHtmlForWebview();
                    }
                    break;

                case 'setOptimizationBias':
                    this._optimizationBias = message.bias;
                    await vscode.workspace.getConfiguration('adaptix').update('optimizationBias', this._optimizationBias, vscode.ConfigurationTarget.Global);
                    vscode.commands.executeCommand('adaptix.setOptimizationBias', message.bias);
                    break;

                case 'switchTab':
                    this._activeTab = message.tab;
                    break;

                case 'runBenchmark':
                    try {
                        const suite = message.suite || 'sorting';
                        const dist = message.distribution || 'random';
                        let result: BenchmarkSuiteResult;
                        if (suite === 'sorting') {
                            result = BenchmarkRunner.runSortingBenchmark(dist, [500, 1000, 2000, 4000]);
                        } else if (suite === 'fibonacci') {
                            result = BenchmarkRunner.runFibonacciBenchmark([10, 18, 24, 28, 30]);
                        } else {
                            result = BenchmarkRunner.runSearchBenchmark([1000, 10000, 50000, 100000]);
                        }
                        this._view?.webview.postMessage({
                            type: 'benchmarkResult',
                            payload: result
                        });
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Adaptix Benchmark Error: ${err.message}`);
                    }
                    break;

                case 'runNatureOptimization':
                    try {
                        const optType = message.optType || 'compare_tsp';
                        const seed = Number(message.seed) || 42;
                        if (optType === 'compare_tsp') {
                            const cities = MetaheuristicComparisonEngine.generateSampleCities(Number(message.numCities) || 14, seed);
                            const res = MetaheuristicComparisonEngine.compareTSP(cities, seed, {
                                maxIterations: Number(message.iterations) || 40,
                                numAnts: Number(message.population) || 20
                            }, {
                                maxGenerations: Number(message.iterations) || 40,
                                populationSize: Number(message.population) || 30
                            });
                            this._view?.webview.postMessage({ type: 'natureResult', optType, payload: res });
                        } else if (optType === 'compare_continuous') {
                            const func = message.func || 'sphere';
                            const res = MetaheuristicComparisonEngine.compareContinuous(func, 2, seed, {
                                maxIterations: Number(message.iterations) || 50,
                                swarmSize: Number(message.population) || 30
                            }, {
                                maxGenerations: Number(message.iterations) || 50,
                                populationSize: Number(message.population) || 30
                            });
                            this._view?.webview.postMessage({ type: 'natureResult', optType, payload: res });
                        }
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Adaptix Nature Lab Error: ${err.message}`);
                    }
                    break;

                case 'requestTrace':
                    try {
                        const mode = message.mode || 'dp_table';
                        let traceSteps: any[] = [];
                        if (mode === 'recursion_tree') {
                            traceSteps = TraceGenerators.generateFibonacciRecursionTree(4);
                        } else if (mode === 'dp_table') {
                            traceSteps = TraceGenerators.generate01KnapsackDPTable(7, [1, 3, 4, 5], [1, 4, 5, 7]);
                        } else if (mode === 'backtracking') {
                            traceSteps = TraceGenerators.generateNQueensTrace(4);
                        } else if (mode === 'graph') {
                            traceSteps = TraceGenerators.generateDijkstraTrace();
                        } else if (mode === 'sorting_searching') {
                            traceSteps = TraceGenerators.generateQuickSortTrace([29, 10, 14, 37, 13]);
                        }
                        this._view?.webview.postMessage({
                            type: 'traceResult',
                            mode,
                            payload: traceSteps
                        });
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Adaptix Visualizer Error: ${err.message}`);
                    }
                    break;

                case 'assessNPFeasibility':
                    try {
                        const problemId = message.problemId || 'tsp';
                        const n = Number(message.n) || 20;
                        const assessment = NPAdvisor.assessFeasibility(problemId, n);
                        this._view?.webview.postMessage({
                            type: 'npFeasibilityResult',
                            payload: assessment
                        });
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Adaptix NP Advisor Error: ${err.message}`);
                    }
                    break;
            }
        });

        this.update(this._latestData, this._history, this._latestReport, this._currentFile);
    }

    public update(
        analysisData: Map<string, AnalysisContext>,
        history: AdaptationRecord[] = this._history,
        unifiedReport?: UnifiedAnalysisReport,
        fileInfo?: FileAnalysisInfo
    ) {
        this._latestData = analysisData;
        this._history = history;
        if (unifiedReport) {
            this._latestReport = unifiedReport;
        }
        if (fileInfo) {
            this._currentFile = fileInfo;
            let findingsCount = 0;
            analysisData.forEach(ctx => {
                if (ctx.decision?.suggestedStructure && ctx.decision.suggestedStructure !== ctx.monitor.currentStructure) {
                    findingsCount++;
                }
            });
            if (unifiedReport?.algorithmStrategy.detectedStrategies) {
                findingsCount += unifiedReport.algorithmStrategy.detectedStrategies.length;
            }

            const existingIdx = this._recentAnalyses.findIndex(r => r.filePath === fileInfo.filePath);
            const record: RecentAnalysisRecord = {
                fileName: fileInfo.fileName,
                filePath: fileInfo.filePath,
                timestamp: fileInfo.lastAnalyzed,
                findingsCount,
                status: findingsCount > 0 ? 'Analyzed' : 'Clean'
            };
            if (existingIdx >= 0) {
                this._recentAnalyses[existingIdx] = record;
            } else {
                this._recentAnalyses.unshift(record);
                if (this._recentAnalyses.length > 8) {
                    this._recentAnalyses.pop();
                }
            }
        }
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    public setActiveTab(tab: string) {
        this._activeTab = tab;
        if (this._view) {
            this._view.webview.postMessage({ type: 'setActiveTab', tab });
        }
    }

    private _getHtmlForWebview(): string {
        const data = this._latestData;
        const report = this._latestReport;
        const history = this._history;
        const activeTab = this._activeTab || 'overview';
        const fileInfo = this._currentFile;

        // Count total findings
        let optimizableContainersCount = 0;
        const containerCards: { varName: string; ctx: AnalysisContext }[] = [];
        data.forEach((ctx, varName) => {
            containerCards.push({ varName, ctx });
            if (ctx.decision?.suggestedStructure && ctx.decision.suggestedStructure !== ctx.monitor.currentStructure) {
                optimizableContainersCount++;
            }
        });

        const strategiesCount = report?.algorithmStrategy.detectedStrategies.length || 0;
        const totalFindings = optimizableContainersCount + strategiesCount;

        // Optimization Strategy display text
        const biasVal = this._optimizationBias === 'memory' ? '0' : this._optimizationBias === 'balanced' ? '1' : '2';
        const biasText = this._optimizationBias === 'memory' ? 'Memory-First [O(1) Space]' :
                         this._optimizationBias === 'balanced' ? 'Balanced Strategy' : 'Speed-First [O(1) Time]';

        // ────────────── SECTION 1: OVERVIEW ──────────────
        const recentHistoryRows = this._recentAnalyses.length === 0
            ? `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 8px;">No analysis sessions recorded yet. Open a C++ file to begin.</td></tr>`
            : this._recentAnalyses.map(r => `
                <tr>
                    <td style="font-weight: 600; color: var(--accent-cyan);">${escapeHtml(r.fileName)}</td>
                    <td style="color: var(--text-secondary); font-size: 0.65rem;">${r.timestamp}</td>
                    <td><span class="badge ${r.findingsCount > 0 ? 'conf-moderate' : 'conf-strong'}">${r.findingsCount} Findings</span></td>
                    <td><span class="badge current">${r.status}</span></td>
                </tr>
            `).join('');

        const overviewTopRecHtml = totalFindings > 0
            ? `
            <div class="two-sentence-box" style="margin-top: 8px;">
                <p style="font-weight: 700; color: var(--accent-cyan); font-size: 0.74rem; margin-bottom: 3px;">What Was Found:</p>
                <p class="two-sentence-text">
                    ${escapeHtml(report?.executiveSummary.bottleneckHeadline || `${totalFindings} algorithmic and data structure optimization opportunities detected in active buffer.`)}
                </p>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--glass-border); font-size: 0.7rem; color: var(--text-secondary);">
                    <strong style="color: var(--accent-green);">What To Do Next:</strong>
                    Inspect <strong>Data Structure Usage</strong> and <strong>Algorithm Patterns</strong> in Code Intelligence, or switch to <strong>Optimization Workflow</strong> to preview side-by-side diffs and apply changes safely.
                </div>
            </div>`
            : `
            <div class="glass-card" style="margin-top: 8px; text-align: center; padding: 12px;">
                <span class="badge conf-strong" style="margin-bottom: 6px;">✓ Clean Baseline</span>
                <p style="font-size: 0.72rem; color: var(--text-secondary);">No severe container bottlenecks or unbounded recursions detected in current file.</p>
            </div>`;

        // ────────────── SECTION 2: CODE INTELLIGENCE ──────────────
        let dsUsageHtml = '';
        if (containerCards.length === 0) {
            dsUsageHtml = `
            <div class="glass-card" style="text-align: center; padding: 14px;">
                <p style="font-weight: 600; font-size: 0.75rem;">Listening for C++ Data Structures...</p>
                <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Declare standard containers (std::vector, std::map, std::set) in active C++ code to analyze usage.</p>
            </div>`;
        } else {
            containerCards.forEach(({ varName, ctx }) => {
                const isOptimizable = ctx.decision?.suggestedStructure && ctx.decision.suggestedStructure !== ctx.monitor.currentStructure;
                const confClass = ctx.decision?.confidenceLabel === 'Strong' ? 'conf-strong' :
                                  ctx.decision?.confidenceLabel === 'Moderate' ? 'conf-moderate' : 'conf-low';
                const twoSentence = ctx.decision?.twoSentenceSummary ||
                    `${varName} (${ctx.monitor.currentStructure.replace('std::', '')}) exhibits high operation overhead. Switching to ${ctx.decision?.suggestedStructure?.replace('std::', '') || 'optimal container'} improves complexity.`;
                const deepExplain = ctx.decision?.deepExplanation || ctx.decision?.explanation?.primaryReason || 'Detailed theoretical analysis and asymptotic trade-offs available.';

                dsUsageHtml += `
                <div class="glass-card">
                    <div class="card-header">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.78rem;">${escapeHtml(varName)}</span>
                            <span class="badge current">${ctx.monitor.currentStructure.replace('std::', '')}</span>
                        </div>
                        <span style="font-size: 0.65rem; color: var(--text-muted);">${ctx.monitor.totalOperations} ops tracked</span>
                    </div>

                    <!-- Workload Distribution -->
                    <div class="progress-bar-container">
                        <div class="progress-segment insert" style="width: ${ctx.monitor.insertRatio * 100}%;"></div>
                        <div class="progress-segment search" style="width: ${ctx.monitor.searchRatio * 100}%;"></div>
                        <div class="progress-segment delete" style="width: ${ctx.monitor.deleteRatio * 100}%;"></div>
                    </div>
                    <div class="progress-labels">
                        <span>Ins ${(ctx.monitor.insertRatio * 100).toFixed(0)}%</span>
                        <span>Src ${(ctx.monitor.searchRatio * 100).toFixed(0)}%</span>
                        <span>Del ${(ctx.monitor.deleteRatio * 100).toFixed(0)}%</span>
                    </div>

                    ${isOptimizable ? `
                    <div style="margin-top: 8px; border-top: 1px solid var(--glass-border); padding-top: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span class="badge recommendation">⚡ Target: ${ctx.decision?.suggestedStructure?.replace('std::', '')}</span>
                            <span class="badge ${confClass}">${ctx.decision?.confidenceLabel} (${ctx.decision?.speedup || 'Faster'})</span>
                        </div>
                        <div class="two-sentence-box">
                            <p class="two-sentence-text">${escapeHtml(twoSentence)}</p>
                        </div>
                        <details class="explain-accordion" ${this._academicMode ? 'open' : ''}>
                            <summary>Read More / Theoretical Trade-offs</summary>
                            <div class="accordion-body">
                                <p style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4;">${escapeHtml(deepExplain)}</p>
                                ${ctx.decision?.explanation?.tradeoffs && ctx.decision.explanation.tradeoffs.length > 0 ? `
                                    <div style="margin-top: 6px;">
                                        <strong style="color: var(--accent-orange); font-size: 0.68rem;">Trade-offs:</strong>
                                        <ul style="margin: 2px 0 0 16px; font-size: 0.65rem; color: var(--text-secondary);">
                                            ${ctx.decision.explanation.tradeoffs.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        </details>
                    </div>
                    ` : `
                    <div style="margin-top: 6px; font-size: 0.7rem; color: var(--accent-green);">
                        ✓ Optimal data structure usage for observed access patterns.
                    </div>
                    `}
                </div>`;
            });
        }

        // Algorithm Patterns
        let algoPatternsHtml = '';
        if (!report || report.algorithmStrategy.detectedStrategies.length === 0) {
            algoPatternsHtml = `
            <div class="glass-card" style="text-align: center; padding: 12px;">
                <p style="font-size: 0.72rem; color: var(--text-muted);">No distinct algorithmic paradigm bottlenecks detected in current functions.</p>
            </div>`;
        } else {
            report.algorithmStrategy.detectedStrategies.forEach(s => {
                const isConfirmed = s.confidenceLabel === 'Strong';
                algoPatternsHtml += `
                <div class="glass-card">
                    <div class="card-header">
                        <span class="card-title" style="color: var(--accent-purple); font-size: 0.76rem;">${s.detectedParadigm.replace('_', ' ').toUpperCase()}</span>
                        <span class="badge ${isConfirmed ? 'conf-strong' : 'conf-moderate'}">${isConfirmed ? 'Confirmed Detection' : 'Heuristic Estimate'}</span>
                    </div>
                    <p style="font-size: 0.72rem; color: var(--text-primary); margin-bottom: 4px;">${escapeHtml(s.primaryReason)}</p>
                    <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 4px;">
                        <span>Recurrence: <code style="color: var(--accent-cyan);">${escapeHtml(s.recurrenceRelation || 'N/A')}</code></span>
                        ${report.algorithmStrategy.hasOverlappingSubproblems ? ' | <span style="color: var(--accent-orange); font-weight: 600;">Overlapping Subproblems</span>' : ''}
                    </div>
                </div>`;
            });
        }

        // ────────────── SECTION 3: OPTIMIZATION WORKFLOW ──────────────
        const primaryOpt = containerCards.find(c => c.ctx.decision?.suggestedStructure && c.ctx.decision.suggestedStructure !== c.ctx.monitor.currentStructure);
        const optVarName = primaryOpt ? primaryOpt.varName : 'activeOrderIds';
        const optCurrentDS = primaryOpt ? primaryOpt.ctx.monitor.currentStructure : 'std::vector';
        const optTargetDS = primaryOpt ? (primaryOpt.ctx.decision?.suggestedStructure || 'std::unordered_set') : 'std::unordered_set';

        // ────────────── SECTION 4: BENCHMARK LAB ──────────────
        // Section 4 HTML is interactive via Webview JS and BeforeAfterRunner

        // ────────────── SECTION 5: LEARN & EXPLORE ──────────────
        // Section 5 HTML is interactive via Webview JS and TraceGenerators

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADAPTIX 3.0</title>
    <style>
        :root {
            --bg-base: #0b0f17;
            --bg-surface: rgba(18, 24, 38, 0.85);
            --bg-card: rgba(23, 32, 51, 0.75);
            --bg-card-hover: rgba(30, 42, 68, 0.85);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-border-bright: rgba(56, 189, 248, 0.4);
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent-cyan: #38bdf8;
            --accent-blue: #3b82f6;
            --accent-purple: #a855f7;
            --accent-green: #22c55e;
            --accent-orange: #f97316;
            --accent-red: #ef4444;
            --font-mono: 'Consolas', 'Fira Code', 'Courier New', monospace;
            --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-sans); background: var(--bg-base); color: var(--text-primary); padding: 8px; font-size: 13px; line-height: 1.45; overflow-x: hidden; }
        
        .brand-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(168, 85, 247, 0.12)); border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 10px; }
        .brand-title { display: flex; flex-direction: column; }
        .brand-logo-text { font-weight: 800; font-size: 0.95rem; letter-spacing: 1.2px; color: var(--accent-cyan); display: flex; align-items: center; gap: 6px; }
        .brand-badge { font-size: 0.6rem; padding: 1px 5px; border-radius: 10px; background: rgba(56, 189, 248, 0.2); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.35); font-weight: 700; }
        .brand-subtext { font-size: 0.65rem; color: var(--text-muted); margin-top: 1px; }

        .academic-toggle-container { display: flex; align-items: center; gap: 6px; font-size: 0.68rem; color: var(--text-secondary); cursor: pointer; }
        .switch { position: relative; display: inline-block; width: 32px; height: 16px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.15); transition: .3s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 10px; width: 10px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--accent-purple); }
        input:checked + .slider:before { transform: translateX(16px); }

        /* Exactly 5 Primary Tabs + 1 Hidden Advanced */
        .nav-tabs { display: flex; gap: 3px; margin-bottom: 10px; border-bottom: 1px solid var(--glass-border); padding-bottom: 6px; overflow-x: auto; scrollbar-width: none; }
        .nav-tabs::-webkit-scrollbar { display: none; }
        .nav-tab { flex: 1; text-align: center; padding: 5px 6px; background: rgba(255, 255, 255, 0.03); color: var(--text-secondary); border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 0.68rem; font-weight: 600; transition: all 0.15s ease; white-space: nowrap; }
        .nav-tab:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.07); }
        .nav-tab.active { color: var(--accent-cyan); background: rgba(56, 189, 248, 0.14); border-color: rgba(56, 189, 248, 0.35); }
        .nav-tab.academic-tab { color: var(--accent-purple); }
        .nav-tab.academic-tab.active { background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.4); }

        .tab-panel { display: none; }
        .tab-panel.active { display: block; }

        .glass-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; backdrop-filter: blur(10px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .card-title { font-size: 0.78rem; font-weight: 700; color: var(--text-primary); }

        .badge { font-size: 0.62rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px; }
        .badge.current { background: rgba(255, 255, 255, 0.1); color: var(--text-primary); }
        .badge.recommendation { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); border: 1px solid rgba(34, 197, 94, 0.35); }
        .badge.conf-strong { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); }
        .badge.conf-moderate { background: rgba(250, 204, 21, 0.15); color: #facc15; }
        .badge.conf-low { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); }
        .badge.academic { background: rgba(168, 85, 247, 0.2); color: var(--accent-purple); }

        .two-sentence-box { background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--accent-cyan); padding: 8px 10px; border-radius: 4px; margin: 6px 0; }
        .two-sentence-text { font-size: 0.72rem; color: var(--text-primary); line-height: 1.4; }

        details.explain-accordion { margin-top: 6px; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--glass-border); border-radius: 6px; }
        details.explain-accordion summary { padding: 5px 8px; font-size: 0.68rem; font-weight: 600; color: var(--accent-cyan); cursor: pointer; user-select: none; }
        .accordion-body { padding: 8px; font-size: 0.7rem; color: var(--text-secondary); border-top: 1px solid var(--glass-border); }

        .btn-action { background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 5px; padding: 6px 10px; font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-action:hover { background: rgba(56, 189, 248, 0.25); }
        .btn-action.success { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); border-color: rgba(34, 197, 94, 0.35); }
        .btn-action.success:hover { background: rgba(34, 197, 94, 0.25); }
        .btn-action.purple { background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); border-color: rgba(168, 85, 247, 0.35); }
        .btn-action.purple:hover { background: rgba(168, 85, 247, 0.25); }
        .btn-action.danger { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); border-color: rgba(239, 68, 68, 0.35); }

        .progress-bar-container { height: 5px; background: rgba(255, 255, 255, 0.06); border-radius: 3px; display: flex; overflow: hidden; margin: 6px 0; }
        .progress-segment.insert { background: #3b82f6; }
        .progress-segment.search { background: #22c55e; }
        .progress-segment.delete { background: #ef4444; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-secondary); }

        .bias-slider-container { background: rgba(0, 0, 0, 0.25); border: 1px solid var(--glass-border); border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; }
        .bias-range-input { width: 100%; -webkit-appearance: none; height: 5px; border-radius: 3px; background: linear-gradient(to right, #3b82f6, #a855f7, #22c55e); outline: none; margin: 6px 0; }
        .bias-range-input::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%; background: #ffffff; cursor: pointer; border: 2px solid var(--accent-cyan); }
        .bias-labels { display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-secondary); }

        .timeline-range { width: 100%; -webkit-appearance: none; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.1); outline: none; cursor: pointer; }
        .timeline-range::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--accent-cyan); cursor: pointer; }
        .timeline-controls { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 4px; }
        .btn-icon { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; }
        .btn-icon:hover { background: rgba(255, 255, 255, 0.12); color: var(--accent-cyan); }
        .speed-select { background: rgba(0, 0, 0, 0.3); border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 4px 6px; border-radius: 4px; font-size: 0.68rem; outline: none; }

        .dp-table-container { overflow-x: auto; margin: 8px 0; max-height: 200px; border: 1px solid var(--glass-border); border-radius: 6px; }
        .dp-grid { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.68rem; text-align: center; }
        .dp-grid th, .dp-grid td { border: 1px solid var(--glass-border); padding: 4px 6px; }
        .dp-grid th { background: rgba(255, 255, 255, 0.05); color: var(--accent-cyan); }
        .dp-grid td.active-cell { background: rgba(56, 189, 248, 0.3); color: #fff; font-weight: bold; }
        .dp-grid td.dep-cell { background: rgba(168, 85, 247, 0.25); color: #e9d5ff; }
        .dp-grid td.reconstructed-cell { background: rgba(34, 197, 94, 0.3); color: var(--accent-green); font-weight: bold; }

        .diff-container { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; font-family: var(--font-mono); font-size: 0.68rem; }
        .diff-block { padding: 6px 8px; border-radius: 4px; border: 1px solid var(--glass-border); overflow-x: auto; white-space: pre; }
        .diff-del { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }
        .diff-add { background: rgba(34, 197, 94, 0.15); color: #86efac; border-color: rgba(34, 197, 94, 0.3); }

        .chart-box { width: 100%; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--glass-border); border-radius: 6px; margin: 6px 0; }
        .step-num { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--accent-cyan); color: #000; font-weight: bold; font-size: 0.65rem; margin-right: 6px; }
    </style>
</head>
<body>
    <!-- Top Header with Ownership Branding -->
    <div class="brand-header">
        <div class="brand-title">
            <div class="brand-logo-text">
                <span>ADAPTIX</span>
                <span class="brand-badge">3.0 PRO</span>
            </div>
            <div class="brand-subtext">Asmit Bhorade &bull; Algorithm Intelligence Engine</div>
        </div>
        <div class="header-controls">
            <label class="academic-toggle-container" title="Toggle Advanced Academic Mode (NP-Completeness, Nature Lab, Mathematical Derivations)">
                <span>Advanced Mode</span>
                <div class="switch">
                    <input type="checkbox" id="academicModeCheckbox" ${this._academicMode ? 'checked' : ''} onchange="toggleAcademicMode()">
                    <span class="slider"></span>
                </div>
            </label>
        </div>
    </div>

    <!-- Exactly 5 Primary Navigation Tabs + 1 Hidden Advanced Section -->
    <div class="nav-tabs">
        <button class="nav-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview" onclick="selectTab('overview')">
            🏠 Overview
        </button>
        <button class="nav-tab ${activeTab === 'intelligence' ? 'active' : ''}" data-tab="intelligence" onclick="selectTab('intelligence')">
            🧠 Code Intelligence
        </button>
        <button class="nav-tab ${activeTab === 'optimization' ? 'active' : ''}" data-tab="optimization" onclick="selectTab('optimization')">
            ⚡ Optimization Workflow
        </button>
        <button class="nav-tab ${activeTab === 'benchmark' ? 'active' : ''}" data-tab="benchmark" onclick="selectTab('benchmark')">
            📊 Benchmark Lab
        </button>
        <button class="nav-tab ${activeTab === 'learn' ? 'active' : ''}" data-tab="learn" onclick="selectTab('learn')">
            🔬 Learn & Explore
        </button>
        <button id="academicNavTab" class="nav-tab academic-tab ${activeTab === 'academic' ? 'active' : ''}" data-tab="academic" style="display: ${this._academicMode ? 'block' : 'none'};" onclick="selectTab('academic')">
            🎓 Academic Lab
        </button>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- SECTION 1: OVERVIEW (LANDING PAGE) -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-overview" class="tab-panel ${activeTab === 'overview' ? 'active' : ''}">
        <!-- File & Status Card -->
        <div class="glass-card">
            <div class="card-header">
                <div>
                    <span class="card-title" style="display: block;">Active File Status</span>
                    <span style="font-size: 0.68rem; color: var(--accent-cyan); font-family: var(--font-mono);">${fileInfo ? escapeHtml(fileInfo.fileName) : 'No C++ file active'}</span>
                </div>
                <button class="btn-action" onclick="analyzeAgain()">🔄 Analyze Again</button>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 6px; font-size: 0.68rem; color: var(--text-secondary);">
                <span>Status: <strong style="color: ${totalFindings > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'};">${totalFindings > 0 ? totalFindings + ' Optimizations Found' : 'Ready / Clean'}</strong></span>
                <span>&bull;</span>
                <span>Analyzed: ${fileInfo ? fileInfo.lastAnalyzed : 'Awaiting file open'}</span>
            </div>
            ${overviewTopRecHtml}
        </div>

        <!-- Recent Analysis History Card -->
        <div class="glass-card">
            <div class="card-header">
                <span class="card-title">Recent Analysis History</span>
                <span style="font-size: 0.62rem; color: var(--text-muted);">Session Memory</span>
            </div>
            <table class="dp-grid" style="margin-top: 4px;">
                <thead>
                    <tr>
                        <th style="text-align: left;">File</th>
                        <th>Time</th>
                        <th>Findings</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentHistoryRows}
                </tbody>
            </table>
            <p style="font-size: 0.62rem; color: var(--text-muted); margin-top: 6px; text-align: right;">
                * In-memory session history resets when VS Code reloads.
            </p>
        </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- SECTION 2: CODE INTELLIGENCE -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-intelligence" class="tab-panel ${activeTab === 'intelligence' ? 'active' : ''}">
        <!-- Optimization Strategy Control -->
        <div class="bias-slider-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                <strong>Optimization Strategy:</strong>
                <span id="biasCurrentLabel" style="color: var(--accent-cyan); font-weight: 700;">${biasText}</span>
            </div>
            <input type="range" id="biasRangeInput" class="bias-range-input" min="0" max="2" step="1" value="${biasVal}" oninput="onBiasSliderChange(this.value)">
            <div class="bias-labels">
                <span>Memory-First [O(1) Space]</span>
                <span>Balanced</span>
                <span>Speed-First [O(1) Time]</span>
            </div>
        </div>

        <!-- Data Structure Usage -->
        <div style="margin-bottom: 8px;">
            <div class="card-header" style="margin-bottom: 4px;">
                <span class="card-title">Data Structure Usage</span>
                <span class="badge current">${containerCards.length} Tracked</span>
            </div>
            ${dsUsageHtml}
        </div>

        <!-- Algorithm Patterns -->
        <div style="margin-bottom: 8px;">
            <div class="card-header" style="margin-bottom: 4px;">
                <span class="card-title">Algorithm Patterns</span>
                <span class="badge current">${strategiesCount} Patterns</span>
            </div>
            ${algoPatternsHtml}
        </div>

        <!-- Complexity Analysis -->
        <div class="glass-card">
            <div class="card-header">
                <span class="card-title">Complexity Analysis</span>
                <span class="badge conf-strong">Asymptotic Model</span>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-primary); margin-bottom: 6px;">
                Time and space bounds derived via static AST analysis and loop nesting depth extraction:
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.68rem;">
                <div style="background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px;">
                    <div style="color: var(--accent-cyan); font-weight: 700;">Time Complexity</div>
                    <div style="color: var(--text-secondary); margin-top: 2px;">Worst Case: <code style="color: #fca5a5;">${optimizableContainersCount > 0 ? 'O(N²) Quadratic' : 'O(N) Linear'}</code></div>
                    <div style="color: var(--text-secondary);">Average: <code style="color: #fde047;">${optimizableContainersCount > 0 ? 'O(N) to O(N²)' : 'O(N)'}</code></div>
                </div>
                <div style="background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px;">
                    <div style="color: var(--accent-green); font-weight: 700;">Space Complexity</div>
                    <div style="color: var(--text-secondary); margin-top: 2px;">Auxiliary: <code style="color: #86efac;">O(1) to O(N)</code></div>
                    <div style="color: var(--text-secondary);">Stack Depth: <code style="color: #86efac;">${strategiesCount > 0 ? 'O(N) Recursive' : 'O(1) Iterative'}</code></div>
                </div>
            </div>
        </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- SECTION 3: OPTIMIZATION WORKFLOW -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-optimization" class="tab-panel ${activeTab === 'optimization' ? 'active' : ''}">
        <div class="glass-card">
            <div class="card-header">
                <span class="card-title">Step-by-Step Optimization Workflow</span>
                <span class="badge recommendation">Safe Refactoring</span>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 8px;">
                Walk through identified opportunities, inspect problem diagnostics, review proposed code diffs, and apply optimizations with confirmation.
            </p>

            <!-- Step 1: Suggested Improvement -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 2px;">
                    <span class="step-num">1</span> Suggested Improvement
                </div>
                <div style="background: rgba(0,0,0,0.25); padding: 6px 8px; border-radius: 4px; font-size: 0.7rem;">
                    Migrate <code>${escapeHtml(optVarName)}</code> from <strong style="color: #fca5a5;">${escapeHtml(optCurrentDS)}</strong> to <strong style="color: var(--accent-green);">${escapeHtml(optTargetDS)}</strong>
                </div>
            </div>

            <!-- Step 2: The Problem -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-orange); margin-bottom: 2px;">
                    <span class="step-num">2</span> The Problem (Why It Degrades Performance)
                </div>
                <p style="font-size: 0.7rem; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 6px 8px; border-radius: 4px;">
                    Inside the processing loop, <code>.erase()</code> on contiguous memory forces a linear shift of all following elements. Repeated within a loop, this turns an intended linear filter into an O(N²) quadratic bottleneck.
                </p>
            </div>

            <!-- Step 3: The Alternative -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-green); margin-bottom: 2px;">
                    <span class="step-num">3</span> The Alternative (Why It Resolves The Issue)
                </div>
                <p style="font-size: 0.7rem; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 6px 8px; border-radius: 4px;">
                    <code>${escapeHtml(optTargetDS)}</code> implements hash-bucket key lookups and unlinked node erasures, achieving O(1) amortized deletion without shifting sibling elements.
                </p>
            </div>

            <!-- Step 4: Expected Complexity Changes -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-purple); margin-bottom: 2px;">
                    <span class="step-num">4</span> Expected Complexity Changes
                </div>
                <table class="dp-grid">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Before (${escapeHtml(optCurrentDS.replace('std::', ''))})</th>
                            <th>After (${escapeHtml(optTargetDS.replace('std::', ''))})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Batch Erase</td>
                            <td style="color: #fca5a5;">O(N²) Quadratic</td>
                            <td style="color: var(--accent-green); font-weight: bold;">O(N) Linear</td>
                        </tr>
                        <tr>
                            <td>Duplicate Check</td>
                            <td style="color: #fca5a5;">O(N) std::find</td>
                            <td style="color: var(--accent-green); font-weight: bold;">O(1) .count()</td>
                        </tr>
                        <tr>
                            <td>Auxiliary Space</td>
                            <td style="color: #86efac;">O(1) overhead</td>
                            <td style="color: #fde047;">O(N) hash table</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Step 5 & 6: Proposed Code & Diff Preview -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 2px;">
                    <span class="step-num">5</span> Before / After Diff Preview
                </div>
                <div class="diff-container">
                    <div class="diff-block diff-del">- ${escapeHtml(optCurrentDS)}&lt;int&gt; ${escapeHtml(optVarName)};
- ${escapeHtml(optVarName)}.push_back(orderId);
- auto it = std::find(${escapeHtml(optVarName)}.begin(), ${escapeHtml(optVarName)}.end(), id);
- ${escapeHtml(optVarName)}.erase(it);</div>
                    <div class="diff-block diff-add">+ ${escapeHtml(optTargetDS)}&lt;int&gt; ${escapeHtml(optVarName)};
+ ${escapeHtml(optVarName)}.insert(orderId);
+ bool exists = ${escapeHtml(optVarName)}.count(id) &gt; 0;
+ ${escapeHtml(optVarName)}.erase(id);</div>
                </div>
                <button class="btn-action" style="width: 100%; margin-top: 4px;" onclick="openSmartDiff('${optVarName}', '${optTargetDS}')">
                    🔍 Open Side-by-Side Smart Diff in VS Code
                </button>
            </div>

            <!-- Step 7: Explicit User Confirmation & Apply -->
            <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-green); margin-bottom: 4px;">
                    <span class="step-num">6</span> Confirm & Apply Optimization
                </div>
                <p style="font-size: 0.68rem; color: var(--text-muted); margin-bottom: 6px;">
                    Safety Guarantee: Changes are never silently applied. Comments, namespaces, includes, and unrelated functions are preserved.
                </p>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-action success" style="flex: 1;" onclick="applyRefactor('${optVarName}', '${optTargetDS}')">
                        ✓ Confirm & Apply Changes
                    </button>
                    <button class="btn-action purple" style="flex: 1;" onclick="injectTemplate('dynamic_programming_tab')">
                        🛠️ Inject DP Skeleton
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- SECTION 4: BENCHMARK LAB -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-benchmark" class="tab-panel ${activeTab === 'benchmark' ? 'active' : ''}">
        <!-- Closed-Loop Before/After Optimization Runner -->
        <div class="glass-card">
            <div class="card-header">
                <span class="card-title">Before vs. After Optimization Benchmark</span>
                <span class="badge conf-strong">Real -O2 Execution</span>
            </div>
            <p style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 6px;">
                Compiles user code against proposed optimized container using native g++ with -O2 optimization. Executes in child process with wall-clock timing.
            </p>
            <button class="btn-action success" style="width: 100%;" onclick="runBeforeAfterBenchmark('${optVarName}', '${optCurrentDS}', '${optTargetDS}')">
                ⚡ Run Measured Before/After Benchmark
            </button>
            <div id="beforeAfterResultBox" style="display: none; margin-top: 8px;"></div>
        </div>

        <!-- Empirical Measured Performance Suites -->
        <div class="glass-card">
            <div class="card-header">
                <span class="card-title">Standard Algorithm Benchmark Suite</span>
                <span class="badge current">Measured Performance</span>
            </div>
            <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <select id="benchSuite" class="speed-select" style="flex: 2;">
                    <option value="sorting">Sorting Suite (Bubble vs Merge vs Quick)</option>
                    <option value="fibonacci">Fibonacci Suite (Recursion vs DP)</option>
                    <option value="search">Search Suite (Linear vs Binary)</option>
                </select>
                <select id="benchDist" class="speed-select" style="flex: 1;">
                    <option value="random">Random</option>
                    <option value="sorted">Sorted</option>
                    <option value="reverse_sorted">Reverse</option>
                    <option value="duplicate_heavy">Duplicates</option>
                </select>
            </div>
            <button class="btn-action" style="width: 100%;" onclick="triggerBenchmarkSuite()">
                ▶ Run Benchmark Suite
            </button>
        </div>

        <div id="benchmarkResultContainer" style="display: none;" class="glass-card">
            <div class="card-header">
                <span id="benchTitle" class="card-title" style="color: var(--accent-cyan);">Benchmark Results</span>
            </div>
            <div id="benchmarkSummary" style="font-size: 0.7rem; color: var(--text-primary); margin-bottom: 6px; background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px;"></div>
            <div id="benchmarkTableContainer" class="dp-table-container"></div>
            <p style="font-size: 0.62rem; color: var(--text-muted); margin-top: 4px;">
                Safety guarantee: Executed via external worker process with timeout killing. Zero simulated numbers.
            </p>
        </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- SECTION 5: LEARN & EXPLORE -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-learn" class="tab-panel ${activeTab === 'learn' ? 'active' : ''}">
        <div class="glass-card">
            <div class="card-header">
                <div>
                    <span class="card-title">Step-by-Step Visualization</span>
                    <div style="margin-top: 2px;">
                        <span class="badge conf-moderate">📚 Educational Simulation (Predefined Canonical Trace)</span>
                    </div>
                </div>
                <span id="vizFrameCounter" style="font-family: var(--font-mono); font-size: 0.68rem; color: var(--accent-cyan);">Frame 0 of 0</span>
            </div>
            <p style="font-size: 0.68rem; color: var(--text-muted); margin-bottom: 8px;">
                Canonical algorithmic trace for interactive study of recurrence relations, tree pruning, and state tables.
            </p>

            <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                <select id="vizPresetSelect" class="speed-select" style="flex: 1;" onchange="loadSelectedTrace()">
                    <option value="dp_table">Dynamic Programming: 0/1 Knapsack Table</option>
                    <option value="recursion_tree">Recursion Tree: Fibonacci Overlapping Calls</option>
                    <option value="backtracking">Backtracking: N-Queens Constraint Pruning</option>
                    <option value="graph">Graph Traversal: Dijkstra's Shortest Path</option>
                    <option value="sorting_searching">Sorting: QuickSort Pivot Partitioning</option>
                </select>
                <button class="btn-action" onclick="loadSelectedTrace()">Load</button>
            </div>

            <!-- Timeline Scrubber -->
            <input type="range" id="vizTimelineScrubber" class="timeline-range" min="0" max="0" value="0" oninput="scrubToFrame(this.value)">

            <!-- Controls -->
            <div class="timeline-controls">
                <button class="btn-icon" onclick="timelineFirst()" title="First Frame">|◀</button>
                <button class="btn-icon" onclick="timelinePrev()" title="Previous Frame">◀</button>
                <button id="vizPlayPauseBtn" class="btn-icon" onclick="timelineTogglePlay()" style="min-width: 65px;">▶ Play</button>
                <button class="btn-icon" onclick="timelineNext()" title="Next Frame">▶</button>
                <button class="btn-icon" onclick="timelineLast()" title="Last Frame">▶|</button>
                <select id="vizSpeedSelect" class="speed-select" onchange="setPlaybackSpeed(this.value)">
                    <option value="0.5">0.5x</option>
                    <option value="1.0" selected>1.0x</option>
                    <option value="2.0">2.0x</option>
                </select>
            </div>
        </div>

        <div id="vizDisplayContainer" class="glass-card" style="display: none;">
            <div id="vizStepTitle" style="font-weight: 700; color: var(--accent-cyan); font-size: 0.78rem; margin-bottom: 3px;"></div>
            <div id="vizStepExplanation" style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 6px;"></div>
            <div class="chart-box" style="height: 180px;">
                <canvas id="vizCanvas"></canvas>
            </div>
            <div id="vizCustomDOM"></div>
        </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- SECTION 6: ADVANCED ACADEMIC LAB (HIDDEN BY DEFAULT) -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-academic" class="tab-panel ${activeTab === 'academic' ? 'active' : ''}">
        <div class="glass-card" style="border-left: 3px solid var(--accent-purple);">
            <div class="card-header">
                <div>
                    <span class="card-title" style="color: var(--accent-purple);">Academic Mode (DAA Semester 5)</span>
                    <div style="margin-top: 2px;">
                        <span class="badge academic">🎓 Standalone Academic Simulation</span>
                    </div>
                </div>
                <span class="badge academic">Active</span>
            </div>
            <p style="font-size: 0.7rem; color: var(--text-secondary);">
                Theoretical models for NP-Completeness feasibility gating, reductions, and Nature-Inspired metaheuristics. Independent of active editor C++ AST.
            </p>
        </div>

        <!-- NP Feasibility Estimator -->
        <div class="glass-card">
            <span class="card-title" style="display: block; margin-bottom: 4px;">NP Feasibility Estimator</span>
            <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <select id="npProblemSelect" class="speed-select" style="flex: 2;">
                    <option value="tsp">Travelling Salesperson Problem (TSP)</option>
                    <option value="vertex_cover">Minimum Vertex Cover</option>
                    <option value="sat">Boolean Satisfiability (SAT / 3-SAT)</option>
                    <option value="clique">Maximum Clique</option>
                </select>
                <input id="npInputN" type="number" class="speed-select" value="20" min="2" max="1000" style="width: 50px;" />
                <button class="btn-action purple" onclick="assessNP()">Evaluate</button>
            </div>
        </div>

        <div id="npAssessmentResult" style="display: none;" class="glass-card">
            <div class="card-header">
                <span id="npResultTitle" class="card-title">Feasibility Report</span>
                <span id="npTierBadge" class="badge"></span>
            </div>
            <div style="font-size: 0.7rem; line-height: 1.45;">
                <p><strong>Exact Operations:</strong> <span id="npOps" style="font-family: var(--font-mono); color: var(--accent-orange);"></span></p>
                <p><strong>Estimated Exact Runtime:</strong> <span id="npTime" style="color: var(--accent-orange);"></span></p>
                <p><strong>Recommended Strategy:</strong> <span id="npRec" style="color: var(--accent-green); font-weight: 600;"></span></p>
                <p id="npSpecific" style="margin-top: 3px; color: var(--text-secondary);"></p>
                <div style="background: rgba(0,0,0,0.25); border-left: 3px solid var(--accent-purple); padding: 4px 6px; margin-top: 4px; border-radius: 2px;">
                    <strong>Trade-off:</strong>
                    <p id="npTradeoff" style="color: var(--text-secondary);"></p>
                </div>
            </div>
        </div>

        <!-- Nature-Inspired Optimization Lab -->
        <div class="glass-card">
            <span class="card-title" style="display: block; margin-bottom: 6px;">Nature-Inspired Optimization Lab</span>
            <div style="display: flex; gap: 4px;">
                <button class="btn-action purple" style="flex: 1;" onclick="runNatureOpt('compare_tsp')">ACO vs GA (TSP)</button>
                <button class="btn-action purple" style="flex: 1;" onclick="runNatureOpt('compare_continuous')">PSO vs GA (Continuous)</button>
            </div>
        </div>

        <div id="natureResultBox" style="display: none;" class="glass-card">
            <div class="card-header">
                <span id="natureResultTitle" class="card-title">Convergence Comparison</span>
                <span id="natureWinnerBadge" class="badge recommendation"></span>
            </div>
            <div class="chart-box" style="height: 160px;">
                <canvas id="natureCanvas"></canvas>
            </div>
            <p id="natureSummaryText" style="font-size: 0.7rem; color: var(--text-primary); margin: 4px 0; background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px;"></p>
            <div id="natureMetricsGrid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;"></div>
        </div>
    </div>

    <!-- Client Script -->
    <script>
        const vscode = acquireVsCodeApi();

        let currentAcademicMode = ${this._academicMode};
        let currentOptimizationBias = '${this._optimizationBias}';
        let activeTabId = '${activeTab}';

        let activeTraceSteps = [];
        let currentFrameIdx = 0;
        let isPlaying = false;
        let playSpeedMultiplier = 1.0;
        let playbackTimer = null;

        function selectTab(tabId) {
            activeTabId = tabId;
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
            vscode.postMessage({ command: 'switchTab', tab: tabId });
        }

        function analyzeAgain() {
            vscode.postMessage({ command: 'analyzeAgain' });
        }

        function toggleAcademicMode() {
            const cb = document.getElementById('academicModeCheckbox');
            const enabled = cb ? cb.checked : !currentAcademicMode;
            currentAcademicMode = enabled;
            const tab = document.getElementById('academicNavTab');
            if (tab) tab.style.display = enabled ? 'block' : 'none';
            if (!enabled && activeTabId === 'academic') selectTab('overview');
            vscode.postMessage({ command: 'setAcademicMode', enabled });
        }

        function onBiasSliderChange(val) {
            const num = Number(val);
            const bias = num === 0 ? 'memory' : num === 1 ? 'balanced' : 'speed';
            currentOptimizationBias = bias;
            const lbl = document.getElementById('biasCurrentLabel');
            if (lbl) {
                lbl.innerText = bias === 'memory' ? 'Memory-First [O(1) Space]' : bias === 'balanced' ? 'Balanced Strategy' : 'Speed-First [O(1) Time]';
            }
            vscode.postMessage({ command: 'setOptimizationBias', bias });
        }

        function applyRefactor(varName, targetStructure) {
            vscode.postMessage({ command: 'applyRefactor', varName, targetStructure });
        }

        function openSmartDiff(varName, targetStructure) {
            vscode.postMessage({ command: 'openSmartDiff', varName, targetStructure });
        }

        function injectTemplate(paradigm) {
            vscode.postMessage({ command: 'injectTemplate', paradigm, bias: currentOptimizationBias });
        }

        function runBeforeAfterBenchmark(varName, fromDS, toDS) {
            const box = document.getElementById('beforeAfterResultBox');
            if (box) {
                box.style.display = 'block';
                box.innerHTML = '<div style="padding: 10px; color: var(--accent-cyan); text-align: center;">Compiling with -O2 & Benchmarking Before vs After...</div>';
            }
            vscode.postMessage({ command: 'runBeforeAfterBenchmark', varName, fromStructure: fromDS, toStructure: toDS });
        }

        function triggerBenchmarkSuite() {
            const s = document.getElementById('benchSuite').value;
            const d = document.getElementById('benchDist').value;
            vscode.postMessage({ command: 'runBenchmark', suite: s, distribution: d });
        }

        function loadSelectedTrace() {
            const mode = document.getElementById('vizPresetSelect').value;
            vscode.postMessage({ command: 'requestTrace', mode });
        }

        // Timeline Scrubber Controls
        function scrubToFrame(idx) {
            const frame = Math.max(0, Math.min(Number(idx), activeTraceSteps.length - 1));
            currentFrameIdx = frame;
            const scrubber = document.getElementById('vizTimelineScrubber');
            if (scrubber) scrubber.value = frame;
            renderCurrentFrame();
        }

        function timelineFirst() { scrubToFrame(0); }
        function timelinePrev() { if (currentFrameIdx > 0) scrubToFrame(currentFrameIdx - 1); }
        function timelineNext() { if (currentFrameIdx < activeTraceSteps.length - 1) scrubToFrame(currentFrameIdx + 1); else timelinePause(); }
        function timelineLast() { scrubToFrame(activeTraceSteps.length - 1); }

        function timelineTogglePlay() {
            if (isPlaying) timelinePause(); else timelinePlay();
        }

        function timelinePlay() {
            isPlaying = true;
            const btn = document.getElementById('vizPlayPauseBtn');
            if (btn) btn.innerText = '❚❚ Pause';
            if (playbackTimer) clearInterval(playbackTimer);
            const interval = Math.max(100, Math.round(700 / playSpeedMultiplier));
            playbackTimer = setInterval(() => {
                if (currentFrameIdx < activeTraceSteps.length - 1) {
                    scrubToFrame(currentFrameIdx + 1);
                } else {
                    timelinePause();
                }
            }, interval);
        }

        function timelinePause() {
            isPlaying = false;
            if (playbackTimer) { clearInterval(playbackTimer); playbackTimer = null; }
            const btn = document.getElementById('vizPlayPauseBtn');
            if (btn) btn.innerText = '▶ Play';
        }

        function setPlaybackSpeed(val) {
            playSpeedMultiplier = parseFloat(val) || 1.0;
            if (isPlaying) timelinePlay();
        }

        function renderCurrentFrame() {
            if (!activeTraceSteps || activeTraceSteps.length === 0) return;
            const step = activeTraceSteps[currentFrameIdx];
            document.getElementById('vizFrameCounter').innerText = 'Frame ' + (currentFrameIdx + 1) + ' of ' + activeTraceSteps.length;
            document.getElementById('vizStepTitle').innerText = step.description || '';
            document.getElementById('vizStepExplanation').innerText = step.explanation || '';

            const canvas = document.getElementById('vizCanvas');
            const customDom = document.getElementById('vizCustomDOM');
            customDom.innerHTML = '';
            const mode = document.getElementById('vizPresetSelect').value;

            if (mode === 'dp_table' && step.grid) {
                let html = '<div class="dp-table-container"><table class="dp-grid"><thead><tr><th>Item / Cap</th>';
                for (const col of step.colHeaders) html += '<th>' + col + '</th>';
                html += '</tr></thead><tbody>';
                for (let r = 0; r < step.grid.length; r++) {
                    html += '<tr><th>' + step.rowHeaders[r] + '</th>';
                    for (let c = 0; c < step.grid[r].length; c++) {
                        let cls = '';
                        if (step.activeCell && step.activeCell[0] === r && step.activeCell[1] === c) cls = 'active-cell';
                        else if (step.dependencyCells && step.dependencyCells.some(dc => dc[0] === r && dc[1] === c)) cls = 'dep-cell';
                        else if (step.solutionReconstruction && step.solutionReconstruction.some(sc => sc[0] === r && sc[1] === c)) cls = 'reconstructed-cell';
                        html += '<td class="' + cls + '">' + step.grid[r][c] + '</td>';
                    }
                    html += '</tr>';
                }
                html += '</tbody></table></div>';
                customDom.innerHTML = html;

                const ctx = canvas.getContext('2d');
                canvas.width = canvas.parentElement.clientWidth || 300;
                canvas.height = 50;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#a855f7';
                ctx.font = '10px monospace';
                ctx.fillText('Recurrence Transition:', 8, 16);
                ctx.fillStyle = '#38bdf8';
                ctx.font = '11px monospace';
                ctx.fillText(step.formulaApplied || 'dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt] + val)', 8, 34);
            } else if (mode === 'sorting_searching' && step.array) {
                const ctx = canvas.getContext('2d');
                canvas.width = canvas.parentElement.clientWidth || 300;
                canvas.height = 160;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const arr = step.array;
                const maxVal = Math.max(...arr, 1);
                const barWidth = (canvas.width - (arr.length + 1) * 4) / arr.length;
                for (let i = 0; i < arr.length; i++) {
                    const val = arr[i];
                    const barHeight = (val / maxVal) * (canvas.height - 30);
                    const x = 4 + i * (barWidth + 4);
                    const y = canvas.height - barHeight - 16;
                    let color = '#38bdf8';
                    if (step.pivotIndex === i) color = '#f97316';
                    else if (step.comparingIndices && step.comparingIndices.includes(i)) color = '#a855f7';
                    else if (step.swappedIndices && step.swappedIndices.includes(i)) color = '#ef4444';
                    else if (step.sortedIndices && step.sortedIndices.includes(i)) color = '#22c55e';
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barHeight, 3);
                    ctx.fill();
                    ctx.fillStyle = '#f1f5f9';
                    ctx.font = '9px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(val, x + barWidth / 2, y - 3);
                }
            } else if (mode === 'backtracking' && step.boardState) {
                let html = '<div style="display:flex; justify-content:center; margin:6px 0;"><div style="display:grid; grid-template-columns:repeat(' + step.boardState.length + ', 22px); border:1px solid var(--glass-border);">';
                for (let r = 0; r < step.boardState.length; r++) {
                    for (let c = 0; c < step.boardState.length; c++) {
                        const hasQueen = step.boardState[r] === c;
                        const bg = hasQueen ? '#a855f7' : (r + c) % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)';
                        html += '<div style="width:22px; height:22px; background:' + bg + '; display:flex; align-items:center; justify-content:center; font-size:12px;">' + (hasQueen ? '♛' : '') + '</div>';
                    }
                }
                html += '</div></div>';
                customDom.innerHTML = html;

                const ctx = canvas.getContext('2d');
                canvas.width = canvas.parentElement.clientWidth || 300;
                canvas.height = 40;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = step.isPruned ? '#ef4444' : step.isSolution ? '#22c55e' : '#38bdf8';
                ctx.font = '10px sans-serif';
                ctx.fillText(step.isPruned ? '❌ PRUNED: ' + (step.pruningReason || '') : step.isSolution ? '✓ VALID SOLUTION' : 'Evaluating Choice: ' + step.currentChoice, 8, 22);
            }
        }

        function assessNP() {
            const p = document.getElementById('npProblemSelect').value;
            const n = document.getElementById('npInputN').value;
            vscode.postMessage({ command: 'assessNPFeasibility', problemId: p, n });
        }

        function runNatureOpt(type) {
            vscode.postMessage({ command: 'runNatureOptimization', optType: type, seed: 42, iterations: 35, population: 25 });
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.type === 'traceResult') {
                activeTraceSteps = msg.payload || [];
                currentFrameIdx = 0;
                document.getElementById('vizDisplayContainer').style.display = 'block';
                const s = document.getElementById('vizTimelineScrubber');
                if (s) { s.max = Math.max(0, activeTraceSteps.length - 1); s.value = 0; }
                renderCurrentFrame();
            } else if (msg.type === 'beforeAfterResult') {
                const box = document.getElementById('beforeAfterResultBox');
                if (box) {
                    box.style.display = 'block';
                    box.innerHTML = '<div class="glass-card" style="border-left:3px solid var(--accent-green); margin:0;"><div style="display:flex; justify-content:space-between; margin-bottom:4px;"><strong style="color:var(--accent-green); font-size:0.75rem;">⚡ ' + msg.payload.summaryHeadline + '</strong><span class="badge recommendation">' + msg.payload.overallSpeedupMultiplier + 'x Speedup</span></div><p style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:6px;">' + msg.payload.detailedSummary + '</p><table class="dp-grid"><thead><tr><th>Size N</th><th>Original</th><th>Optimized</th><th>Speedup</th></tr></thead><tbody>' + msg.payload.dataPoints.map(p => '<tr><td><strong>' + p.inputSize + '</strong></td><td style="color:#fca5a5;">' + p.beforeTimeMs.toFixed(2) + ' ms</td><td style="color:var(--accent-green); font-weight:bold;">' + p.afterTimeMs.toFixed(2) + ' ms</td><td>' + p.speedupMultiplier + 'x</td></tr>').join('') + '</tbody></table></div>';
                }
            } else if (msg.type === 'benchmarkResult') {
                const c = document.getElementById('benchmarkResultContainer');
                if (c) {
                    c.style.display = 'block';
                    document.getElementById('benchTitle').innerText = msg.payload.suiteName + ' (' + msg.payload.distribution + ')';
                    document.getElementById('benchmarkSummary').innerText = msg.payload.analysisSummary;
                    let html = '<table class="dp-grid"><thead><tr><th>Size N</th>' + msg.payload.series.map(s => '<th>' + s.algorithmName + '</th>').join('') + '</tr></thead><tbody>';
                    msg.payload.inputSizes.forEach((n, i) => {
                        html += '<tr><td><strong>' + n + '</strong></td>' + msg.payload.series.map(s => '<td>' + (s.dataPoints[i] ? s.dataPoints[i].measuredTimeMs + ' ms' : '-') + '</td>').join('') + '</tr>';
                    });
                    html += '</tbody></table>';
                    document.getElementById('benchmarkTableContainer').innerHTML = html;
                }
            } else if (msg.type === 'npFeasibilityResult') {
                const r = document.getElementById('npAssessmentResult');
                if (r) {
                    r.style.display = 'block';
                    document.getElementById('npResultTitle').innerText = msg.payload.problemName + ' (N = ' + msg.payload.inputSizeN + ')';
                    document.getElementById('npOps').innerText = msg.payload.estimatedOperationsExact;
                    document.getElementById('npTime').innerText = msg.payload.estimatedExecutionTimeExact;
                    document.getElementById('npRec').innerText = msg.payload.recommendedApproach;
                    document.getElementById('npSpecific').innerText = msg.payload.specificRecommendation;
                    document.getElementById('npTradeoff').innerText = msg.payload.tradeoffSummary;
                    const b = document.getElementById('npTierBadge');
                    b.innerText = msg.payload.feasibilityTier;
                    b.className = 'badge ' + (msg.payload.feasibilityTier.includes('Feasible') ? 'conf-strong' : 'conf-low');
                }
            } else if (msg.type === 'natureResult') {
                const b = document.getElementById('natureResultBox');
                if (b) {
                    b.style.display = 'block';
                    document.getElementById('natureWinnerBadge').innerText = 'Winner: ' + msg.payload.winner;
                    document.getElementById('natureSummaryText').innerText = msg.payload.summary;
                }
            }
        });
    </script>
</body>
</html>`;
    }
}
