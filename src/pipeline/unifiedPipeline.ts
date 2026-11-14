/**
 * Unified Intelligence and Recommendation Pipeline
 * 
 * Central nervous system of ADAPTIX 2.0. Connects:
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

export interface UnifiedAnalysisReport {
    timestamp: string;
    codeLength: number;
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

        // 1. Data Structure Analysis (Semester 4)
        const dsAnalysis = this.analyzer.analyze(code);
        let optimizationsCount = 0;
        let primaryDS: UnifiedAnalysisReport['dataStructures']['primaryRecommendation'] = undefined;

        for (const [varName, ctx] of dsAnalysis.entries()) {
            if (ctx.decision && ctx.decision.suggestedStructure) {
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
            }
        }

        // 2. Algorithm Strategy Detection (Semester 5)
        const strategies = StrategyDetector.analyze(code);
        const dominant = strategies.length > 0 ? strategies[0] : undefined;
        const hasExponential = strategies.some(s => s.theoreticalComplexity.current.time.includes('^n'));
        const hasOverlapping = dominant?.detectedParadigm === 'dynamic_programming' && hasExponential;

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
        } else if (dominant?.detectedParadigm === 'dynamic_programming') {
            visualizerMode = hasExponential ? 'recursion_tree' : 'dp_table';
            vizTitle = hasExponential ? 'Exponential Recursion Tree Visualizer' : 'Dynamic Programming Table Visualizer';
            vizDesc = hasExponential 
                ? 'Visualize identical redundant subproblems being recomputed across branches.'
                : 'Inspect DP 1D/2D table calculation steps and cell dependency arrows.';
        } else if (dominant?.detectedParadigm === 'backtracking') {
            visualizerMode = 'backtracking';
            vizTitle = 'Backtracking State Search Tree';
            vizDesc = 'Observe candidate decisions, constraint validations, pruning, and state rollback.';
        } else if (dominant?.detectedParadigm === 'divide_and_conquer') {
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
            actions.push(`Refactor recursive '${dominant?.detectedParadigm}' implementation to Dynamic Programming memoization/tabulation.`);
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

