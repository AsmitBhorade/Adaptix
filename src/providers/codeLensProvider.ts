import * as vscode from 'vscode';
import { CppAstParser, CppFunctionNode } from '../analysis/astParser';
import { StrategyDetector } from '../algorithms/strategyDetector';
import { AnalysisContext } from '../analyzer';

export class AdaptixCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    private _debounceTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly getAnalysisMap: () => Map<string, AnalysisContext>,
        private readonly getOptimizationBias: () => 'speed' | 'balanced' | 'memory'
    ) {}

    public refresh(): void {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this._onDidChangeCodeLenses.fire();
        }, 150);
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        if (document.languageId !== 'cpp' && document.languageId !== 'c') {
            return [];
        }

        const code = document.getText();
        const codeLenses: vscode.CodeLens[] = [];

        try {
            const parseResult = CppAstParser.parse(code);
            const analysisMap = this.getAnalysisMap();
            const bias = this.getOptimizationBias();

            for (const func of parseResult.functions) {
                // Function header range (line above function signature or exact line)
                const funcLine = Math.max(0, func.startLine - 1);
                const range = new vscode.Range(funcLine, 0, funcLine, 0);

                // 1. Analyze function body for algorithm strategies
                const fullFuncCode = `${func.returnType} ${func.name}(${func.parameters.join(', ')}) {\n${func.body}\n}`;
                const strategies = StrategyDetector.analyze(fullFuncCode);
                const dpStrategy = strategies.find(s => s.detectedParadigm === 'dynamic_programming');

                if (dpStrategy && (dpStrategy.theoreticalComplexity.current.time.includes('2^') || func.isRecursive)) {
                    // Exponential recursive bottleneck detected
                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: `⚠️ O(2^N) Recursive Bottleneck | ⚡ Optimize with DP (${bias === 'memory' ? 'O(1) Space' : 'O(N) Tabulation'})`,
                            command: 'adaptix.injectTemplate',
                            arguments: [bias === 'memory' ? 'dynamic_programming_tab' : 'dynamic_programming_tab', func]
                        })
                    );

                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: `🔍 Preview Smart Diff`,
                            command: 'adaptix.openSmartDiff',
                            arguments: [func.name, 'dynamic_programming_tab', func]
                        })
                    );

                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: `🧪 Test Counterexample`,
                            command: 'adaptix.runEdgeCaseTest',
                            arguments: ['dynamic_programming']
                        })
                    );
                } else if (strategies.length > 0) {
                    const topStrat = strategies[0];
                    const paradigmName = topStrat.detectedParadigm.replace('_', ' ').toUpperCase();

                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: `💡 Paradigm: ${paradigmName} (${topStrat.theoreticalComplexity.current.time} → ${topStrat.theoreticalComplexity.proposed.time})`,
                            command: 'adaptix.injectTemplate',
                            arguments: [topStrat.detectedParadigm, func]
                        })
                    );
                }

                // 2. Scan for container bottlenecks inside function
                const eraseInLoop = func.body.includes('.erase(') && func.maxLoopNestingDepth > 0;
                const findInLoop = (func.body.includes('.find(') || func.body.includes('std::find')) && func.maxLoopNestingDepth > 0;

                if (eraseInLoop) {
                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: `💡 std::vector::erase inside loop -> O(N²) | 🔄 Switch to std::unordered_set`,
                            command: 'adaptix.applyRefactor',
                            arguments: ['arr', 'std::unordered_set']
                        })
                    );
                } else if (findInLoop) {
                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: `💡 Linear search inside loop -> O(N²) | ⚡ Upgrade to Hash Lookup`,
                            command: 'adaptix.openSmartDiff',
                            arguments: ['arr', 'std::unordered_set', func]
                        })
                    );
                }

                // 3. Check tracked variables located in this function
                for (const localVar of func.localVariables) {
                    const varCtx = analysisMap.get(localVar.name);
                    if (varCtx && varCtx.decision && varCtx.decision.suggestedStructure) {
                        codeLenses.push(
                            new vscode.CodeLens(range, {
                                title: `⚡ ${localVar.name}: Refactor to ${varCtx.decision.suggestedStructure.replace('std::', '')} (${varCtx.decision.speedup || 'Faster'})`,
                                command: 'adaptix.applyRefactor',
                                arguments: [localVar.name, varCtx.decision.suggestedStructure]
                            })
                        );
                    }
                }

                // 4. Closed-loop Before/After benchmark trigger
                codeLenses.push(
                    new vscode.CodeLens(range, {
                        title: `📊 Benchmark Before vs After`,
                        command: 'adaptix.runBeforeAfterBenchmark',
                        arguments: [func.name, 'std::vector', 'std::unordered_set']
                    })
                );
            }
        } catch {
            // Fault-tolerant skip on broken syntax during typing
        }

        return codeLenses;
    }
}
