/**
 * Algorithm Strategy Intelligence Engine
 * 
 * Inspects C++ code buffers to detect algorithmic paradigms:
 * - Divide and Conquer (D&C)
 * - Dynamic Programming (DP)
 * - Greedy Algorithms
 * - Backtracking
 * 
 * Evaluates overlapping subproblems, branching factors, recursion depths,
 * state rollback patterns, and greedy choice properties.
 * Recommends optimal algorithmic transformations with theoretical complexity
 * derivations and Master Theorem classifications.
 */

import { CANONICAL_PROBLEMS, CanonicalProblem, AlgorithmParadigm } from './canonicalProblems';

export interface StrategyDetectionResult {
    detectedParadigm: AlgorithmParadigm;
    confidence: number;
    confidenceLabel: 'Strong' | 'Moderate' | 'Low';
    primaryReason: string;
    supportingObservations: string[];
    recurrenceRelation?: string;
    theoreticalComplexity: {
        current: { time: string; space: string };
        proposed: { time: string; space: string };
    };
    tradeoffs: string[];
    whyApplicable: string;
    whyAlternativesFail: string;
    matchingCanonicalProblem?: CanonicalProblem;
    suggestedRefactoringCpp?: string;
    requiresSemanticTransformation: boolean;
}

export class StrategyDetector {
    /**
     * Analyzes C++ code for algorithm design paradigm signatures
     */
    public static analyze(code: string): StrategyDetectionResult[] {
        const results: StrategyDetectionResult[] = [];
        const lines = code.split('\n');

        // Feature extractors
        const hasRecursion = this.detectRecursion(code);
        const recursiveBranchCount = this.countRecursiveBranches(code);
        const hasHalving = this.detectHalvingPattern(code);
        const hasMemoization = this.detectMemoization(code);
        const hasGreedySorting = this.detectGreedySorting(code);
        const hasStateRollback = this.detectStateRollback(code);
        const hasConstraintPruning = this.detectConstraintPruning(code);
        const canonicalMatch = this.matchCanonicalProblem(code);

        // 1. DYNAMIC PROGRAMMING DETECTION
        if (hasRecursion && recursiveBranchCount >= 2 && !hasMemoization) {
            // High priority: Inefficient exponential recursive solution detected!
            results.push({
                detectedParadigm: 'dynamic_programming',
                confidence: canonicalMatch?.paradigm === 'dynamic_programming' ? 0.95 : 0.85,
                confidenceLabel: 'Strong',
                primaryReason: 'Detected multi-branching recursive call tree with overlapping subproblems and NO memoization caching.',
                supportingObservations: [
                    `Function makes ${recursiveBranchCount} recursive calls per invocation without memoization, generating an exponential O(${recursiveBranchCount}^n) call tree.`,
                    'Identical state values are repeatedly recomputed in separate branches.',
                    'Optimal substructure allows intermediate results to be cached in a 1D/2D table or rolling variables.'
                ],
                recurrenceRelation: canonicalMatch?.recurrenceRelation ?? `T(n) = ${recursiveBranchCount}T(n-1) + O(1) ==> O(${recursiveBranchCount}^n)`,
                theoreticalComplexity: {
                    current: { time: `O(${recursiveBranchCount}^n)`, space: 'O(n) recursion stack' },
                    proposed: { time: 'O(n) to O(n * W)', space: 'O(n) or O(1) optimized' }
                },
                tradeoffs: [
                    'Eliminates call stack overflow risk on deep recursions.',
                    'Transforms exponential runtime into polynomial/linear time.',
                    'Requires memoization table (O(n) space) unless rolling variable optimization is applied.'
                ],
                whyApplicable: 'Overlapping subproblems mean subtrees repeat with identical arguments. Caching results guarantees each subproblem is evaluated at most once.',
                whyAlternativesFail: 'Greedy choices fail because local decisions do not account for future constraints. Pure Divide and Conquer fails because subproblems are not independent.',
                matchingCanonicalProblem: canonicalMatch?.paradigm === 'dynamic_programming' ? canonicalMatch : CANONICAL_PROBLEMS['fibonacci'],
                suggestedRefactoringCpp: canonicalMatch?.optimalCodeCpp ?? CANONICAL_PROBLEMS['fibonacci'].optimalCodeCpp,
                requiresSemanticTransformation: true
            });
        } else if (hasMemoization) {
            results.push({
                detectedParadigm: 'dynamic_programming',
                confidence: 0.9,
                confidenceLabel: 'Strong',
                primaryReason: 'Dynamic Programming state table or memoization lookup detected.',
                supportingObservations: [
                    'Code uses a lookup cache (dp/memo) to avoid redundant computations.',
                    'State transitions indicate optimal substructure.'
                ],
                theoreticalComplexity: {
                    current: { time: 'Polynomial O(n^k)', space: 'O(n^k)' },
                    proposed: { time: 'O(n^k)', space: 'O(1) rolling space if possible' }
                },
                tradeoffs: ['State memoization provides optimal time at the cost of auxiliary table memory.'],
                whyApplicable: 'Subproblem overlap is handled via dynamic programming tabulation or memoization.',
                whyAlternativesFail: 'Independent divide-and-conquer would redundantly calculate overlapping states.',
                matchingCanonicalProblem: canonicalMatch,
                suggestedRefactoringCpp: canonicalMatch?.optimalCodeCpp,
                requiresSemanticTransformation: false
            });
        }

        // 2. DIVIDE AND CONQUER DETECTION
        if (hasRecursion && hasHalving) {
            results.push({
                detectedParadigm: 'divide_and_conquer',
                confidence: 0.88,
                confidenceLabel: 'Strong',
                primaryReason: 'Detected divide-and-conquer problem decomposition with size halving (N/2 or mid split).',
                supportingObservations: [
                    'Input range is repeatedly partitioned into smaller independent subproblems.',
                    'Midpoint calculation `(l + r) / 2` or `l + (r - l) / 2` detected.',
                    'Subproblems do not overlap; each half is processed independently.'
                ],
                recurrenceRelation: 'T(n) = 2T(n/2) + O(n) ==> Master Theorem Case 2: Theta(n log n)',
                theoreticalComplexity: {
                    current: { time: 'O(n log n)', space: 'O(n) or O(log n)' },
                    proposed: { time: 'O(n log n)', space: 'O(log n) in-place' }
                },
                tradeoffs: [
                    'Guaranteed sub-quadratic time complexity on large datasets.',
                    'Enables parallelization of independent branches.',
                    'Requires careful handling of base cases to avoid infinite recursion.'
                ],
                whyApplicable: 'The problem can be split into disjoint independent subproblems whose individual results combine directly to solve the original instance.',
                whyAlternativesFail: 'Dynamic programming is unnecessary because subproblems do not overlap.',
                matchingCanonicalProblem: canonicalMatch?.paradigm === 'divide_and_conquer' ? canonicalMatch : CANONICAL_PROBLEMS['merge_sort'],
                suggestedRefactoringCpp: canonicalMatch?.optimalCodeCpp ?? CANONICAL_PROBLEMS['merge_sort'].optimalCodeCpp,
                requiresSemanticTransformation: false
            });
        }

        // 3. GREEDY ALGORITHMS DETECTION
        if (hasGreedySorting && !hasRecursion) {
            results.push({
                detectedParadigm: 'greedy',
                confidence: 0.82,
                confidenceLabel: 'Moderate',
                primaryReason: 'Detected greedy sorting followed by sequential choice without backtracking.',
                supportingObservations: [
                    'Elements are sorted by a specific metric (ratio, finish time, cost) before single-pass selection.',
                    'Decisions are irrevocable once made (no undo or state rollback).',
                    'Locally optimal choices are made at each step.'
                ],
                theoreticalComplexity: {
                    current: { time: 'O(n log n)', space: 'O(1) to O(n)' },
                    proposed: { time: 'O(n log n)', space: 'O(1)' }
                },
                tradeoffs: [
                    'Significantly faster than DP or backtracking (typically O(n log n) due to initial sort).',
                    'Only valid when the problem possesses the Greedy-Choice Property and Optimal Substructure.',
                    'Fails if local choices leave suboptimal gaps (e.g., 0/1 Knapsack).'
                ],
                whyApplicable: 'When greedy-choice property holds, locally optimal choices lead directly to global optimum without exploring all combinations.',
                whyAlternativesFail: 'Backtracking or dynamic programming would perform unnecessary exponential/polynomial work when a greedy pass suffices.',
                matchingCanonicalProblem: canonicalMatch?.paradigm === 'greedy' ? canonicalMatch : CANONICAL_PROBLEMS['activity_selection'],
                suggestedRefactoringCpp: canonicalMatch?.optimalCodeCpp ?? CANONICAL_PROBLEMS['activity_selection'].optimalCodeCpp,
                requiresSemanticTransformation: false
            });
        }

        // 4. BACKTRACKING DETECTION
        if (hasRecursion && (hasStateRollback || hasConstraintPruning)) {
            results.push({
                detectedParadigm: 'backtracking',
                confidence: 0.9,
                confidenceLabel: 'Strong',
                primaryReason: 'Detected state-space tree exploration with trial-and-error decision rollback (backtrack step).',
                supportingObservations: [
                    'Recursive function explores candidate paths and restores/reverts state upon failure or completion.',
                    'Constraint validation functions (`isValid`, `isSafe`, `canPlace`) prune invalid search branches early.',
                    'Exhaustive combinatorial search with systematic pruning.'
                ],
                theoreticalComplexity: {
                    current: { time: 'O(b^d) pruned', space: 'O(d) recursion stack' },
                    proposed: { time: 'O(b^d) with forward-checking / MRV heuristics', space: 'O(d)' }
                },
                tradeoffs: [
                    'Guaranteed to find all valid configurations or prove no solution exists.',
                    'Exponential worst-case, mitigated significantly by aggressive pruning heuristics.',
                    'Minimal auxiliary space: state is mutated and restored in-place.'
                ],
                whyApplicable: 'The problem requires finding configurations that satisfy complex, mutually coupled constraints where wrong choices must be undone.',
                whyAlternativesFail: 'Greedy fails because early choices can lead to deadlocks. DP fails because the board/graph state space is too vast to memoize effectively.',
                matchingCanonicalProblem: canonicalMatch?.paradigm === 'backtracking' ? canonicalMatch : CANONICAL_PROBLEMS['n_queens'],
                suggestedRefactoringCpp: canonicalMatch?.optimalCodeCpp ?? CANONICAL_PROBLEMS['n_queens'].optimalCodeCpp,
                requiresSemanticTransformation: false
            });
        }

        // If no specific paradigm matched, return a general heuristic evaluation
        if (results.length === 0) {
            results.push({
                detectedParadigm: hasRecursion ? 'divide_and_conquer' : 'greedy',
                confidence: 0.4,
                confidenceLabel: 'Low',
                primaryReason: hasRecursion 
                    ? 'General recursion detected without distinctive DP or D&C markers.'
                    : 'Iterative procedural structure detected.',
                supportingObservations: [
                    hasRecursion ? 'Consider whether recursive subproblems overlap (favoring DP) or are independent (favoring D&C).' : 'Evaluate whether problem requires sorting or optimal selection.'
                ],
                theoreticalComplexity: {
                    current: { time: 'Uncertain', space: 'Uncertain' },
                    proposed: { time: 'Explore canonical templates', space: 'Analyze constraints' }
                },
                tradeoffs: ['Further structural analysis required.'],
                whyApplicable: 'Heuristic baseline.',
                whyAlternativesFail: 'Insufficient code structure.',
                requiresSemanticTransformation: false
            });
        }

        return results;
    }

