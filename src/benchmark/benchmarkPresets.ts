/**
 * Benchmark Presets and Implementations
 * 
 * Provides pure, sandboxed implementations of canonical algorithmic contenders
 * for empirical benchmarking against varying input distributions and sizes.
 */

export type InputDistribution = 'random' | 'sorted' | 'reverse_sorted' | 'duplicate_heavy' | 'custom';

export interface BenchmarkAlgorithmDef {
    id: string;
    name: string;
    category: 'Sorting' | 'Searching' | 'Fibonacci' | 'Graph';
    theoreticalComplexity: {
        best: string;
        average: string;
        worst: string;
        space: string;
    };
    run: (input: any) => { result: any; operationsCount: number };
}

export class BenchmarkPresets {
    // ─────────────── SORTING SUITE ───────────────
    public static readonly BUBBLE_SORT: BenchmarkAlgorithmDef = {
        id: 'bubble_sort',
        name: 'Bubble Sort',
        category: 'Sorting',
        theoreticalComplexity: {
            best: 'O(n)',
            average: 'O(n^2)',
            worst: 'O(n^2)',
            space: 'O(1)'
        },
        run: (input: number[]) => {
            const arr = [...input];
            const n = arr.length;
            let ops = 0;
            for (let i = 0; i < n - 1; i++) {
                let swapped = false;
                for (let j = 0; j < n - i - 1; j++) {
                    ops++;
                    if (arr[j] > arr[j + 1]) {
                        const tmp = arr[j];
                        arr[j] = arr[j + 1];
                        arr[j + 1] = tmp;
                        swapped = true;
                    }
                }
                if (!swapped) break;
            }
            return { result: arr, operationsCount: ops };
        }
    };

    public static readonly MERGE_SORT: BenchmarkAlgorithmDef = {
        id: 'merge_sort',
        name: 'Merge Sort',
        category: 'Sorting',
        theoreticalComplexity: {
            best: 'O(n log n)',
            average: 'O(n log n)',
            worst: 'O(n log n)',
            space: 'O(n)'
        },
        run: (input: number[]) => {
            const arr = [...input];
            let ops = 0;

            const merge = (l: number, m: number, r: number) => {
                const left = arr.slice(l, m + 1);
                const right = arr.slice(m + 1, r + 1);
                let i = 0, j = 0, k = l;
                while (i < left.length && j < right.length) {
                    ops++;
                    if (left[i] <= right[j]) arr[k++] = left[i++];
                    else arr[k++] = right[j++];
                }
                while (i < left.length) { ops++; arr[k++] = left[i++]; }
                while (j < right.length) { ops++; arr[k++] = right[j++]; }
            };

            const sort = (l: number, r: number) => {
                if (l >= r) return;
                const m = Math.floor(l + (r - l) / 2);
                sort(l, m);
                sort(m + 1, r);
                merge(l, m, r);
            };

            sort(0, arr.length - 1);
            return { result: arr, operationsCount: ops };
        }
    };

    public static readonly QUICK_SORT: BenchmarkAlgorithmDef = {
        id: 'quick_sort',
        name: 'Quick Sort (Naive Last Pivot)',
        category: 'Sorting',
        theoreticalComplexity: {
            best: 'O(n log n)',
            average: 'O(n log n)',
            worst: 'O(n^2)',
            space: 'O(log n)'
        },
        run: (input: number[]) => {
            const arr = [...input];
            let ops = 0;

            const partition = (low: number, high: number): number => {
                const pivot = arr[high];
                let i = low - 1;
                for (let j = low; j < high; j++) {
                    ops++;
                    if (arr[j] <= pivot) {
                        i++;
                        const tmp = arr[i];
                        arr[i] = arr[j];
                        arr[j] = tmp;
                    }
                }
                const tmp = arr[i + 1];
                arr[i + 1] = arr[high];
                arr[high] = tmp;
                return i + 1;
            };

            const sort = (low: number, high: number) => {
                if (low < high) {
                    const pi = partition(low, high);
                    sort(low, pi - 1);
                    sort(pi + 1, high);
                }
            };

            sort(0, arr.length - 1);
            return { result: arr, operationsCount: ops };
        }
    };

    // ─────────────── SEARCHING SUITE ───────────────
    public static readonly LINEAR_SEARCH: BenchmarkAlgorithmDef = {
        id: 'linear_search',
        name: 'Linear Search',
        category: 'Searching',
        theoreticalComplexity: {
            best: 'O(1)',
            average: 'O(n)',
            worst: 'O(n)',
            space: 'O(1)'
        },
        run: (input: { arr: number[]; target: number }) => {
            const { arr, target } = input;
            let ops = 0;
            let foundIdx = -1;
            for (let i = 0; i < arr.length; i++) {
                ops++;
                if (arr[i] === target) {
                    foundIdx = i;
                    break;
                }
            }
            return { result: foundIdx, operationsCount: ops };
        }
    };

