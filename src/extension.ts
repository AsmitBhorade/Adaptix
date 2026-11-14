import * as vscode from 'vscode';
import { Analyzer, AnalysisContext, ChangedRange } from './analyzer';
import { SuggestionEngine } from './suggestion';
import { AdaptixViewProvider, AdaptationRecord } from './ui';
import { LearningLayer } from './learning';
import { planRefactor } from './refactorPlanner';
import { logDebug, logWarn } from './logger';
import { classifyRefactor, shouldUseAI } from './refactorType';
import { generateSemanticRefactor } from './services/aiService';
import { validateRefactor } from './validator';
import { UnifiedPipeline } from './pipeline/unifiedPipeline';
import { AdaptixDiffContentProvider } from './providers/diffContentProvider';
import { AdaptixHoverProvider } from './providers/hoverProvider';
import { AdaptixCodeLensProvider } from './providers/codeLensProvider';
import { TemplateInjector, TemplateParadigm } from './refactoring/templateInjector';
import { EdgeCaseRunner } from './validation/edgeCaseRunner';
import { BeforeAfterRunner } from './benchmark/beforeAfterRunner';
import { CppAstParser } from './analysis/astParser';

export function activate(context: vscode.ExtensionContext) {
    console.log('ADAPTIX 3.0 Engine Active!');

    const learningLayer = new LearningLayer(context);
    const analyzer = new Analyzer(learningLayer);
    const unifiedPipeline = new UnifiedPipeline(analyzer);
    const suggestionEngine = new SuggestionEngine();

    // Configuration
    const config = vscode.workspace.getConfiguration('adaptix');
    let currentAcademicMode = config.get<boolean>('academicMode', false);
    let currentOptimizationBias = config.get<'memory' | 'balanced' | 'speed'>('optimizationBias', 'speed');
    analyzer.setGlobalProfile(currentOptimizationBias);

    // Webview Provider
    const provider = new AdaptixViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AdaptixViewProvider.viewType, provider)
    );

    // Diff Content Provider for Native Semantic Smart Diff (adaptix-diff://)
    const diffProvider = AdaptixDiffContentProvider.getInstance();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(AdaptixDiffContentProvider.scheme, diffProvider)
    );

    // Analysis State
    let currentAnalysis: Map<string, AnalysisContext> = new Map();
    let globalHistory: AdaptationRecord[] = [];

    // Hover Provider
    const hoverProvider = new AdaptixHoverProvider(() => currentAnalysis);
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(['cpp', 'c'], hoverProvider)
    );

    // CodeLens Provider
    const codeLensProvider = new AdaptixCodeLensProvider(
        () => currentAnalysis,
        () => currentOptimizationBias
    );
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(['cpp', 'c'], codeLensProvider)
    );

    const triggerUpdate = (document: vscode.TextDocument) => {
        if (document.languageId !== 'cpp' && document.languageId !== 'c') {
            return;
        }
        const text = document.getText();
        currentAnalysis = analyzer.analyze(text);
        const unifiedReport = unifiedPipeline.analyze(text);
        suggestionEngine.updateDiagnostics(document, currentAnalysis);

        provider.update(currentAnalysis, globalHistory, unifiedReport);
        codeLensProvider.refresh();
    };

    // Initial Trigger
    if (vscode.window.activeTextEditor) {
        triggerUpdate(vscode.window.activeTextEditor.document);
    }

    // React to Settings Changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('adaptix.academicMode')) {
                const newMode = vscode.workspace.getConfiguration('adaptix').get<boolean>('academicMode', false);
                currentAcademicMode = newMode;
                provider.setAcademicMode(newMode);
            }
            if (event.affectsConfiguration('adaptix.optimizationBias')) {
                const newBias = vscode.workspace.getConfiguration('adaptix').get<'memory' | 'balanced' | 'speed'>('optimizationBias', 'speed');
                currentOptimizationBias = newBias;
                analyzer.setGlobalProfile(newBias);
                provider.setOptimizationBias(newBias);
                if (vscode.window.activeTextEditor) {
                    triggerUpdate(vscode.window.activeTextEditor.document);
                }
            }
        })
    );

    // ─────────────── COMMANDS ───────────────

    // Show Insights / Dashboard
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.showInsights', () => {
            vscode.commands.executeCommand('adaptix.insightsView.focus');
        })
    );

    // Toggle Academic Mode
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.toggleAcademicMode', async () => {
            currentAcademicMode = !currentAcademicMode;
            await vscode.workspace.getConfiguration('adaptix').update('academicMode', currentAcademicMode, vscode.ConfigurationTarget.Global);
            provider.setAcademicMode(currentAcademicMode);
            vscode.window.showInformationMessage(`Adaptix 3.0: Academic Mode ${currentAcademicMode ? 'ENABLED (DAA / NP / Nature Labs Active)' : 'DISABLED (Clean Production Mode)'}`);
        })
    );

    // Set Optimization Bias
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.setOptimizationBias', async (bias: 'memory' | 'balanced' | 'speed') => {
            currentOptimizationBias = bias;
            analyzer.setGlobalProfile(bias);
            provider.setOptimizationBias(bias);
            if (vscode.window.activeTextEditor) {
                triggerUpdate(vscode.window.activeTextEditor.document);
            }
        })
    );

    // Inject Algorithmic Skeleton Template
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.injectTemplate', async (paradigmArg?: string, functionNodeArg?: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Adaptix: Open a C++ file to inject templates.');
                return;
            }

            let paradigm: TemplateParadigm = (paradigmArg as TemplateParadigm) || 'dynamic_programming_tab';
            if (!paradigmArg) {
                const pick = await vscode.window.showQuickPick([
                    { label: 'Dynamic Programming (Tabulation)', value: 'dynamic_programming_tab' },
                    { label: 'Dynamic Programming (Memoization)', value: 'dynamic_programming_memo' },
                    { label: 'Divide and Conquer', value: 'divide_and_conquer' },
                    { label: 'Two Pointers (In-Place)', value: 'two_pointers' },
                    { label: 'Sliding Window', value: 'sliding_window' },
                    { label: 'Binary Search on Answer Space', value: 'binary_search_answer' },
                    { label: 'Backtracking with Constraint Pruning', value: 'backtracking_pruning' }
                ], { placeHolder: 'Select Algorithmic Paradigm to Inject' });

                if (!pick) return;
                paradigm = pick.value as TemplateParadigm;
            }

            const templateCode = TemplateInjector.generateTemplate({
                paradigm,
                optimizationBias: currentOptimizationBias,
                functionNode: functionNodeArg
            });

            const action = await vscode.window.showInformationMessage(
                `Adaptix: Generated ${paradigm} skeleton. Choose insertion mode:`,
                'Inject into Editor',
                'Preview in Smart Diff',
                'Cancel'
            );

            if (action === 'Inject into Editor') {
                await TemplateInjector.injectIntoEditor(editor, templateCode, functionNodeArg);
            } else if (action === 'Preview in Smart Diff') {
                await TemplateInjector.previewInSmartDiff(editor, templateCode, functionNodeArg);
            }
        })
    );

    // Native Semantic Smart Diff
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.openSmartDiff', async (varName?: string, targetStructure?: string, _functionNode?: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Adaptix: Open a C++ file to preview Smart Diff.');
                return;
            }

            const docText = editor.document.getText();
            const targetDS = targetStructure || 'std::unordered_set';
            const targetVar = varName || 'arr';
            const analysisCtx = currentAnalysis.get(targetVar);

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Adaptix: Preparing Smart Diff for ${targetVar} → ${targetDS}...`,
                cancellable: false
            }, async () => {
                const aiResult = await generateSemanticRefactor({
                    code: docText,
                    context: analysisCtx ? analysisCtx.context : { hasOrdering: false, usesIndexAccess: false, sequentialIteration: true, needsSequenceEfficiency: false },
                    currentDS: analysisCtx ? analysisCtx.monitor.currentStructure : 'std::vector',
                    targetDS: targetDS,
                    optimizationBias: currentOptimizationBias,
                    academicMode: currentAcademicMode
                });

                const proposedCode = aiResult ? aiResult.new_code : docText;
                const virtualUri = await diffProvider.openDiff(
                    editor.document.uri,
                    proposedCode,
                    `Adaptix Smart Diff: ${targetVar} → ${targetDS.replace('std::', '')}`
                );

                const choice = await vscode.window.showInformationMessage(
                    `Smart Diff active for ${targetVar}. Accept changes?`,
                    'Accept Refactor',
                    'Discard'
                );

                if (choice === 'Accept Refactor') {
                    await diffProvider.acceptRefactor(virtualUri);
                    triggerUpdate(editor.document);
                }
            });
        })
    );

    // Automated Edge-Case & Counterexample Runner
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.runEdgeCaseTest', async (_paradigm?: string) => {
            const editor = vscode.window.activeTextEditor;
            const code = editor ? editor.document.getText() : '';

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Adaptix: Generating and executing C++ counterexample harness...',
                cancellable: false
            }, async () => {
                const report = await EdgeCaseRunner.runCounterexampleTest(code);
                vscode.commands.executeCommand('adaptix.insightsView.focus');
                provider.setActiveTab('intelligence');

                vscode.window.showWarningMessage(
                    `🚨 Counterexample Confirmed: ${report.testName}\nInput: ${report.failingInput}\nNaive Output: ${report.actualNaiveOutput}\nOptimal DP: ${report.expectedOptimalOutput}`,
                    'View in Dashboard'
                );
            });
        })
    );

    // Closed-Loop Before/After Benchmarking
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.runBeforeAfterBenchmark', async (varName?: string, fromDS?: string, toDS?: string) => {
            const editor = vscode.window.activeTextEditor;
            const code = editor ? editor.document.getText() : '';

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Adaptix: Compiling with -O2 & Benchmarking Before vs After...',
                cancellable: false
            }, async () => {
                const result = await BeforeAfterRunner.runBenchmark(code, code, {
                    varName: varName || 'arr',
                    fromStructure: fromDS || 'std::vector',
                    toStructure: toDS || 'std::unordered_set'
                });

                vscode.commands.executeCommand('adaptix.insightsView.focus');
                provider.setActiveTab('performance');

                vscode.window.showInformationMessage(
                    `⚡ ${result.summaryHeadline}`,
                    'OK'
                );
            });
        })
    );

    // Apply Refactor Command — with safety validation & smart preview option
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.applyRefactor', async (varName: string, targetStructure: string) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !varName || !targetStructure) return;

            const analysisCtx = currentAnalysis.get(varName);
            if (!analysisCtx) {
                vscode.window.showWarningMessage(`Adaptix: No analysis data found for '${varName}'. Save the file first.`);
                return;
            }

            const currentStructure = analysisCtx.monitor.currentStructure;
            const refactorType = classifyRefactor(analysisCtx.context, currentStructure, targetStructure);
            const useAI = shouldUseAI(refactorType);

            if (useAI) {
                // Route through Smart Diff flow so user never gets blinded by silent overwrite
                vscode.commands.executeCommand('adaptix.openSmartDiff', varName, targetStructure);
                return;
            }

            // Safe mechanical AST refactor
            const plan = planRefactor(editor.document, varName, currentStructure, targetStructure, analysisCtx.context);
            if (plan.edits.length === 0) {
                vscode.window.showWarningMessage(`Adaptix: ${plan.summary}`);
                return;
            }

            const editsToApply = new vscode.WorkspaceEdit();
            for (const edit of plan.edits) {
                editsToApply.replace(editor.document.uri, edit.range, edit.newText);
            }

            const choice = await vscode.window.showInformationMessage(
                `Adaptix: ${plan.summary}`,
                'Apply',
                'Cancel'
            );

            if (choice === 'Apply') {
                const success = await vscode.workspace.applyEdit(editsToApply);
                if (success) {
                    const cleanTarget = targetStructure.replace('std::', '');
                    vscode.window.showInformationMessage(`Adaptix Refactored: ${varName} → ${cleanTarget}`);
                    globalHistory.unshift({
                        from: currentStructure.replace('std::', ''),
                        to: cleanTarget,
                        reason: `Optimized ${varName} for observed workload`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    learningLayer.recordAcceptance(currentStructure, cleanTarget);
                    triggerUpdate(editor.document);
                }
            }
        })
    );

    // Keystroke Change Listeners
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId !== 'cpp' && event.document.languageId !== 'c') return;

            const changedRanges: ChangedRange[] = event.contentChanges.map(change => ({
                startLine: change.range.start.line,
                endLine: change.range.end.line
            }));

            const text = event.document.getText();
            currentAnalysis = analyzer.analyzeIncremental(text, changedRanges);
            const unifiedReport = unifiedPipeline.analyze(text);
            suggestionEngine.updateDiagnostics(event.document, currentAnalysis);
            provider.update(currentAnalysis, globalHistory, unifiedReport);
            codeLensProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            triggerUpdate(document);
        })
    );

    // Preserved Navigation Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.runBenchmark', () => {
            vscode.commands.executeCommand('adaptix.insightsView.focus');
            provider.setActiveTab('performance');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.openVisualizer', () => {
            vscode.commands.executeCommand('adaptix.insightsView.focus');
            provider.setActiveTab('visualizer');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.openNatureLab', () => {
            vscode.commands.executeCommand('adaptix.insightsView.focus');
            provider.setAcademicMode(true);
            provider.setActiveTab('academic');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.openNPAdvisor', () => {
            vscode.commands.executeCommand('adaptix.insightsView.focus');
            provider.setAcademicMode(true);
            provider.setActiveTab('academic');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.analyzeCurrentFile', () => {
            if (vscode.window.activeTextEditor) {
                triggerUpdate(vscode.window.activeTextEditor.document);
            }
            vscode.commands.executeCommand('adaptix.insightsView.focus');
        })
    );
}

export function deactivate() {
    AdaptixDiffContentProvider.getInstance().clear();
}
