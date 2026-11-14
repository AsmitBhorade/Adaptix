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
    private _activeTab: string = 'intelligence';
    private _academicMode: boolean = false;
    private _optimizationBias: 'memory' | 'balanced' | 'speed' = 'speed';

    constructor(private readonly _extensionUri: vscode.Uri) {
        // Read initial configuration
        const config = vscode.workspace.getConfiguration('adaptix');
        this._academicMode = config.get<boolean>('academicMode', false);
        this._optimizationBias = config.get<'memory' | 'balanced' | 'speed'>('optimizationBias', 'speed');
    }

    public setAcademicMode(enabled: boolean): void {
        this._academicMode = enabled;
        if (this._view) {
            this._view.webview.postMessage({ type: 'stateUpdate', academicMode: enabled });
            this._view.webview.html = this._getHtmlForWebview(this._latestData, this._history, this._latestReport);
        }
    }

    public setOptimizationBias(bias: 'memory' | 'balanced' | 'speed'): void {
        this._optimizationBias = bias;
        if (this._view) {
            this._view.webview.postMessage({ type: 'stateUpdate', optimizationBias: bias });
            this._view.webview.html = this._getHtmlForWebview(this._latestData, this._history, this._latestReport);
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
                        vscode.window.showErrorMessage(`Adaptix Edge-Case Runner Error: ${err.message}`);
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
                    this.update(this._latestData, this._history, this._latestReport);
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

        this.update(this._latestData, this._history, this._latestReport);
    }

    public update(
        analysisData: Map<string, AnalysisContext>,
        history: AdaptationRecord[] = this._history,
        unifiedReport?: UnifiedAnalysisReport
    ) {
        this._latestData = analysisData;
        this._history = history;
        if (unifiedReport) {
            this._latestReport = unifiedReport;
        }
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(analysisData, history, this._latestReport);
        }
    }

    public setActiveTab(tab: string) {
        this._activeTab = tab;
        if (this._view) {
            this._view.webview.postMessage({ type: 'setActiveTab', tab });
        }
    }

    private _getHtmlForWebview(
        data: Map<string, AnalysisContext>,
        history: AdaptationRecord[],
        report?: UnifiedAnalysisReport
    ): string {
        let cardsHtml = '';

        data.forEach((ctx, varName) => {
            if (!ctx.decision) return;

            const isOptimizable = ctx.decision.suggestedStructure && ctx.decision.suggestedStructure !== ctx.monitor.currentStructure;
            const maxRatio = Math.max(ctx.monitor.insertRatio, ctx.monitor.searchRatio, ctx.monitor.deleteRatio);
            const isDomInsert = ctx.monitor.insertRatio === maxRatio;
            const isDomSearch = ctx.monitor.searchRatio === maxRatio;
            const isDomDelete = ctx.monitor.deleteRatio === maxRatio;

            const confClass = ctx.decision.confidenceLabel === 'Strong' ? 'conf-strong' :
                              ctx.decision.confidenceLabel === 'Moderate' ? 'conf-moderate' : 'conf-low';

            const twoSentence = ctx.decision.twoSentenceSummary || 
                `${varName} (${ctx.monitor.currentStructure.replace('std::', '')}) exhibits high operation overhead. Switching to ${ctx.decision.suggestedStructure?.replace('std::', '') || 'optimal container'} improves complexity.`;

            const deepExplain = ctx.decision.deepExplanation || ctx.decision.explanation?.primaryReason || 'Detailed theoretical analysis and Master Theorem derivation available in Academic Mode.';

            cardsHtml += `
            <div class="glass-card">
                <div class="card-header">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">${varName}</span>
                        <span class="badge current">${ctx.monitor.currentStructure.replace('std::', '')}</span>
                    </div>
                    <span style="font-size: 0.65rem; color: var(--text-muted);">${ctx.monitor.totalOperations} ops</span>
                </div>

                <!-- Ratios Bar -->
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
                        <span class="badge recommendation">⚡ Target: ${ctx.decision.suggestedStructure?.replace('std::', '')}</span>
                        <span class="badge ${confClass}">${ctx.decision.confidenceLabel} (${ctx.decision.speedup || 'Faster'})</span>
                    </div>

                    <!-- Two-Sentence Rule Box -->
                    <div class="two-sentence-box">
                        <p class="two-sentence-text">${escapeHtml(twoSentence)}</p>
                    </div>

                    <!-- Expandable Theoretical Accordion -->
                    <details class="explain-accordion" ${this._academicMode ? 'open' : ''}>
                        <summary>Read More / Explain the Math</summary>
                        <div class="accordion-body">
                            <pre style="white-space: pre-wrap; font-family: var(--font-sans); font-size: 0.7rem; color: var(--text-secondary);">${escapeHtml(deepExplain)}</pre>
                            ${ctx.decision.explanation?.tradeoffs && ctx.decision.explanation.tradeoffs.length > 0 ? `
                                <div style="margin-top: 6px;">
                                    <strong style="color: var(--accent-orange); font-size: 0.68rem;">Trade-offs:</strong>
                                    <ul style="margin: 2px 0 0 16px; font-size: 0.65rem;">
                                        ${ctx.decision.explanation.tradeoffs.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    </details>

                    <div style="display: flex; gap: 6px; margin-top: 8px;">
                        <button class="btn-action" style="flex: 1;" onclick="applyRefactor('${varName}', '${ctx.decision.suggestedStructure}')">
                            Apply
                        </button>
                        <button class="btn-action success" style="flex: 1;" onclick="openSmartDiff('${varName}', '${ctx.decision.suggestedStructure}')">
                            Smart Diff
                        </button>
                    </div>
                </div>
                ` : `
                <div style="margin-top: 6px; font-size: 0.72rem; color: var(--accent-green);">
                    ✓ Optimal structure usage detected for observed access pattern.
                </div>
                `}
            </div>`;
        });

        if (cardsHtml === '') {
            cardsHtml = `
            <div class="glass-card" style="text-align: center; padding: 20px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Listening for C++ Code...</p>
                <p style="font-size: 0.72rem; color: var(--text-secondary);">Declare containers or recursive functions in your C++ file to activate live intelligence.</p>
            </div>`;
        }

        const activeTab = this._activeTab || 'intelligence';
        const biasVal = this._optimizationBias === 'memory' ? '0' : this._optimizationBias === 'balanced' ? '1' : '2';
        const biasText = this._optimizationBias === 'memory' ? 'Memory-First [O(1) Space]' :
                         this._optimizationBias === 'balanced' ? 'Balanced Tradeoff' : 'Speed-First [O(1) Time]';

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
        .brand-title { display: flex; align-items: center; gap: 8px; }
        .brand-logo-text { font-weight: 800; font-size: 1rem; letter-spacing: 1.5px; color: var(--accent-cyan); }
        .brand-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 12px; background: rgba(56, 189, 248, 0.2); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.35); font-weight: 700; }
        
        .academic-toggle-container { display: flex; align-items: center; gap: 6px; font-size: 0.68rem; color: var(--text-secondary); cursor: pointer; }
        .switch { position: relative; display: inline-block; width: 32px; height: 16px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.15); transition: .3s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 10px; width: 10px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--accent-purple); }
        input:checked + .slider:before { transform: translateX(16px); }

        .nav-tabs { display: flex; gap: 4px; margin-bottom: 10px; border-bottom: 1px solid var(--glass-border); padding-bottom: 6px; }
        .nav-tab { flex: 1; text-align: center; padding: 6px 8px; background: rgba(255, 255, 255, 0.03); color: var(--text-secondary); border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 0.72rem; font-weight: 600; transition: all 0.15s ease; white-space: nowrap; }
        .nav-tab:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.07); }
        .nav-tab.active { color: var(--accent-cyan); background: rgba(56, 189, 248, 0.14); border-color: rgba(56, 189, 248, 0.35); }
        .nav-tab.academic-tab { color: var(--accent-purple); }
        .nav-tab.academic-tab.active { background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.4); }

        .tab-panel { display: none; }
        .tab-panel.active { display: block; }

        .glass-card { background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; backdrop-filter: blur(10px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .card-title { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }

        .badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; }
        .badge.current { background: rgba(255, 255, 255, 0.1); color: var(--text-primary); }
        .badge.recommendation { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); border: 1px solid rgba(34, 197, 94, 0.35); }
        .badge.conf-strong { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); }
        .badge.conf-moderate { background: rgba(250, 204, 21, 0.15); color: #facc15; }
        .badge.conf-low { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); }
        .badge.academic { background: rgba(168, 85, 247, 0.2); color: var(--accent-purple); }

        .bias-slider-container { background: rgba(0, 0, 0, 0.25); border: 1px solid var(--glass-border); border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; }
        .bias-range-input { width: 100%; -webkit-appearance: none; height: 5px; border-radius: 3px; background: linear-gradient(to right, #3b82f6, #a855f7, #22c55e); outline: none; margin: 6px 0; }
        .bias-range-input::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #ffffff; cursor: pointer; border: 2px solid var(--accent-cyan); }
        .bias-labels { display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-secondary); }

        .two-sentence-box { background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--accent-cyan); padding: 8px 10px; border-radius: 4px; margin: 6px 0; }
        .two-sentence-text { font-size: 0.74rem; color: var(--text-primary); line-height: 1.4; }

        details.explain-accordion { margin-top: 6px; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--glass-border); border-radius: 6px; }
        details.explain-accordion summary { padding: 6px 8px; font-size: 0.68rem; font-weight: 600; color: var(--accent-cyan); cursor: pointer; user-select: none; }
        .accordion-body { padding: 8px; font-size: 0.7rem; color: var(--text-secondary); border-top: 1px solid var(--glass-border); }

        .timeline-range { width: 100%; -webkit-appearance: none; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.1); outline: none; cursor: pointer; }
        .timeline-range::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--accent-cyan); cursor: pointer; }
        .timeline-controls { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 4px; }
        .btn-icon { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; }
        .btn-icon:hover { background: rgba(255, 255, 255, 0.12); color: var(--accent-cyan); }
        .speed-select { background: rgba(0, 0, 0, 0.3); border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 4px 6px; border-radius: 4px; font-size: 0.68rem; outline: none; }

        .btn-action { background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 5px; padding: 6px 10px; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-action:hover { background: rgba(56, 189, 248, 0.25); }
        .btn-action.success { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); border-color: rgba(34, 197, 94, 0.35); }
        .btn-action.purple { background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); border-color: rgba(168, 85, 247, 0.35); }

        .progress-bar-container { height: 5px; background: rgba(255, 255, 255, 0.06); border-radius: 3px; display: flex; overflow: hidden; margin: 6px 0; }
        .progress-segment.insert { background: #3b82f6; }
        .progress-segment.search { background: #22c55e; }
        .progress-segment.delete { background: #ef4444; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-secondary); }

        .dp-table-container { overflow-x: auto; margin: 8px 0; max-height: 200px; border: 1px solid var(--glass-border); border-radius: 6px; }
        .dp-grid { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.68rem; text-align: center; }
        .dp-grid th, .dp-grid td { border: 1px solid var(--glass-border); padding: 4px 6px; }
        .dp-grid th { background: rgba(255, 255, 255, 0.05); color: var(--accent-cyan); }
        .dp-grid td.active-cell { background: rgba(56, 189, 248, 0.3); color: #fff; font-weight: bold; }
        .dp-grid td.dep-cell { background: rgba(168, 85, 247, 0.25); color: #e9d5ff; }
        .dp-grid td.reconstructed-cell { background: rgba(34, 197, 94, 0.3); color: var(--accent-green); font-weight: bold; }

        .chart-box { width: 100%; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--glass-border); border-radius: 6px; margin: 6px 0; }
        pre.code-snippet { font-family: var(--font-mono); font-size: 0.68rem; background: rgba(0, 0, 0, 0.45); border: 1px solid var(--glass-border); border-radius: 6px; padding: 6px 8px; overflow-x: auto; color: #e2e8f0; }
    </style>
</head>
<body>
    <!-- Top Header -->
    <div class="brand-header">
        <div class="brand-title">
            <span class="brand-logo-text">ADAPTIX</span>
            <span class="brand-badge">3.0 PRO</span>
        </div>
        <div class="header-controls">
            <label class="academic-toggle-container">
                <span>Academic Mode</span>
                <div class="switch">
                    <input type="checkbox" id="academicModeCheckbox" ${this._academicMode ? 'checked' : ''} onchange="toggleAcademicMode()">
                    <span class="slider"></span>
                </div>
            </label>
        </div>
    </div>

    <!-- 3-Pillar Navigation Tabs -->
    <div class="nav-tabs">
        <button class="nav-tab ${activeTab === 'intelligence' ? 'active' : ''}" data-tab="intelligence" onclick="selectTab('intelligence')">
            🧠 Intelligence
        </button>
        <button class="nav-tab ${activeTab === 'performance' ? 'active' : ''}" data-tab="performance" onclick="selectTab('performance')">
            ⚡ Performance
        </button>
        <button class="nav-tab ${activeTab === 'visualizer' ? 'active' : ''}" data-tab="visualizer" onclick="selectTab('visualizer')">
            🔬 Visualizer
        </button>
        <button id="academicNavTab" class="nav-tab academic-tab ${activeTab === 'academic' ? 'active' : ''}" data-tab="academic" style="display: ${this._academicMode ? 'block' : 'none'};" onclick="selectTab('academic')">
            🎓 Academic Lab
        </button>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- TAB 1: CODE INTELLIGENCE -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-intelligence" class="tab-panel ${activeTab === 'intelligence' ? 'active' : ''}">
        <div class="glass-card">
            <div class="card-header">
                <span class="card-title">Live Analysis Status</span>
                <span class="badge conf-strong">Active</span>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 6px;">
                ${report?.executiveSummary.bottleneckHeadline || 'Keystroke AST listener actively inspecting active C++ editor.'}
            </p>
        </div>

        <!-- Rendered Container Cards -->
        <div id="containerCardsContainer">
            ${cardsHtml}
        </div>

        <!-- Edge-Case Counterexample Display Box -->
        <div id="edgeCaseResultBox" style="display: none; margin-bottom: 10px;"></div>

        <!-- Quick Actions Card -->
        <div class="glass-card">
            <span class="card-title" style="display: block; margin-bottom: 6px;">Automated Algorithmic Actions</span>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button class="btn-action" onclick="injectTemplate('dynamic_programming_tab')">Inject DP Skeleton</button>
                <button class="btn-action" onclick="injectTemplate('two_pointers')">Two-Pointers</button>
                <button class="btn-action purple" onclick="runEdgeCaseTest('coin_change')">Run Counterexample</button>
                <button class="btn-action success" onclick="runBeforeAfterBenchmark('arr', 'std::vector', 'std::unordered_set')">Benchmark Refactor</button>
            </div>
        </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- TAB 2: PERFORMANCE LAB -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-performance" class="tab-panel ${activeTab === 'performance' ? 'active' : ''}">
        <!-- Space vs Time Slider -->
        <div class="bias-slider-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.72rem;">
                <strong>Space vs. Time Bias:</strong>
                <span id="biasCurrentLabel" style="color: var(--accent-cyan); font-weight: 700;">${biasText}</span>
            </div>
            <input type="range" id="biasRangeInput" class="bias-range-input" min="0" max="2" step="1" value="${biasVal}" oninput="onBiasSliderChange(this.value)">
            <div class="bias-labels">
                <span>Memory-First [O(1)]</span>
                <span>Balanced</span>
                <span>Speed-First [O(1) Time]</span>
            </div>
        </div>

        <!-- Before/After Benchmark Container -->
        <div id="beforeAfterResultBox" style="display: none; margin-bottom: 10px;"></div>

        <!-- Benchmark Runner -->
        <div class="glass-card">
            <span class="card-title" style="display: block; margin-bottom: 4px;">Empirical Benchmark Runner</span>
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
            <button class="btn-action" style="width: 100%;" onclick="triggerBenchmarkSuite()">Run Controlled Benchmark</button>
        </div>

        <div id="benchmarkResultContainer" style="display: none;" class="glass-card">
            <div class="card-header">
                <span id="benchTitle" class="card-title" style="color: var(--accent-cyan);">Benchmark Results</span>
            </div>
            <div id="benchmarkSummary" style="font-size: 0.7rem; color: var(--text-primary); margin-bottom: 6px; background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px;"></div>
            <div id="benchmarkTableContainer" class="dp-table-container"></div>
        </div>

        <!-- History & Reports Drawer -->
        <details class="explain-accordion" style="margin-top: 8px;">
            <summary>📜 Session Adaptation History & Reports</summary>
            <div class="accordion-body">
                ${history.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.7rem;">No refactorings recorded yet.</p>' : 
                    history.map(h => `<div style="padding: 4px 0; border-bottom: 1px solid var(--glass-border); font-size: 0.68rem;">
                        <strong>${h.from} → ${h.to}</strong>: ${h.reason} (${h.time})
                    </div>`).join('')
                }
            </div>
        </details>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- TAB 3: VISUAL DEBUGGER WITH TIMELINE SCRUBBER -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-visualizer" class="tab-panel ${activeTab === 'visualizer' ? 'active' : ''}">
        <div class="glass-card">
            <div class="card-header">
                <span class="card-title">Timeline Algorithm Scrubber</span>
                <span id="vizFrameCounter" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-cyan);">Frame 0 of 0</span>
            </div>

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

            <!-- Scrubber Range Slider -->
            <input type="range" id="vizTimelineScrubber" class="timeline-range" min="0" max="0" value="0" oninput="scrubToFrame(this.value)">

            <!-- Scrubber Controls -->
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
            <div id="vizStepTitle" style="font-weight: 700; color: var(--accent-cyan); font-size: 0.78rem; margin-bottom: 4px;"></div>
            <div id="vizStepExplanation" style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 6px;"></div>
            <div class="chart-box" style="height: 200px;">
                <canvas id="vizCanvas"></canvas>
            </div>
            <div id="vizCustomDOM"></div>
        </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- TAB 4: ACADEMIC LAB -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div id="tab-academic" class="tab-panel ${activeTab === 'academic' ? 'active' : ''}">
        <div class="glass-card" style="border-left: 3px solid var(--accent-purple);">
            <div class="card-header">
                <span class="card-title" style="color: var(--accent-purple);">Academic Mode (DAA Semester 5)</span>
                <span class="badge academic">Active</span>
            </div>
            <p style="font-size: 0.7rem; color: var(--text-secondary);">NP-Completeness feasibility estimator & Nature-inspired metaheuristic optimizers.</p>
        </div>

        <!-- NP Advisor -->
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

        <!-- Nature Lab -->
        <div class="glass-card">
            <span class="card-title" style="display: block; margin-bottom: 6px;">Nature-Inspired Optimization Lab</span>
            <div style="display: flex; gap: 4px;">
                <button class="btn-action purple" style="flex: 1;" onclick="runNatureOpt('compare_tsp')">ACO vs GA (TSP)</button>
                <button class="btn-action purple" style="flex: 1;" onclick="runNatureOpt('compare_continuous')">PSO vs GA (Math)</button>
            </div>
        </div>

        <div id="natureResultBox" style="display: none;" class="glass-card">
            <div class="card-header">
                <span id="natureResultTitle" class="card-title">Convergence Comparison</span>
                <span id="natureWinnerBadge" class="badge recommendation"></span>
            </div>
            <div class="chart-box" style="height: 180px;">
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

        function toggleAcademicMode() {
            const cb = document.getElementById('academicModeCheckbox');
            const enabled = cb ? cb.checked : !currentAcademicMode;
            currentAcademicMode = enabled;
            const tab = document.getElementById('academicNavTab');
            if (tab) tab.style.display = enabled ? 'block' : 'none';
            if (!enabled && activeTabId === 'academic') selectTab('intelligence');
            vscode.postMessage({ command: 'setAcademicMode', enabled });
        }

        function onBiasSliderChange(val) {
            const num = Number(val);
            const bias = num === 0 ? 'memory' : num === 1 ? 'balanced' : 'speed';
            currentOptimizationBias = bias;
            const lbl = document.getElementById('biasCurrentLabel');
            if (lbl) {
                lbl.innerText = bias === 'memory' ? 'Memory-First [O(1) Space]' : bias === 'balanced' ? 'Balanced Tradeoff' : 'Speed-First [O(1) Time]';
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

        function runEdgeCaseTest(paradigm) {
            const box = document.getElementById('edgeCaseResultBox');
            if (box) {
                box.style.display = 'block';
                box.innerHTML = '<div style="padding: 10px; color: var(--accent-cyan); text-align: center;">Executing C++ Counterexample Test...</div>';
            }
            vscode.postMessage({ command: 'runEdgeCaseTest', paradigm });
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
                canvas.height = 60;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#a855f7';
                ctx.font = '10px monospace';
                ctx.fillText('Recurrence Transition:', 8, 18);
                ctx.fillStyle = '#38bdf8';
                ctx.font = '11px monospace';
                ctx.fillText(step.formulaApplied || 'dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt] + val)', 8, 38);
            } else if (mode === 'sorting_searching' && step.array) {
                const ctx = canvas.getContext('2d');
                canvas.width = canvas.parentElement.clientWidth || 300;
                canvas.height = 180;
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
                let html = '<div style="display:flex; justify-content:center; margin:6px 0;"><div style="display:grid; grid-template-columns:repeat(' + step.boardState.length + ', 24px); border:1px solid var(--glass-border);">';
                for (let r = 0; r < step.boardState.length; r++) {
                    for (let c = 0; c < step.boardState.length; c++) {
                        const hasQueen = step.boardState[r] === c;
                        const bg = hasQueen ? '#a855f7' : (r + c) % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)';
                        html += '<div style="width:24px; height:24px; background:' + bg + '; display:flex; align-items:center; justify-content:center; font-size:14px;">' + (hasQueen ? '♛' : '') + '</div>';
                    }
                }
                html += '</div></div>';
                customDom.innerHTML = html;

                const ctx = canvas.getContext('2d');
                canvas.width = canvas.parentElement.clientWidth || 300;
                canvas.height = 50;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = step.isPruned ? '#ef4444' : step.isSolution ? '#22c55e' : '#38bdf8';
                ctx.font = '10px sans-serif';
                ctx.fillText(step.isPruned ? '❌ PRUNED: ' + (step.pruningReason || '') : step.isSolution ? '✓ VALID SOLUTION' : 'Evaluating Choice: ' + step.currentChoice, 8, 25);
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
            } else if (msg.type === 'edgeCaseResult') {
                const box = document.getElementById('edgeCaseResultBox');
                if (box) {
                    box.style.display = 'block';
                    box.innerHTML = '<div class="glass-card" style="border-left:3px solid #ef4444; margin:0;"><div style="display:flex; justify-content:space-between; margin-bottom:4px;"><strong style="color:#ef4444; font-size:0.75rem;">🚨 Counterexample Confirmed</strong><span class="badge conf-low">' + msg.payload.fragilityType.toUpperCase() + '</span></div><p style="font-size:0.7rem; color:var(--text-primary); margin-bottom:6px;">' + msg.payload.explanation + '</p><div style="background:rgba(0,0,0,0.3); padding:6px; border-radius:4px; font-family:var(--font-mono); font-size:0.65rem;"><div>Input: <strong style="color:var(--accent-orange);">' + msg.payload.failingInput + '</strong></div><div>Naive Output: <strong style="color:#ef4444;">' + msg.payload.actualNaiveOutput + '</strong></div><div>Optimal DP: <strong style="color:var(--accent-green);">' + msg.payload.expectedOptimalOutput + '</strong></div></div></div>';
                }
            } else if (msg.type === 'beforeAfterResult') {
                const box = document.getElementById('beforeAfterResultBox');
                if (box) {
                    box.style.display = 'block';
                    box.innerHTML = '<div class="glass-card" style="border-left:3px solid var(--accent-green); margin:0;"><div style="display:flex; justify-content:space-between; margin-bottom:4px;"><strong style="color:var(--accent-green); font-size:0.75rem;">⚡ ' + msg.payload.summaryHeadline + '</strong><span class="badge recommendation">' + msg.payload.overallSpeedupMultiplier + 'x Speedup</span></div><p style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:6px;">' + msg.payload.detailedSummary + '</p><table class="dp-grid"><thead><tr><th>Size N</th><th>Original</th><th>Optimized</th><th>Speedup</th></tr></thead><tbody>' + msg.payload.dataPoints.map(p => '<tr><td><strong>' + p.inputSize + '</strong></td><td style="color:#ef4444;">' + p.beforeTimeMs.toFixed(2) + ' ms</td><td style="color:var(--accent-green); font-weight:bold;">' + p.afterTimeMs.toFixed(2) + ' ms</td><td>' + p.speedupMultiplier + 'x</td></tr>').join('') + '</tbody></table></div>';
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
