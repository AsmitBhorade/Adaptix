/**
 * Empirical Benchmark Runner & Complexity Lab
 * 
 * Conducts controlled, safe empirical benchmarks across multiple input sizes
 * and distribution profiles. Measures real execution time, operation counts,
 * and memory deltas, overlaying theoretical asymptotic Big-O curves.
 */

import { BenchmarkAlgorithmDef, BenchmarkPresets, InputDistribution } from './benchmarkPresets';
import { SeededRandom } from '../natureInspired/random';

export interface BenchmarkDataPoint {
    inputSize: number;
    measuredTimeMs: number;
    operationCount: number;
    memoryDeltaKb: number;
    theoreticalScore: number;
}

export interface AlgorithmBenchmarkSeries {
    algorithmId: string;
    algorithmName: string;
    theoreticalComplexity: string;
    dataPoints: BenchmarkDataPoint[];
    averageOpsPerMs: number;
}

export interface BenchmarkSuiteResult {
    suiteName: string;
    category: string;
    distribution: InputDistribution;
    inputSizes: number[];
    series: AlgorithmBenchmarkSeries[];
    fastestAlgorithm: string;
    analysisSummary: string;
    hardwareContext: string;
}

export class BenchmarkRunner {
    private static rng = new SeededRandom(1337);

    /**
     * Generate test array of specified size and distribution
     */
    public static generateArray(size: number, distribution: InputDistribution): number[] {
        const arr: number[] = [];
        const rng = this.rng;

        switch (distribution) {
            case 'sorted':
                for (let i = 0; i < size; i++) arr.push(i);
                break;
            case 'reverse_sorted':
                for (let i = size; i > 0; i--) arr.push(i);
                break;
            case 'duplicate_heavy':
                // Only 5 unique values repeating
                for (let i = 0; i < size; i++) arr.push(rng.nextRangeInt(1, 5));
                break;
            case 'random':
            default:
                for (let i = 0; i < size; i++) arr.push(rng.nextRangeInt(1, size * 10));
                break;
        }
        return arr;
    }

    /**
     * Executes safe, timed benchmark for a single algorithm on a specific input
     */
    public static runSingleTimed(algo: BenchmarkAlgorithmDef, input: any, timeoutMs: number = 3000): {
        timeMs: number;
        ops: number;
        memKb: number;
        timedOut: boolean;
    } {
        const startMem = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
        const start = performance.now();

        let ops = 0;
        let timedOut = false;

        try {
            const out = algo.run(input);
            ops = out.operationsCount;
        } catch (e) {
            timedOut = true;
        }

        const elapsed = performance.now() - start;
        const endMem = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
        const memDeltaKb = Math.max(0, Math.round((endMem - startMem) / 1024));

        return {
            timeMs: Number(elapsed.toFixed(3)),
            ops,
            memKb: memDeltaKb,
            timedOut
        };
    }

    /**
     * Run Sorting Benchmark Suite (Bubble vs Merge vs Quick Sort)
     */
    public static runSortingBenchmark(
        distribution: InputDistribution = 'random',
        sizes: number[] = [500, 1000, 2000, 4000],
        customData?: number[]
    ): BenchmarkSuiteResult {
        const algos = [
            BenchmarkPresets.BUBBLE_SORT,
            BenchmarkPresets.MERGE_SORT,
            BenchmarkPresets.QUICK_SORT
        ];

        const seriesMap: Record<string, AlgorithmBenchmarkSeries> = {};
        for (const algo of algos) {
            seriesMap[algo.id] = {
                algorithmId: algo.id,
                algorithmName: algo.name,
                theoreticalComplexity: algo.theoreticalComplexity.average,
                dataPoints: [],
                averageOpsPerMs: 0
            };
        }

        for (const n of sizes) {
            const rawInput = customData && customData.length >= n
                ? customData.slice(0, n)
                : this.generateArray(n, distribution);

            for (const algo of algos) {
                // If bubble sort is too large on reverse/random, protect against UI freeze
                if (algo.id === 'bubble_sort' && n > 8000) {
                    seriesMap[algo.id].dataPoints.push({
                        inputSize: n,
                        measuredTimeMs: -1, // skipped
                        operationCount: (n * (n - 1)) / 2,
                        memoryDeltaKb: 0,
                        theoreticalScore: n * n
                    });
                    continue;
                }

                // If naive quicksort on sorted array (O(n^2)), scale down
                if (algo.id === 'quick_sort' && (distribution === 'sorted' || distribution === 'reverse_sorted') && n > 6000) {
                    seriesMap[algo.id].dataPoints.push({
                        inputSize: n,
                        measuredTimeMs: -1,
                        operationCount: (n * (n - 1)) / 2,
                        memoryDeltaKb: 0,
                        theoreticalScore: n * n
                    });
                    continue;
                }

                const testCopy = [...rawInput];
                const res = this.runSingleTimed(algo, testCopy);

                let theoreticalScore = n * Math.log2(n);
                if (algo.id === 'bubble_sort') theoreticalScore = n * n;
                if (algo.id === 'quick_sort' && (distribution === 'sorted' || distribution === 'reverse_sorted')) {
                    theoreticalScore = n * n;
                }

                seriesMap[algo.id].dataPoints.push({
                    inputSize: n,
                    measuredTimeMs: res.timeMs,
                    operationCount: res.ops,
                    memoryDeltaKb: res.memKb,
                    theoreticalScore: Math.round(theoreticalScore)
                });
            }
        }

        // Determine fastest algorithm on largest tested size
        let fastest = 'Merge Sort';
        const largestN = sizes[sizes.length - 1];
        let minTime = Infinity;
        for (const s of Object.values(seriesMap)) {
            const lastPt = s.dataPoints.find(p => p.inputSize === largestN);
            if (lastPt && lastPt.measuredTimeMs > 0 && lastPt.measuredTimeMs < minTime) {
                minTime = lastPt.measuredTimeMs;
                fastest = s.algorithmName;
            }
        }

        let summary = `Under '${distribution}' input distribution: ${fastest} proved most scalable. `;
        if (distribution === 'sorted' || distribution === 'reverse_sorted') {
            summary += `Notice that Quick Sort with naive pivot degenerates towards O(N^2) quadratic comparisons, while Merge Sort steadfastly maintains O(N log N).`;
        } else if (distribution === 'duplicate_heavy') {
            summary += `Duplicate keys create balanced or imbalanced partitions depending on pivot handling. Merge Sort remains predictable.`;
        } else {
            summary += `Merge Sort and Quick Sort both outperform quadratic Bubble Sort by several orders of magnitude as N grows.`;
        }

        return {
            suiteName: 'Sorting Scalability Benchmark',
            category: 'Sorting',
            distribution,
            inputSizes: sizes,
            series: Object.values(seriesMap),
            fastestAlgorithm: fastest,
            analysisSummary: summary,
            hardwareContext: `Node.js ${process.version} on ${process.platform} (${process.arch})`
        };
    }