    public static readonly BINARY_SEARCH: BenchmarkAlgorithmDef = {
        id: 'binary_search',
        name: 'Binary Search',
        category: 'Searching',
        theoreticalComplexity: {
            best: 'O(1)',
            average: 'O(log n)',
            worst: 'O(log n)',
            space: 'O(1)'
        },
        run: (input: { arr: number[]; target: number }) => {
            const { arr, target } = input;
            let ops = 0;
            let low = 0, high = arr.length - 1;
            let foundIdx = -1;
            while (low <= high) {
                ops++;
                const mid = Math.floor(low + (high - low) / 2);
                if (arr[mid] === target) {
                    foundIdx = mid;
                    break;
                } else if (arr[mid] < target) {
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            return { result: foundIdx, operationsCount: ops };
        }
    };

    // ─────────────── FIBONACCI SUITE ───────────────
    public static readonly FIBONACCI_RECURSIVE: BenchmarkAlgorithmDef = {
        id: 'fib_recursive',
        name: 'Recursive Fibonacci (Exponential)',
        category: 'Fibonacci',
        theoreticalComplexity: {
            best: 'O(2^n)',
            average: 'O(2^n)',
            worst: 'O(2^n)',
            space: 'O(n)'
        },
        run: (n: number) => {
            // Cap at 32 to prevent catastrophic call stack freeze
            const safeN = Math.min(n, 32);
            let ops = 0;
            const fib = (k: number): number => {
                ops++;
                if (k <= 1) return k;
                return fib(k - 1) + fib(k - 2);
            };
            return { result: fib(safeN), operationsCount: ops };
        }
    };

    public static readonly FIBONACCI_MEMO: BenchmarkAlgorithmDef = {
        id: 'fib_memo',
        name: 'Memoized Fibonacci (Top-Down DP)',
        category: 'Fibonacci',
        theoreticalComplexity: {
            best: 'O(n)',
            average: 'O(n)',
            worst: 'O(n)',
            space: 'O(n)'
        },
        run: (n: number) => {
            let ops = 0;
            const memo: number[] = new Array(n + 1).fill(-1);
            const fib = (k: number): number => {
                ops++;
                if (k <= 1) return k;
                if (memo[k] !== -1) return memo[k];
                memo[k] = fib(k - 1) + fib(k - 2);
                return memo[k];
            };
            return { result: fib(n), operationsCount: ops };
        }
    };

    public static readonly FIBONACCI_TABULATION: BenchmarkAlgorithmDef = {
        id: 'fib_tabulation',
        name: 'Tabulation Fibonacci (Bottom-Up DP)',
        category: 'Fibonacci',
        theoreticalComplexity: {
            best: 'O(n)',
            average: 'O(n)',
            worst: 'O(n)',
            space: 'O(1)'
        },
        run: (n: number) => {
            let ops = 0;
            if (n <= 1) return { result: n, operationsCount: 1 };
            let prev2 = 0, prev1 = 1;
            for (let i = 2; i <= n; i++) {
                ops++;
                const curr = prev1 + prev2;
                prev2 = prev1;
                prev1 = curr;
            }
            return { result: prev1, operationsCount: ops };
        }
    };

    // ─────────────── GRAPH SUITE ───────────────
    public static readonly GRAPH_BFS: BenchmarkAlgorithmDef = {
        id: 'graph_bfs',
        name: 'Breadth-First Search (BFS)',
        category: 'Graph',
        theoreticalComplexity: {
            best: 'O(V + E)',
            average: 'O(V + E)',
            worst: 'O(V + E)',
            space: 'O(V)'
        },
        run: (input: { adj: number[][]; start: number }) => {
            const { adj, start } = input;
            const visited = new Set<number>();
            const queue: number[] = [start];
            visited.add(start);
            let ops = 0;
            const order: number[] = [];

            while (queue.length > 0) {
                const u = queue.shift()!;
                order.push(u);
                for (const v of adj[u] ?? []) {
                    ops++;
                    if (!visited.has(v)) {
                        visited.add(v);
                        queue.push(v);
                    }
                }
            }
            return { result: order, operationsCount: ops };
        }
    };

    public static readonly GRAPH_DFS: BenchmarkAlgorithmDef = {
        id: 'graph_dfs',
        name: 'Depth-First Search (DFS)',
        category: 'Graph',
        theoreticalComplexity: {
            best: 'O(V + E)',
            average: 'O(V + E)',
            worst: 'O(V + E)',
            space: 'O(V)'
        },
        run: (input: { adj: number[][]; start: number }) => {
            const { adj, start } = input;
            const visited = new Set<number>();
            let ops = 0;
            const order: number[] = [];

            const dfs = (u: number) => {
                visited.add(u);
                order.push(u);
                for (const v of adj[u] ?? []) {
                    ops++;
                    if (!visited.has(v)) {
                        dfs(v);
                    }
                }
            };

            dfs(start);
            return { result: order, operationsCount: ops };
        }
    };

    public static readonly GRAPH_DIJKSTRA: BenchmarkAlgorithmDef = {
        id: 'graph_dijkstra',
        name: "Dijkstra's Shortest Path",
        category: 'Graph',
        theoreticalComplexity: {
            best: 'O((V + E) log V)',
            average: 'O((V + E) log V)',
            worst: 'O((V + E) log V)',
            space: 'O(V + E)'
        },
        run: (input: { adj: { to: number; weight: number }[][]; start: number }) => {
            const { adj, start } = input;
            const n = adj.length;
            const dist: number[] = new Array(n).fill(Infinity);
            dist[start] = 0;
            let ops = 0;

            // Simple Priority Queue min-heap simulation
            const pq: { node: number; dist: number }[] = [{ node: start, dist: 0 }];

            while (pq.length > 0) {
                // Extract min
                pq.sort((a, b) => a.dist - b.dist);
                const { node: u, dist: d } = pq.shift()!;
                ops++;

                if (d > dist[u]) continue;

                for (const edge of adj[u] ?? []) {
                    ops++;
                    const { to: v, weight: w } = edge;
                    if (dist[u] + w < dist[v]) {
                        dist[v] = dist[u] + w;
                        pq.push({ node: v, dist: dist[v] });
                    }
                }
            }
            return { result: dist, operationsCount: ops };
        }
    };
}

