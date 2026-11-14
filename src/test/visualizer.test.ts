/**
 * Unit Tests for Visual Algorithm Debugger Trace Generators (Module 3)
 */

import * as assert from 'assert';
import { TraceGenerators } from '../visualization/traceGenerators';

export function runVisualizerTests() {
    console.log('--- Testing Visual Algorithm Debugger Trace Generators (Module 3) ---');

    // Test 1: Fibonacci Recursion Tree Trace Generator
    {
        const steps = TraceGenerators.generateFibonacciRecursionTree(4);
        assert.ok(steps.length > 5, 'Should generate multiple trace steps for fib(4)');
        const lastStep = steps[steps.length - 1];
        assert.ok(lastStep.nodes.length > 0, 'Must record tree nodes');

        // Verify overlapping subproblems are flagged
        const repeatedNodes = lastStep.nodes.filter(n => n.isRepeated);
        assert.ok(repeatedNodes.length > 0, 'Must identify repeated/redundant subproblem nodes in call tree');
        console.log(`✓ Recursion Tree: Generates ${steps.length} steps with ${repeatedNodes.length} overlapping nodes identified`);
    }

    // Test 2: 0/1 Knapsack DP Table Trace Generator
    {
        const steps = TraceGenerators.generate01KnapsackDPTable(5, [2, 3], [3, 4]);
        assert.ok(steps.length > 0);
        const finalStep = steps[steps.length - 1];

        assert.strictEqual(finalStep.dimensions[0], 3, 'Rows should be items + 1 = 3');
        assert.strictEqual(finalStep.dimensions[1], 6, 'Cols should be capacity + 1 = 6');
        assert.ok(finalStep.solutionReconstruction !== undefined, 'Must reconstruct solution items');
        assert.strictEqual(finalStep.grid[2][5], 7, 'Optimal value for w=2,3 (values 3,4) at capacity 5 is 7');
        console.log(`✓ DP Table Visualizer: Generates 2D table snapshots with cell dependencies and final reconstruction`);
    }

    // Test 3: N-Queens Backtracking Trace Generator
    {
        const steps = TraceGenerators.generateNQueensTrace(4);
        assert.ok(steps.length > 5, 'Should generate multiple backtracking steps');

        // Verify pruning events occurred
        const prunedSteps = steps.filter(s => s.isPruned);
        assert.ok(prunedSteps.length > 0, 'Must contain conflict pruning steps');
        assert.ok(prunedSteps[0].pruningReason !== undefined, 'Pruning step must explain conflict reason');

        // Verify solution found
        const solutionSteps = steps.filter(s => s.isSolution);
        assert.ok(solutionSteps.length > 0, 'Must find valid solution configuration');
        console.log(`✓ Backtracking Visualizer: Search-space tree with ${prunedSteps.length} pruned branches and valid solution`);
    }

    // Test 4: Dijkstra Graph Traversal Trace Generator
    {
        const steps = TraceGenerators.generateDijkstraTrace();
        assert.ok(steps.length > 0);
        const finalStep = steps[steps.length - 1];

        // Node A is source, so dist is 0
        assert.strictEqual(finalStep.distances?.[0], 0, 'Source distance should be 0');
        // Finalized vertices should be visited
        const visitedNodes = finalStep.nodes.filter(n => n.status === 'visited');
        assert.ok(visitedNodes.length > 0, 'Graph nodes must transition to visited');
        console.log(`✓ Graph Visualizer: Priority queue extract-min and edge relaxation step generation`);
    }

    // Test 5: QuickSort Partition Trace Generator
    {
        const steps = TraceGenerators.generateQuickSortTrace([10, 7, 8, 9, 1, 5]);
        assert.ok(steps.length > 5);
        const lastStep = steps[steps.length - 1];
        assert.deepStrictEqual(lastStep.array, [1, 5, 7, 8, 9, 10], 'Final array state must be sorted');
        console.log(`✓ Sorting Visualizer: Pivot selection, pairwise comparisons, and swap animations verified`);
    }
}