    private static detectRecursion(code: string): boolean {
        // Matches function definition followed by self-call
        const funcDefRegex = /(?:void|int|long|double|bool|auto)\s+(\w+)\s*\([^)]*\)\s*\{/g;
        let match;
        while ((match = funcDefRegex.exec(code)) !== null) {
            const funcName = match[1];
            if (funcName === 'main') continue;
            // Look for call to funcName inside the function body
            const callRegex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
            const startIndex = match.index + match[0].length;
            const remaining = code.substring(startIndex);
            if (callRegex.test(remaining)) {
                return true;
            }
        }
        return false;
    }

    private static countRecursiveBranches(code: string): number {
        const funcDefRegex = /(?:void|int|long|double|bool|auto)\s+(\w+)\s*\([^)]*\)\s*\{/g;
        let match;
        let maxBranches = 0;
        while ((match = funcDefRegex.exec(code)) !== null) {
            const funcName = match[1];
            if (funcName === 'main') continue;
            const callRegex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
            // Estimate function body by brace balancing
            let braceCount = 1;
            let idx = match.index + match[0].length;
            let body = '';
            while (idx < code.length && braceCount > 0) {
                if (code[idx] === '{') braceCount++;
                else if (code[idx] === '}') braceCount--;
                body += code[idx];
                idx++;
            }
            const matches = body.match(callRegex);
            if (matches && matches.length > maxBranches) {
                maxBranches = matches.length;
            }
        }
        return maxBranches;
    }