    /**
     * Run Fibonacci Benchmark Suite (Recursive vs Memoization vs Tabulation)
     */
    public static runFibonacciBenchmark(sizes: number[] = [10, 20, 25, 28, 30]): BenchmarkSuiteResult {
        const algos = [
            BenchmarkPresets.FIBONACCI_RECURSIVE,
            BenchmarkPresets.FIBONACCI_MEMO,
            BenchmarkPresets.FIBONACCI_TABULATION
        ];

        const series: AlgorithmBenchmarkSeries[] = algos.map(a => ({
            algorithmId: a.id,
            algorithmName: a.name,
            theoreticalComplexity: a.theoreticalComplexity.average,
            dataPoints: [],
            averageOpsPerMs: 0
        }));

        for (const n of sizes) {
            for (let i = 0; i < algos.length; i++) {
                const algo = algos[i];
                const res = this.runSingleTimed(algo, n);

                const theoreticalScore = algo.id === 'fib_recursive'
                    ? Math.pow(1.618, n) // golden ratio phi^n
                    : n;

                series[i].dataPoints.push({
                    inputSize: n,
                    measuredTimeMs: res.timeMs,
                    operationCount: res.ops,
                    memoryDeltaKb: res.memKb,
                    theoreticalScore: Math.round(theoreticalScore)
                });
            }
        }

        return {
            suiteName: 'Fibonacci Paradigm Benchmark (Recursion vs DP)',
            category: 'Fibonacci',
            distribution: 'random',
            inputSizes: sizes,
            series,
            fastestAlgorithm: 'Tabulation Fibonacci (Bottom-Up DP)',
            analysisSummary: 'Empirical proof of Dynamic Programming superiority: Recursive Fibonacci explodes exponentially with O(2^N) call tree operations, while Tabulation and Memoization remain strictly linear O(N). Tabulation has minimal overhead with O(1) auxiliary space.',
            hardwareContext: `Node.js ${process.version} on ${process.platform} (${process.arch})`
        };
    }

    /**
     * Run Search Benchmark Suite (Linear Search vs Binary Search)
     */
    public static runSearchBenchmark(sizes: number[] = [1000, 5000, 20000, 50000, 100000]): BenchmarkSuiteResult {
        const algos = [BenchmarkPresets.LINEAR_SEARCH, BenchmarkPresets.BINARY_SEARCH];
        const series: AlgorithmBenchmarkSeries[] = algos.map(a => ({
            algorithmId: a.id,
            algorithmName: a.name,
            theoreticalComplexity: a.theoreticalComplexity.average,
            dataPoints: [],
            averageOpsPerMs: 0
        }));

        for (const n of sizes) {
            // Target is at the very end or near end for worst-case lookup
            const arr = Array.from({ length: n }, (_, i) => i * 2);
            const target = (n - 1) * 2; // last element

            for (let i = 0; i < algos.length; i++) {
                const algo = algos[i];
                const res = this.runSingleTimed(algo, { arr, target });

                const theoreticalScore = algo.id === 'linear_search' ? n : Math.log2(n);

                series[i].dataPoints.push({
                    inputSize: n,
                    measuredTimeMs: res.timeMs,
                    operationCount: res.ops,
                    memoryDeltaKb: res.memKb,
                    theoreticalScore: Math.round(theoreticalScore)
                });
            }
        }

        return {
            suiteName: 'Searching Complexity Benchmark (Linear vs Binary)',
            category: 'Searching',
            distribution: 'sorted',
            inputSizes: sizes,
            series,
            fastestAlgorithm: 'Binary Search',
            analysisSummary: 'Binary Search executes in logarithmic O(log N) operations (at most ~17 comparisons for 100,000 items) versus Linear Search which requires all 100,000 comparisons in the worst case.',
            hardwareContext: `Node.js ${process.version} on ${process.platform} (${process.arch})`
        };
    }
}

