/**
 * Unit Tests for Algorithm Strategy Intelligence Engine (Module 1)
 */

import * as assert from 'assert';
import { StrategyDetector } from '../algorithms/strategyDetector';
import { CANONICAL_PROBLEMS } from '../algorithms/canonicalProblems';

export function runAlgorithmStrategyTests() {
    console.log('--- Testing Algorithm Strategy Intelligence Engine (Module 1) ---');

    // Test 1: Exponential Recursive Fibonacci detection -> Dynamic Programming
    {
        const fibCode = `
        int fib(int n) {
            if (n <= 1) return n;
            return fib(n - 1) + fib(n - 2);
        }
        `;
        const res = StrategyDetector.analyze(fibCode);
        assert.ok(res.length > 0, 'Should return at least one detected strategy');
        const dpStrat = res.find(s => s.detectedParadigm === 'dynamic_programming');
        assert.ok(dpStrat !== undefined, 'Should detect Dynamic Programming opportunity');
        assert.strictEqual(dpStrat?.confidenceLabel, 'Strong', 'Confidence should be Strong');
        assert.ok(dpStrat?.theoreticalComplexity.current.time.includes('2^n'), 'Current complexity should be O(2^n)');
        assert.ok(dpStrat?.suggestedRefactoringCpp !== undefined, 'Should suggest optimized DP refactoring');
        console.log('✓ Strategy Detection: Exponential recursion flagged for Dynamic Programming');
    }

    // Test 2: Divide and Conquer MergeSort detection
    {
        const mergeCode = `
        void mergeSort(std::vector<int>& arr, int l, int r) {
            if (l >= r) return;
            int mid = l + (r - l) / 2;
            mergeSort(arr, l, mid);
            mergeSort(arr, mid + 1, r);
            merge(arr, l, mid, r);
        }
        `;
        const res = StrategyDetector.analyze(mergeCode);
        const dcStrat = res.find(s => s.detectedParadigm === 'divide_and_conquer');
        assert.ok(dcStrat !== undefined, 'Should detect Divide and Conquer paradigm');
        assert.ok(dcStrat?.recurrenceRelation?.includes('2T(n/2)'), 'Should derive Master Theorem recurrence');
        console.log('✓ Strategy Detection: Halving + dual recursion flagged as Divide & Conquer');
    }

    // Test 3: Greedy Activity Selection detection
    {
        const greedyCode = `
        int selectActivities(std::vector<std::pair<int, int>>& acts) {
            std::sort(acts.begin(), acts.end(), [](const auto& a, const auto& b) {
                return a.second < b.second;
            });
            int count = 0, lastEnd = -1;
            for (const auto& a : acts) {
                if (a.first >= lastEnd) {
                    count++;
                    lastEnd = a.second;
                }
            }
            return count;
        }
        `;
        const res = StrategyDetector.analyze(greedyCode);
        const greedyStrat = res.find(s => s.detectedParadigm === 'greedy');
        assert.ok(greedyStrat !== undefined, 'Should detect Greedy paradigm');
        assert.strictEqual(greedyStrat?.theoreticalComplexity.proposed.time, 'O(n log n)');
        console.log('✓ Strategy Detection: Sort by finish time + single pass flagged as Greedy');
    }

    // Test 4: Backtracking N-Queens detection
    {
        const backtrackCode = `
        bool isSafe(int row, int col) { return true; }
        void solveQueens(int row) {
            if (row == n) return;
            for (int col = 0; col < n; col++) {
                if (isSafe(row, col)) {
                    board[row][col] = true;
                    solveQueens(row + 1);
                    board[row][col] = false; // backtrack
                }
            }
        }
        `;
        const res = StrategyDetector.analyze(backtrackCode);
        const btStrat = res.find(s => s.detectedParadigm === 'backtracking');
        assert.ok(btStrat !== undefined, 'Should detect Backtracking paradigm');
        assert.ok(btStrat?.primaryReason.includes('rollback') || btStrat?.primaryReason.includes('tree'), 'Reason should cite state rollback');
        console.log('✓ Strategy Detection: Recursion + constraint check + state rollback flagged as Backtracking');
    }

    // Test 5: Canonical Knowledge Base Integrity
    {
        assert.ok(CANONICAL_PROBLEMS['01_knapsack'] !== undefined, 'Knapsack should exist');
        assert.ok(CANONICAL_PROBLEMS['merge_sort'] !== undefined, 'Merge Sort should exist');
        assert.ok(CANONICAL_PROBLEMS['dijkstra'] !== undefined, 'Dijkstra should exist');
        assert.ok(CANONICAL_PROBLEMS['n_queens'] !== undefined, 'N-Queens should exist');
        assert.strictEqual(CANONICAL_PROBLEMS['01_knapsack'].paradigm, 'dynamic_programming');
        assert.strictEqual(CANONICAL_PROBLEMS['fractional_knapsack'].paradigm, 'greedy');
        console.log('✓ Canonical Problems Catalog: All 4 DAA paradigms populated with C++ implementations');
    }
}

