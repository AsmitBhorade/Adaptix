/**
 * Unified Intelligence and Recommendation Pipeline
 * 
 * Central nervous system of ADAPTIX 3.0. Connects:
 * 1. Data Structure Intelligence (Semester 4 DSA: Analyzer, Monitor, DecisionEngine)
 * 2. Algorithm Strategy Engine (Semester 5 DAA: StrategyDetector, Master Theorem)
 * 3. NP-Completeness & Approximation Advisor (NPAdvisor, Feasibility)
 * 4. Complexity & Benchmark Lab (BenchmarkRunner, Asymptotics)
 * 5. Visual Algorithm Debugger (TraceGenerators)
 * 6. Nature-Inspired Optimization Lab (ACO, PSO, GA)
 * 
 * Synthesizes cross-cutting recommendations into a unified, actionable developer report.
 */

import { Analyzer, AnalysisContext } from '../analyzer';
import { StrategyDetector, StrategyDetectionResult } from '../algorithms/strategyDetector';
import { NPAdvisor, HardnessProblemDefinition } from '../npCompleteness/npAdvisor';
import { TraceGenerators } from '../visualization/traceGenerators';
import { CANONICAL_PROBLEMS, CanonicalProblem } from '../algorithms/canonicalProblems';
import { CppAstParser, CppFunctionNode } from '../analysis/astParser';
import { AlgorithmRewriter } from '../refactoring/algorithmRewriter';

export interface UnifiedOptimizationItem {
    type: 'Data Structure' | 'Algorithm';
    varName: string;
    currentDS: string;
    targetDS: string;
    speedup: string;
    confidence: string;
    twoSentence: string;
    deepExplain: string;
    paradigm?: string;
    functionNode?: CppFunctionNode;
    diffDel?: string;
    diffAdd?: string;
}

export interface UnifiedAnalysisReport {
    timestamp: string;
    codeLength: number;
    // Unified Optimizations for Carousel & Auto-Refactoring
    optimizations: UnifiedOptimizationItem[];
    // Module 1: Data Structure Intelligence (Preserved Semester 4)
    dataStructures: {
        trackedVariablesCount: number;
        optimizationsFound: number;
        analyses: Map<string, AnalysisContext>;
        primaryRecommendation?: {
            varName: string;
            current: string;
            suggested: string;
            speedup: string;
            confidence: string;
        };
    };
    // Module 2: Algorithm Strategy Intelligence (Semester 5 DAA)
    algorithmStrategy: {
        detectedStrategies: StrategyDetectionResult[];
        dominantParadigm?: string;
        hasOverlappingSubproblems: boolean;
        hasExponentialRecursion: boolean;
        suggestedRefactoringCpp?: string;
    };
    // Module 3: Computational Hardness & NP Advisor
    computationalHardness: {
        isKnownNPHard: boolean;
        matchedProblem?: HardnessProblemDefinition;
        feasibilityRecommendation?: string;
        reductionInsight?: string;
    };
    // Module 4: Visual Debugger Integration
    suggestedVisualizer: {
        mode: 'recursion_tree' | 'dp_table' | 'backtracking' | 'graph' | 'sorting_searching' | 'none';
        title: string;
        description: string;
        defaultPresetId?: string;
    };
    // Consolidated Executive Summary
    executiveSummary: {
        overallHealth: 'Optimal' | 'Actionable Optimizations Found' | 'Critical Bottlenecks Detected';
        bottleneckHeadline: string;
        recommendedActions: string[];
    };
}

export class UnifiedPipeline {
    private analyzer: Analyzer;

    constructor(analyzer?: Analyzer) {
        this.analyzer = analyzer || new Analyzer();
    }

