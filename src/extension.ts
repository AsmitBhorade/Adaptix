import * as vscode from 'vscode';
import { Analyzer, AnalysisContext } from './analyzer';
import { AdaptixViewProvider, AdaptationRecord, FileAnalysisInfo } from './ui';
import { LearningLayer } from './learning';
import { planRefactor } from './refactorPlanner';
import { logWarn } from './logger';
import { classifyRefactor, shouldUseAI } from './refactorType';
import { generateSemanticRefactor } from './services/aiService';
import { UnifiedPipeline } from './pipeline/unifiedPipeline';
import { AdaptixDiffContentProvider } from './providers/diffContentProvider';
import { TemplateInjector, TemplateParadigm } from './refactoring/templateInjector';
import { EdgeCaseRunner } from './validation/edgeCaseRunner';
import { BeforeAfterRunner } from './benchmark/beforeAfterRunner';
import { CppAstParser } from './analysis/astParser';
import { AlgorithmRewriter } from './refactoring/algorithmRewriter';

export function activate(context: vscode.ExtensionContext) {
    console.log('Adaptix Engine Active!');

    // Clear any stale optimization queue state from previous sessions
    context.workspaceState.update('adaptixOptQueue', undefined);
    context.workspaceState.update('adaptixLastOpt', undefined);

    const learningLayer = new LearningLayer(context);
    const analyzer = new Analyzer(learningLayer);
    const unifiedPipeline = new UnifiedPipeline(analyzer);

    // Configuration
    const config = vscode.workspace.getConfiguration('adaptix');
    let currentAcademicMode = config.get<boolean>('academicMode', false);
    let currentOptimizationBias = config.get<'memory' | 'balanced' | 'speed'>('optimizationBias', 'speed');
    analyzer.setGlobalProfile(currentOptimizationBias);

    // Dashboard Webview Provider
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
    const globalHistory: AdaptationRecord[] = [];

    // Race-Condition Prevention & Debounce State for Safe Auto-Analysis
    let activeAnalysisId = 0;
    let debounceTimer: NodeJS.Timeout | undefined;

    /**
     * Safe static analysis — triggers automatically on C++ documents.
     * Never automatically compiles, benchmarks, optimizes, or modifies code.
     * Cancels/supersedes outdated analyses to prevent race conditions.
     */
    const performSafeAnalysis = (document: vscode.TextDocument) => {
        if (document.languageId !== 'cpp' && document.languageId !== 'c') {
            return;
        }

        const currentId = ++activeAnalysisId;
        const docUri = document.uri.toString();
        const docVersion = document.version;
        const docPath = document.fileName;
        const text = document.getText();

        try {
            // Perform static AST parsing and algorithmic pattern detection
            const analysis = analyzer.analyze(text);
            const unifiedReport = unifiedPipeline.analyze(text);

            // Stale result guard: Verify this analysis was not superseded
            if (currentId !== activeAnalysisId) {
                return;
            }

            // Document switch guard: Ensure editor is still focused on this document
            const activeEditorUri = vscode.window.activeTextEditor?.document.uri.toString();
            if (activeEditorUri && activeEditorUri !== docUri) {
                return;
            }

            currentAnalysis = analysis;
            const fileInfo: FileAnalysisInfo = {
                fileName: docPath.split(/[\\/]/).pop() || docPath,
                filePath: docPath,
                uri: docUri,
                version: docVersion,
                lastAnalyzed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };

            provider.update(currentAnalysis, globalHistory, unifiedReport, fileInfo);
        } catch (err: any) {
            logWarn('Extension', `Safe static analysis failed for ${docPath}: ${err?.message || err}`);
        }
    };

    // Initial Trigger for active editor if present
    if (vscode.window.activeTextEditor) {
        performSafeAnalysis(vscode.window.activeTextEditor.document);
    }

    // Active Editor Switch: Safe automatic analysis
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = undefined;
            }
            if (editor && (editor.document.languageId === 'cpp' || editor.document.languageId === 'c')) {
                performSafeAnalysis(editor.document);
            }
        })
    );

    // Document Open: Safe automatic analysis
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId === 'cpp' || document.languageId === 'c') {
                performSafeAnalysis(document);
            }
        })
    );

    // Keystroke Debouncing (500ms): Do not analyze on every keystroke
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId !== 'cpp' && event.document.languageId !== 'c') {
                return;
            }

            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            debounceTimer = setTimeout(() => {
                performSafeAnalysis(event.document);
            }, 500);
        })
    );

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
                    performSafeAnalysis(vscode.window.activeTextEditor.document);
                }
            }
        })
    );

    // ─────────────── ESSENTIAL COMMANDS (COMMAND PALETTE) ───────────────

    // 1. Open ADAPTIX Dashboard
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.showInsights', () => {
            vscode.commands.executeCommand('adaptix.insightsView.focus');
        })
    );

    // 2. Analyze Current File (Manual Action & "Analyze Again")
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.analyzeCurrentFile', () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = undefined;
            }
            const editor = vscode.window.activeTextEditor;
            if (editor && (editor.document.languageId === 'cpp' || editor.document.languageId === 'c')) {
                performSafeAnalysis(editor.document);
            }
            vscode.commands.executeCommand('adaptix.insightsView.focus');
        })
    );

    // ─────────────── INTERNAL COMMAND HANDLERS (DASHBOARD-ROUTED) ───────────────

    // Toggle Academic Mode
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.toggleAcademicMode', async () => {
            currentAcademicMode = !currentAcademicMode;
            await vscode.workspace.getConfiguration('adaptix').update('academicMode', currentAcademicMode, vscode.ConfigurationTarget.Global);
            provider.setAcademicMode(currentAcademicMode);
            vscode.window.showInformationMessage(`Adaptix: Academic Mode ${currentAcademicMode ? 'ENABLED (DAA / NP / Nature Labs Active)' : 'DISABLED (Clean Production Mode)'}`);
        })
    );

    // Set Optimization Strategy
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.setOptimizationBias', async (bias: 'memory' | 'balanced' | 'speed') => {
            currentOptimizationBias = bias;
            analyzer.setGlobalProfile(bias);
            provider.setOptimizationBias(bias);
            if (vscode.window.activeTextEditor) {
                performSafeAnalysis(vscode.window.activeTextEditor.document);
            }
        })
    );

    // Inject Algorithmic Skeleton Template
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.injectTemplate', async (paradigmArg?: string, functionNodeArg?: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('ADAPTIX: Open a C++ file to inject templates.');
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

                if (!pick) {
                    return;
                }
                paradigm = pick.value as TemplateParadigm;
            }

            const templateCode = TemplateInjector.generateTemplate({
                paradigm,
                optimizationBias: currentOptimizationBias,
                functionNode: functionNodeArg
            });

            const action = await vscode.window.showInformationMessage(
                `ADAPTIX: Generated ${paradigm} skeleton. Choose insertion mode:`,
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

    // Native Semantic Smart Diff Preview
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.openSmartDiff', async (varName?: string, targetStructure?: string, optType?: string, paradigm?: string) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('ADAPTIX: Open a C++ file to preview Smart Diff.');
                return;
            }

            const docText = editor.document.getText();
            const targetVar = varName || 'arr';
            const isAlgorithm = optType === 'Algorithm' || !currentAnalysis.has(targetVar);

            if (isAlgorithm) {
                const parseResult = CppAstParser.parse(docText);
                const funcNode = parseResult.functions.find(f => f.name === targetVar);
                if (!funcNode) {
                    vscode.window.showWarningMessage(`ADAPTIX: Could not locate function '${targetVar}' in the active document.`);
                    return;
                }

                const rewriteResult = AlgorithmRewriter.rewrite(funcNode, paradigm, docText);
                if (!rewriteResult.success) {
                    vscode.window.showErrorMessage(`ADAPTIX: Failed to generate algorithm diff for '${targetVar}'.`);
                    return;
                }

                const lines = docText.split('\n');
                const beforeLines = lines.slice(0, funcNode.startLine - 1);
                const afterLines = lines.slice(funcNode.endLine);
                const proposedCode = [...beforeLines, rewriteResult.optimizedCode, ...afterLines].join('\n');

                const virtualUri = await diffProvider.openDiff(
                    editor.document.uri,
                    proposedCode,
                    `ADAPTIX Algorithm Smart Diff: ${targetVar} (${rewriteResult.paradigm})`
                );

                const choice = await vscode.window.showInformationMessage(
                    `Algorithm Smart Diff active for ${targetVar}. Accept changes?`,
                    'Accept Refactor',
                    'Discard'
                );

                if (choice === 'Accept Refactor') {
                    await diffProvider.acceptRefactor(virtualUri);
                    performSafeAnalysis(editor.document);
                }
                return;
            }

            const targetDS = targetStructure || 'std::unordered_set';
            const analysisCtx = currentAnalysis.get(targetVar);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `ADAPTIX: Preparing Smart Diff for ${targetVar} → ${targetDS}...`,
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
                    `ADAPTIX Smart Diff: ${targetVar} → ${targetDS.replace('std::', '')}`
                );

                const choice = await vscode.window.showInformationMessage(
                    `Smart Diff active for ${targetVar}. Accept changes?`,
                    'Accept Refactor',
                    'Discard'
                );

                if (choice === 'Accept Refactor') {
                    await diffProvider.acceptRefactor(virtualUri);
                    performSafeAnalysis(editor.document);
                }
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
                title: 'ADAPTIX: Compiling with -O2 & Benchmarking Before vs After...',
                cancellable: false
            }, async () => {
                const result = await BeforeAfterRunner.runBenchmark(code, code, {
                    varName: varName || 'arr',
                    fromStructure: fromDS || 'std::vector',
                    toStructure: toDS || 'std::unordered_set'
                });

                vscode.commands.executeCommand('adaptix.insightsView.focus');
                provider.setActiveTab('benchmark');

                vscode.window.showInformationMessage(
                    `⚡ ${result.summaryHeadline}`,
                    'OK'
                );
            });
        })
    );

    // Apply Refactor Command — safe modification with explicit user confirmation
    context.subscriptions.push(
        vscode.commands.registerCommand('adaptix.applyRefactor', async (varName: string, targetStructure: string, optType?: string, paradigm?: string) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !varName || !targetStructure) {
                return;
            }

            const docText = editor.document.getText();
            const isAlgorithm = optType === 'Algorithm' || !currentAnalysis.has(varName);

            if (isAlgorithm) {
                const parseResult = CppAstParser.parse(docText);
                const funcNode = parseResult.functions.find(f => f.name === varName);
                if (!funcNode) {
                    vscode.window.showWarningMessage(`ADAPTIX: Could not locate function '${varName}' in the active document.`);
                    return;
                }

                const rewriteResult = AlgorithmRewriter.rewrite(funcNode, paradigm, docText);
                if (!rewriteResult.success) {
                    vscode.window.showErrorMessage(`ADAPTIX: Failed to generate algorithm refactor for '${varName}'.`);
                    return;
                }

                const startPos = new vscode.Position(funcNode.startLine - 1, 0);
                const endLine = editor.document.lineAt(funcNode.endLine - 1);
                const endPos = endLine.range.end;
                const replaceRange = new vscode.Range(startPos, endPos);

                const editsToApply = new vscode.WorkspaceEdit();
                editsToApply.replace(editor.document.uri, replaceRange, rewriteResult.optimizedCode);

                const choice = await vscode.window.showInformationMessage(
                    `ADAPTIX: ${rewriteResult.explanation}. Confirm applying algorithmic changes to ${editor.document.fileName}?`,
                    'Apply Changes',
                    'Cancel'
                );

                if (choice === 'Apply Changes') {
                    const success = await vscode.workspace.applyEdit(editsToApply);
                    if (success) {
                        vscode.window.showInformationMessage(`ADAPTIX: Successfully refactored algorithm '${varName}' (${rewriteResult.paradigm})!`);
                        globalHistory.unshift({
                            from: 'Inefficient Algorithmic Pattern',
                            to: rewriteResult.paradigm,
                            reason: `Optimized algorithm '${varName}'`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                        performSafeAnalysis(editor.document);
                    }
                }
                return;
            }

            const analysisCtx = currentAnalysis.get(varName);
            if (!analysisCtx) {
                vscode.window.showWarningMessage(`ADAPTIX: No analysis data found for '${varName}'. Save or analyze the file first.`);
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
                vscode.window.showWarningMessage(`ADAPTIX: ${plan.summary}`);
                return;
            }

            const editsToApply = new vscode.WorkspaceEdit();
            for (const edit of plan.edits) {
                editsToApply.replace(editor.document.uri, edit.range, edit.newText);
            }

            // Explicit confirmation prompt before file modification
            const choice = await vscode.window.showInformationMessage(
                `ADAPTIX: ${plan.summary}. Confirm applying changes to ${editor.document.fileName}?`,
                'Apply Changes',
                'Cancel'
            );

            if (choice === 'Apply Changes') {
                const success = await vscode.workspace.applyEdit(editsToApply);
                if (success) {
                    const cleanTarget = targetStructure.replace('std::', '');
                    vscode.window.showInformationMessage(`ADAPTIX Refactored: ${varName} → ${cleanTarget}`);
                    globalHistory.unshift({
                        from: currentStructure.replace('std::', ''),
                        to: cleanTarget,
                        reason: `Optimized ${varName} for observed workload`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    learningLayer.recordAcceptance(currentStructure, cleanTarget);
                    performSafeAnalysis(editor.document);
                }
            }
        })
    );
}

export function deactivate() {
    AdaptixDiffContentProvider.getInstance().clear();
}
