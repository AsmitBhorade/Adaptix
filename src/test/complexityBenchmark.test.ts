/**
 * Unit Tests for Complexity Analysis and Benchmark Lab (Module 2)
 */

import * as assert from 'assert';
import { BenchmarkRunner } from '../benchmark/benchmarkRunner';
import { BenchmarkPresets } from '../benchmark/benchmarkPresets';

export function runComplexityBenchmarkTests() {
    console.log('--- Testing Complexity Analysis and Benchmark Lab (Module 2) ---');

    // Test 1: Input Distribution Generator
    {
        const sorted = BenchmarkRunner.generateArray(10, 'sorted');
        for (let i = 0; i < sorted.length - 1; i++) {
            assert.ok(sorted[i] <= sorted[i + 1], 'Sorted array must be non-decreasing');
        }

        const rev = BenchmarkRunner.generateArray(10, 'reverse_sorted');
        for (let i = 0; i < rev.length - 1; i++) {
            assert.ok(rev[i] >= rev[i + 1], 'Reverse sorted array must be non-increasing');
        }

        const dup = BenchmarkRunner.generateArray(50, 'duplicate_heavy');
        const unique = new Set(dup);
        assert.ok(unique.size <= 5, 'Duplicate heavy array should contain at most 5 distinct values');
        console.log('✓ Input Generator: Generates random, sorted, reverse-sorted, and duplicate distributions');
    }

    // Test 2: Sorting Presets Sorting Correctness
    {
        const testInput = [38, 27, 43, 3, 9, 82, 10];
        const expected = [3, 9, 10, 27, 38, 43, 82];

        const bubbleRes = BenchmarkPresets.BUBBLE_SORT.run([...testInput]);
        assert.deepStrictEqual(bubbleRes.result, expected, 'Bubble Sort must correctly sort array');

        const mergeRes = BenchmarkPresets.MERGE_SORT.run([...testInput]);
        assert.deepStrictEqual(mergeRes.result, expected, 'Merge Sort must correctly sort array');

        const quickRes = BenchmarkPresets.QUICK_SORT.run([...testInput]);
        assert.deepStrictEqual(quickRes.result, expected, 'Quick Sort must correctly sort array');
        console.log('✓ Sorting Presets: Bubble, Merge, and QuickSort sort correctly');
    }

    // Test 3: Search Presets Correctness & Big-O Verification
    {
        const arr = [2, 4, 6, 8, 10, 12, 14, 16];
        const linFound = BenchmarkPresets.LINEAR_SEARCH.run({ arr, target: 12 });
        assert.strictEqual(linFound.result, 5, 'Linear search must find index 5');
        assert.strictEqual(linFound.operationsCount, 6, 'Linear search should take 6 comparisons to reach index 5');

        const binFound = BenchmarkPresets.BINARY_SEARCH.run({ arr, target: 12 });
        assert.strictEqual(binFound.result, 5, 'Binary search must find index 5');
        assert.ok(binFound.operationsCount <= 4, 'Binary search must find element in <= log2(8) + 1 comparisons');
        console.log('✓ Search Presets: Linear Search vs Binary Search Big-O operation count verification');
    }

    // Test 4: Fibonacci Presets (Recursive vs Memo vs Tabulation)
    {
        const rec = BenchmarkPresets.FIBONACCI_RECURSIVE.run(10);
        const memo = BenchmarkPresets.FIBONACCI_MEMO.run(10);
        const tab = BenchmarkPresets.FIBONACCI_TABULATION.run(10);

        assert.strictEqual(rec.result, 55, 'Fib(10) must be 55');
        assert.strictEqual(memo.result, 55, 'Memo Fib(10) must be 55');
        assert.strictEqual(tab.result, 55, 'Tab Fib(10) must be 55');

        // Verify exponential vs linear operation counts
        assert.ok(rec.operationsCount > 100, `Recursive fib(10) should have > 100 calls, had: ${rec.operationsCount}`);
        assert.ok(tab.operationsCount <= 12, `Tabulation fib(10) should have <= 12 operations, had: ${tab.operationsCount}`);
        console.log(`✓ Fibonacci Presets: Correctness + Exponential operations (${rec.operationsCount}) vs DP Linear operations (${tab.operationsCount})`);
    }

    // Test 5: Multi-Size Sorting Benchmark Suite Execution
    {
        const suiteResult = BenchmarkRunner.runSortingBenchmark('random', [50, 100, 200]);
        assert.strictEqual(suiteResult.series.length, 3, 'Must contain 3 series (Bubble, Merge, Quick)');
        assert.strictEqual(suiteResult.series[0].dataPoints.length, 3, 'Each series must have 3 data points');
        assert.ok(suiteResult.fastestAlgorithm.length > 0, 'Fastest algorithm must be identified');
        console.log(`✓ Benchmark Runner: Multi-size empirical benchmark with measured times (${suiteResult.fastestAlgorithm} proved fastest)`);
    }
}