    /**
     * Executes end-to-end multi-module analysis on a C++ code buffer
     */
    public analyze(code: string): UnifiedAnalysisReport {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const optimizations: UnifiedOptimizationItem[] = [];

        // 1. Data Structure Analysis (Semester 4)
        const dsAnalysis = this.analyzer.analyze(code);
        let optimizationsCount = 0;
        let primaryDS: UnifiedAnalysisReport['dataStructures']['primaryRecommendation'] = undefined;

        for (const [varName, ctx] of dsAnalysis.entries()) {
            if (ctx.decision && ctx.decision.suggestedStructure && ctx.decision.suggestedStructure !== ctx.monitor.currentStructure) {
                optimizationsCount++;
                if (!primaryDS || ctx.decision.impactLevel === 'high') {
                    primaryDS = {
                        varName,
                        current: ctx.monitor.currentStructure.replace('std::', ''),
                        suggested: ctx.decision.suggestedStructure.replace('std::', ''),
                        speedup: ctx.decision.speedup || 'Faster',
                        confidence: ctx.decision.confidenceLabel
                    };
                }

                optimizations.push({
                    type: 'Data Structure',
                    varName,
                    currentDS: ctx.monitor.currentStructure,
                    targetDS: ctx.decision.suggestedStructure,
                    speedup: ctx.decision.speedup || 'Faster',
                    confidence: ctx.decision.confidenceLabel || 'Strong',
                    twoSentence: ctx.decision.twoSentenceSummary || `Migrate container '${varName}' to ${ctx.decision.suggestedStructure} for improved performance.`,
                    deepExplain: ctx.decision.deepExplanation || `${ctx.decision.suggestedStructure} optimizes critical operations from O(N) linear shifts to amortized O(1).`,
                    diffDel: [
                        `- ${ctx.monitor.currentStructure}<T> ${varName};`,
                        `- ${varName}.push_back(val);`,
                        `- auto it = std::find(${varName}.begin(), ${varName}.end(), key);`,
                        `- ${varName}.erase(it);`
                    ].join('\n'),
                    diffAdd: [
                        `+ ${ctx.decision.suggestedStructure}<T> ${varName};`,
                        `+ ${varName}.insert(val);`,
                        `+ bool found = ${varName}.count(key) > 0;`,
                        `+ ${varName}.erase(key);`
                    ].join('\n')
                });
            }
        }

        // 2. Algorithm Strategy Detection (Semester 5 DAA) & AST Extraction
        const strategies = StrategyDetector.analyze(code);
        const astParse = CppAstParser.parse(code);

        for (const func of astParse.functions) {
            if (func.name === 'main') continue;

            const lowerBody = func.body.toLowerCase();
            const callMatches = func.body.match(new RegExp(`\\b${func.name}\\s*\\(`, 'g')) || [];
            const recCount = callMatches.length;
            const isExponential = (func.isRecursive && (recCount >= 2 || func.recursiveCallLines.length >= 2));
            const isSorting = (func.name.toLowerCase().includes('sort') || lowerBody.includes('swap(') || lowerBody.includes('std::swap')) && func.maxLoopNestingDepth >= 2;
            const isSubstring = (func.name.toLowerCase().includes('substring') || (lowerBody.includes('pattern') && lowerBody.includes('text'))) && func.maxLoopNestingDepth >= 2;

            if (isExponential) {
                const rewriteRes = AlgorithmRewriter.rewrite(func, 'dynamic_programming_tab', code);
                optimizations.push({
                    type: 'Algorithm',
                    varName: func.name,
                    currentDS: `Exponential Recursion O(2^n)`,
                    targetDS: `Dynamic Programming Tabulation O(n)`,
                    speedup: 'O(2^n) → O(n) (10,000x+ Speedup)',
                    confidence: 'Strong',
                    twoSentence: `Function '${func.name}' executes overlapping recursive calls without caching, causing exponential time complexity. Replacing with dynamic programming resolves this in O(n) linear time.`,
                    deepExplain: `Identical state subproblems are computed repeatedly across branching recursion calls. Tabulation pre-computes and caches subproblems in a contiguous vector table.`,
                    paradigm: 'dynamic_programming_tab',
                    functionNode: func,
                    diffDel: rewriteRes.diffDel,
                    diffAdd: rewriteRes.diffAdd
                });
            } else if (isSorting) {
                const rewriteRes = AlgorithmRewriter.rewrite(func, 'divide_and_conquer', code);
                optimizations.push({
                    type: 'Algorithm',
                    varName: func.name,
                    currentDS: 'Quadratic Bubble Sort O(N²)',
                    targetDS: 'Introsort (std::sort) O(N log N)',
                    speedup: 'O(N²) → O(N log N) (100x+ Speedup)',
                    confidence: 'Strong',
                    twoSentence: `Function '${func.name}' uses nested loops with adjacent element swaps, causing O(N²) worst-case execution time. Replacing with std::sort achieves optimal O(N log N) introsort.`,
                    deepExplain: `Pairwise adjacent comparisons perform quadratic operations on unsorted sequences. Utilizing introsort (hybrid quicksort, heapsort, and insertion sort) guarantees O(N log N) worst-case performance.`,
                    paradigm: 'divide_and_conquer',
                    functionNode: func,
                    diffDel: rewriteRes.diffDel,
                    diffAdd: rewriteRes.diffAdd
                });
            } else if (isSubstring) {
                const rewriteRes = AlgorithmRewriter.rewrite(func, 'kmp_string_matching', code);
                optimizations.push({
                    type: 'Algorithm',
                    varName: func.name,
                    currentDS: 'Brute-Force Substring Search O(N * M)',
                    targetDS: 'Knuth-Morris-Pratt (KMP) Search O(N + M)',
                    speedup: 'O(N * M) → O(N + M)',
                    confidence: 'Strong',
                    twoSentence: `Function '${func.name}' performs naive substring search with nested loops, causing O(N * M) worst-case comparisons. KMP achieves linear O(N + M) matching.`,
                    deepExplain: `Precomputing the longest prefix-suffix (LPS) table allows the search to skip ahead without backtracking the text index upon mismatch, guaranteeing linear time.`,
                    paradigm: 'kmp_string_matching',
                    functionNode: func,
                    diffDel: rewriteRes.diffDel,
                    diffAdd: rewriteRes.diffAdd
                });
            } else if (func.maxLoopNestingDepth >= 2 && !lowerBody.includes('dp[') && !lowerBody.includes('memo[') && !lowerBody.includes('table[')) {
                const rewriteRes = AlgorithmRewriter.rewrite(func, 'loop_flattening', code);
                optimizations.push({
                    type: 'Algorithm',
                    varName: func.name,
                    currentDS: 'Nested Iteration O(N²)',
                    targetDS: 'Linear / Flattened Loop O(N)',
                    speedup: 'O(N²) → O(N)',
                    confidence: 'Moderate',
                    twoSentence: `Function '${func.name}' contains deeply nested loops. Flattening iteration or applying two-pointers reduces asymptotic complexity.`,
                    deepExplain: `Nested iteration over identical collections causes quadratic operation counts. Restructuring iteration boundaries preserves linear memory bandwidth.`,
                    paradigm: 'divide_and_conquer',
                    functionNode: func,
                    diffDel: rewriteRes.diffDel,
                    diffAdd: rewriteRes.diffAdd
                });
            }
        }

        const dominant = strategies.length > 0 ? strategies[0] : undefined;
        const hasExponential = strategies.some(s => s.theoreticalComplexity.current.time.includes('^n')) ||
            optimizations.some(o => o.type === 'Algorithm' && o.currentDS.includes('2^n'));
        const hasOverlapping = (dominant?.detectedParadigm === 'dynamic_programming' && hasExponential) ||
            optimizations.some(o => o.type === 'Algorithm' && o.paradigm === 'dynamic_programming_tab');

        // 3. NP-Hardness Assessment
        const npMatch = NPAdvisor.detectNPPatterns(code);
        const isNPHard = !!npMatch.matchedProblem;

        // 4. Visualizer Recommendation Selection
        let visualizerMode: UnifiedAnalysisReport['suggestedVisualizer']['mode'] = 'none';
        let vizTitle = 'No Active Visualization';
        let vizDesc = 'Write or select code to generate visual execution traces.';

        if (isNPHard && npMatch.matchedProblem?.id === 'tsp') {
            visualizerMode = 'graph';
            vizTitle = 'Nature-Inspired TSP Route Simulation';
            vizDesc = 'Simulate ACO pheromone trails and GA tours for TSP route exploration.';
        } else if (dominant?.detectedParadigm === 'dynamic_programming' || optimizations.some(o => o.paradigm === 'dynamic_programming_tab')) {
            visualizerMode = hasExponential ? 'recursion_tree' : 'dp_table';
            vizTitle = hasExponential ? 'Exponential Recursion Tree Visualizer' : 'Dynamic Programming Table Visualizer';
            vizDesc = hasExponential 
                ? 'Visualize identical redundant subproblems being recomputed across branches.'
                : 'Inspect DP 1D/2D table calculation steps and cell dependency arrows.';
        } else if (dominant?.detectedParadigm === 'backtracking') {
            visualizerMode = 'backtracking';
            vizTitle = 'Backtracking State Search Tree';
            vizDesc = 'Observe candidate decisions, constraint validations, pruning, and state rollback.';
        } else if (dominant?.detectedParadigm === 'divide_and_conquer' || optimizations.some(o => o.paradigm === 'divide_and_conquer')) {
            visualizerMode = 'sorting_searching';
            vizTitle = 'Divide & Conquer Sorting Visualizer';
            vizDesc = 'Inspect recursive array partitioning and linear merge operations.';
        } else if (code.toLowerCase().includes('search') || code.toLowerCase().includes('binary')) {
            visualizerMode = 'sorting_searching';
            vizTitle = 'Binary vs Linear Search Visualizer';
            vizDesc = 'Observe logarithmic range narrowing comparisons.';
        }

        // 5. Consolidated Executive Synthesis
        const actions: string[] = [];
        let health: UnifiedAnalysisReport['executiveSummary']['overallHealth'] = 'Optimal';
        let headline = 'Code structure follows efficient algorithmic and data structure patterns.';

        if (hasExponential) {
            health = 'Critical Bottlenecks Detected';
            headline = 'Severe Exponential Time Complexity Bottleneck Detected!';
            actions.push(`Refactor recursive implementation to Dynamic Programming memoization/tabulation.`);
        }

        const algoOpts = optimizations.filter(o => o.type === 'Algorithm');
        if (algoOpts.length > 0) {
            if (health !== 'Critical Bottlenecks Detected') health = 'Actionable Optimizations Found';
            for (const a of algoOpts) {
                if (!actions.some(act => act.includes(a.varName))) {
                    actions.push(`Refactor algorithm '${a.varName}': ${a.currentDS} → ${a.targetDS} (${a.speedup}).`);
                }
            }
        }

        if (primaryDS) {
            if (health !== 'Critical Bottlenecks Detected') health = 'Actionable Optimizations Found';
            actions.push(`Switch container '${primaryDS.varName}' from ${primaryDS.current} to ${primaryDS.suggested} (${primaryDS.speedup} speedup).`);
        }

        if (isNPHard) {
            headline = `Computational Hardness: ${npMatch.matchedProblem?.name} (${npMatch.matchedProblem?.complexityClass})`;
            actions.push(`Input size dictates approach: evaluate exact branch-and-cut for N < 20 or ACO/GA metaheuristics for large N.`);
        }

        if (actions.length === 0) {
            actions.push('No immediate structural or algorithmic bottlenecks detected. Run Complexity Benchmarks for empirical stress testing.');
        }

        return {
            timestamp,
            codeLength: code.length,
            optimizations,
            dataStructures: {
                trackedVariablesCount: dsAnalysis.size,
                optimizationsFound: optimizationsCount,
                analyses: dsAnalysis,
                primaryRecommendation: primaryDS
            },
            algorithmStrategy: {
                detectedStrategies: strategies,
                dominantParadigm: dominant?.detectedParadigm,
                hasOverlappingSubproblems: hasOverlapping,
                hasExponentialRecursion: hasExponential,
                suggestedRefactoringCpp: dominant?.suggestedRefactoringCpp
            },
            computationalHardness: {
                isKnownNPHard: isNPHard,
                matchedProblem: npMatch.matchedProblem,
                feasibilityRecommendation: isNPHard ? 'Assess input size N in the NP Advisor tab.' : undefined,
                reductionInsight: npMatch.reductionInsight
            },
            suggestedVisualizer: {
                mode: visualizerMode,
                title: vizTitle,
                description: vizDesc,
                defaultPresetId: dominant?.matchingCanonicalProblem?.id
            },
            executiveSummary: {
                overallHealth: health,
                bottleneckHeadline: headline,
                recommendedActions: actions
            }
        };
    }
}