    private static detectHalvingPattern(code: string): boolean {
        return /\/\s*2|\bmid\s*=|\b(r\s*-\s*l)\s*\/\s*2|\b(low\s*\+\s*high)\s*\/\s*2/.test(code);
    }

    private static detectMemoization(code: string): boolean {
        return /\b(memo|dp|cache|table)\[|\bvector<vector<.*>>\s*(dp|memo)|\bmap<.*>\s*(dp|memo)/i.test(code);
    }

    private static detectGreedySorting(code: string): boolean {
        return /std::sort\s*\(.*ratio|\.second|\.first|greater<.*>\s*\)/.test(code) ||
               (code.includes('std::sort') && !this.detectRecursion(code));
    }

    private static detectStateRollback(code: string): boolean {
        // Looks for push_back followed by pop_back or assignment followed by reset
        return (code.includes('.push_back') && code.includes('.pop_back')) ||
               /\[\s*\w+\s*\]\s*=\s*true[\s\S]*?\[\s*\w+\s*\]\s*=\s*false/.test(code) ||
               /\[\s*\w+\s*\]\s*=\s*[^;]+;[\s\S]*?\[\s*\w+\s*\]\s*=\s*0;/.test(code);
    }

    private static detectConstraintPruning(code: string): boolean {
        return /\b(isSafe|isValid|canPlace|isPossible|valid)\s*\(/.test(code);
    }

    private static matchCanonicalProblem(code: string): CanonicalProblem | undefined {
        const lower = code.toLowerCase();
        if (lower.includes('fib') || (lower.includes('n-1') && lower.includes('n-2'))) {
            return CANONICAL_PROBLEMS['fibonacci'];
        }
        if (lower.includes('knap') || (lower.includes('weight') && lower.includes('capacity'))) {
            return lower.includes('ratio') || lower.includes('double')
                ? CANONICAL_PROBLEMS['fractional_knapsack']
                : CANONICAL_PROBLEMS['01_knapsack'];
        }
        if (lower.includes('coin') || lower.includes('amount') || lower.includes('change')) {
            return CANONICAL_PROBLEMS['coin_change'];
        }
        if (lower.includes('queen') || lower.includes('nqueen') || lower.includes('diag')) {
            return CANONICAL_PROBLEMS['n_queens'];
        }
        if (lower.includes('sudoku') || lower.includes('9x9') || lower.includes('grid')) {
            return CANONICAL_PROBLEMS['sudoku_solver'];
        }
        if (lower.includes('merge') && (lower.includes('sort') || lower.includes('mid'))) {
            return CANONICAL_PROBLEMS['merge_sort'];
        }
        if (lower.includes('quick') || lower.includes('pivot') || lower.includes('partition')) {
            return CANONICAL_PROBLEMS['quick_sort'];
        }
        if (lower.includes('lcs') || (lower.includes('subsequence') && lower.includes('string'))) {
            return CANONICAL_PROBLEMS['longest_common_subsequence'];
        }
        if (lower.includes('activity') || lower.includes('schedule') || lower.includes('interval')) {
            return CANONICAL_PROBLEMS['activity_selection'];
        }
        if (lower.includes('dijkstra') || (lower.includes('dist') && lower.includes('priority_queue'))) {
            return CANONICAL_PROBLEMS['dijkstra'];
        }
        if (lower.includes('matrix') && lower.includes('chain')) {
            return CANONICAL_PROBLEMS['matrix_chain_multiplication'];
        }
        return undefined;
    }
}

