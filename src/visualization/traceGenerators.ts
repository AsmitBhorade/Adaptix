/**
 * Visual Algorithm Debugger Trace Generators
 * 
 * Generates structured, deterministic step-by-step execution traces from
 * actual algorithm runs to drive interactive animations in the Webview:
 * - Recursion Tree Visualizer (parent-child links, overlapping subproblem detection)
 * - Dynamic Programming Visualizer (1D/2D grid progression, dependency arrows, cell math)
 * - Backtracking Visualizer (search-space branching, candidate attempts, pruning, undo)
 * - Graph Algorithm Visualizer (BFS queue, DFS call stack, Dijkstra distance updates)
 * - Sorting & Searching Visualizer (comparison highlights, element swaps, partition bounds)
 */

export type VisualizerMode = 'recursion_tree' | 'dp_table' | 'backtracking' | 'graph' | 'sorting_searching';

export interface BaseTraceStep {
    stepIndex: number;
    description: string;
    actionType: string;
    explanation: string;
}

// ─────────────── 1. RECURSION TREE ───────────────
export interface RecursionTreeNode {
    id: string;
    label: string;
    args: any[];
    parentId: string | null;
    depth: number;
    returnValue: any | null;
    isRepeated: boolean;
    status: 'calling' | 'computed' | 'pruned';
}

export interface RecursionTreeTraceStep extends BaseTraceStep {
    activeNodeId: string;
    nodes: RecursionTreeNode[];
    callStack: string[];
}

// ─────────────── 2. DP TABLE ───────────────
export interface DPTableTraceStep extends BaseTraceStep {
    dimensions: [number, number]; // rows, cols
    rowHeaders: string[];
    colHeaders: string[];
    grid: (number | string)[][];
    activeCell: [number, number] | null;
    dependencyCells: [number, number][];
    formulaApplied: string;
    solutionReconstruction?: [number, number][];
}

// ─────────────── 3. BACKTRACKING ───────────────
export interface BacktrackingTraceStep extends BaseTraceStep {
    boardState: any;
    decisionPath: string[];
    currentChoice: string;
    isPruned: boolean;
    pruningReason?: string;
    isSolution: boolean;
}

// ─────────────── 4. GRAPH ───────────────
export interface GraphNodeState {
    id: number;
    label: string;
    status: 'unvisited' | 'visiting' | 'visited' | 'in_path';
    distance?: number;
}

export interface GraphEdgeState {
    u: number;
    v: number;
    weight?: number;
    status: 'idle' | 'exploring' | 'relaxed' | 'tree_edge';
}

export interface GraphTraceStep extends BaseTraceStep {
    nodes: GraphNodeState[];
    edges: GraphEdgeState[];
    frontier: number[]; // queue or stack contents
    distances?: Record<number, number>;
    currentVertex: number | null;
}

// ─────────────── 5. SORTING & SEARCHING ───────────────
export interface SortingTraceStep extends BaseTraceStep {
    array: number[];
    comparingIndices: number[];
    swappedIndices: number[];
    sortedIndices: number[];
    pivotIndex?: number;
    searchRange?: [number, number];
}

export class TraceGenerators {
    // ─────────────────────────────────────────────────────────────
    // A. RECURSION TREE: Fibonacci
    // ─────────────────────────────────────────────────────────────
    public static generateFibonacciRecursionTree(n: number = 4): RecursionTreeTraceStep[] {
        const steps: RecursionTreeTraceStep[] = [];
        const nodes: RecursionTreeNode[] = [];
        const nodeMap = new Map<string, RecursionTreeNode>();
        const seenArgs = new Map<number, string[]>();
        let stepCount = 0;
        let counter = 0;

        const recordStep = (activeId: string, desc: string, action: string, expl: string) => {
            steps.push({
                stepIndex: stepCount++,
                description: desc,
                actionType: action,
                explanation: expl,
                activeNodeId: activeId,
                nodes: JSON.parse(JSON.stringify(nodes)),
                callStack: []
            });
        };

        const fib = (k: number, parentId: string | null, depth: number): number => {
            const nodeId = `node_${counter++}`;
            const isOverlap = seenArgs.has(k) && (seenArgs.get(k)!.length > 0);
            
            const node: RecursionTreeNode = {
                id: nodeId,
                label: `fib(${k})`,
                args: [k],
                parentId,
                depth,
                returnValue: null,
                isRepeated: isOverlap,
                status: 'calling'
            };

            nodes.push(node);
            nodeMap.set(nodeId, node);

            if (!seenArgs.has(k)) seenArgs.set(k, []);
            seenArgs.get(k)!.push(nodeId);

            recordStep(
                nodeId,
                `Call fib(${k})`,
                'function_call',
                isOverlap 
                    ? `⚠️ REDUNDANT SUBPROBLEM: fib(${k}) has already been evaluated elsewhere in the tree! Without memoization, this entire subtree will be needlessly recomputed.`
                    : `Evaluating fib(${k}) at depth ${depth}.`
            );

            let res = 0;
            if (k <= 1) {
                res = k;
                node.returnValue = res;
                node.status = 'computed';
                recordStep(
                    nodeId,
                    `Base case reached: fib(${k}) = ${res}`,
                    'base_case',
                    `Base condition reached (n <= 1). Returning ${res}.`
                );
            } else {
                const left = fib(k - 1, nodeId, depth + 1);
                const right = fib(k - 2, nodeId, depth + 1);
                res = left + right;
                node.returnValue = res;
                node.status = 'computed';
                recordStep(
                    nodeId,
                    `Computed fib(${k}) = ${left} + ${right} = ${res}`,
                    'return_value',
                    `Combined subproblem returns: fib(${k-1}) [${left}] + fib(${k-2}) [${right}] = ${res}.`
                );
            }
            return res;
        };

        fib(Math.min(n, 5), null, 0);
        return steps;
    }

    // ─────────────────────────────────────────────────────────────
    // B. DYNAMIC PROGRAMMING: 0/1 Knapsack & Coin Change
    // ─────────────────────────────────────────────────────────────
    public static generate01KnapsackDPTable(
        W: number = 7,
        wt: number[] = [1, 3, 4, 5],
        val: number[] = [1, 4, 5, 7]
    ): DPTableTraceStep[] {
        const steps: DPTableTraceStep[] = [];
        const n = wt.length;
        const rows = n + 1;
        const cols = W + 1;

        const rowHeaders = ['0 (None)', ...wt.map((w, i) => `Item ${i + 1} (w:${w}, v:${val[i]})`)];
        const colHeaders = Array.from({ length: cols }, (_, w) => `Cap ${w}`);

        // Initialize grid
        const grid: (number | string)[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
        let stepCount = 0;

        steps.push({
            stepIndex: stepCount++,
            description: 'Initialize DP Table with zeros for 0 items / 0 capacity',
            actionType: 'init',
            explanation: 'dp[i][w] represents maximum value obtainable with first i items and capacity w.',
            dimensions: [rows, cols],
            rowHeaders,
            colHeaders,
            grid: JSON.parse(JSON.stringify(grid)),
            activeCell: null,
            dependencyCells: [],
            formulaApplied: 'dp[0][w] = 0, dp[i][0] = 0'
        });

        for (let i = 1; i <= n; i++) {
            const itemWeight = wt[i - 1];
            const itemValue = val[i - 1];

            for (let w = 1; w <= W; w++) {
                const depCells: [number, number][] = [[i - 1, w]];
                let formula = '';

                if (itemWeight <= w) {
                    depCells.push([i - 1, w - itemWeight]);
                    const excludeVal = grid[i - 1][w] as number;
                    const includeVal = (grid[i - 1][w - itemWeight] as number) + itemValue;
                    grid[i][w] = Math.max(excludeVal, includeVal);
                    formula = `max(dp[${i-1}][${w}] (${excludeVal}), dp[${i-1}][${w - itemWeight}] + ${itemValue} (${includeVal})) = ${grid[i][w]}`;
                } else {
                    grid[i][w] = grid[i - 1][w];
                    formula = `Item too heavy (${itemWeight} > ${w}) ==> dp[${i}][${w}] = dp[${i-1}][${w}] = ${grid[i][w]}`;
                }

                steps.push({
                    stepIndex: stepCount++,
                    description: `Calculate cell dp[${i}][${w}] for Item ${i} at Capacity ${w}`,
                    actionType: 'compute_cell',
                    explanation: formula,
                    dimensions: [rows, cols],
                    rowHeaders,
                    colHeaders,
                    grid: JSON.parse(JSON.stringify(grid)),
                    activeCell: [i, w],
                    dependencyCells: depCells,
                    formulaApplied: formula
                });
            }
        }

        // Final step: reconstruct solution
        const solutionCells: [number, number][] = [];
        let curW = W;
        for (let i = n; i > 0 && curW > 0; i--) {
            if (grid[i][curW] !== grid[i - 1][curW]) {
                solutionCells.push([i, curW]);
                curW -= wt[i - 1];
            }
        }

        steps.push({
            stepIndex: stepCount++,
            description: `Final Max Value: ${grid[n][W]}. Backtrack to reconstruct chosen items.`,
            actionType: 'solution_reconstructed',
            explanation: `Traceback identified optimal item selection: ${solutionCells.map(c => `Item ${c[0]}`).join(', ')}.`,
            dimensions: [rows, cols],
            rowHeaders,
            colHeaders,
            grid: JSON.parse(JSON.stringify(grid)),
            activeCell: [n, W],
            dependencyCells: [],
            formulaApplied: `Optimal Profit = ${grid[n][W]}`,
            solutionReconstruction: solutionCells
        });

        return steps;
    }

    // ─────────────────────────────────────────────────────────────
    // C. BACKTRACKING: N-Queens
    // ─────────────────────────────────────────────────────────────
    public static generateNQueensTrace(n: number = 4): BacktrackingTraceStep[] {
        const steps: BacktrackingTraceStep[] = [];
        const queens: number[] = new Array(n).fill(-1); // row -> col
        let stepCount = 0;

        const isSafe = (row: number, col: number): { safe: boolean; reason?: string } => {
            for (let r = 0; r < row; r++) {
                const c = queens[r];
                if (c === col) {
                    return { safe: false, reason: `Column conflict with Queen at Row ${r}, Col ${c}` };
                }
                if (Math.abs(r - row) === Math.abs(c - col)) {
                    return { safe: false, reason: `Diagonal conflict with Queen at Row ${r}, Col ${c}` };
                }
            }
            return { safe: true };
        };

        const solve = (row: number): boolean => {
            if (row === n) {
                steps.push({
                    stepIndex: stepCount++,
                    description: `VALID SOLUTION FOUND! All ${n} queens placed without conflict.`,
                    actionType: 'solution_found',
                    explanation: `All rows satisfied: [${queens.join(', ')}].`,
                    boardState: [...queens],
                    decisionPath: queens.map((col, r) => `R${r}->C${col}`),
                    currentChoice: 'Solution',
                    isPruned: false,
                    isSolution: true
                });
                return true;
            }

            for (let col = 0; col < n; col++) {
                queens[row] = col;
                const check = isSafe(row, col);

                if (!check.safe) {
                    steps.push({
                        stepIndex: stepCount++,
                        description: `Try placing Queen at Row ${row}, Col ${col} ==> CONFLICT!`,
                        actionType: 'prune',
                        explanation: `PRUNED: ${check.reason}. Backtracking immediately without descending.`,
                        boardState: [...queens],
                        decisionPath: queens.slice(0, row + 1).map((c, r) => `R${r}->C${c}`),
                        currentChoice: `R${row}:C${col}`,
                        isPruned: true,
                        pruningReason: check.reason,
                        isSolution: false
                    });
                    queens[row] = -1;
                } else {
                    steps.push({
                        stepIndex: stepCount++,
                        description: `Safe! Place Queen at Row ${row}, Col ${col}. Advance to Row ${row + 1}.`,
                        actionType: 'place',
                        explanation: `No column or diagonal conflicts. Descending deeper in search tree.`,
                        boardState: [...queens],
                        decisionPath: queens.slice(0, row + 1).map((c, r) => `R${r}->C${c}`),
                        currentChoice: `R${row}:C${col}`,
                        isPruned: false,
                        isSolution: false
                    });

                    const found = solve(row + 1);
                    if (found) return true;

                    // Undo (backtrack)
                    queens[row] = -1;
                    steps.push({
                        stepIndex: stepCount++,
                        description: `Backtrack from Row ${row}, Col ${col}. Removing Queen.`,
                        actionType: 'backtrack',
                        explanation: `Descendant branches exhausted without reaching valid board. Restoring previous state.`,
                        boardState: [...queens],
                        decisionPath: queens.slice(0, row).map((c, r) => `R${r}->C${c}`),
                        currentChoice: `Undo R${row}:C${col}`,
                        isPruned: false,
                        isSolution: false
                    });
                }
            }
            return false;
        };

        solve(0);
        return steps;
    }

    // ─────────────────────────────────────────────────────────────
    // D. GRAPH TRAVERSAL: Dijkstra's Algorithm
    // ─────────────────────────────────────────────────────────────
    public static generateDijkstraTrace(): GraphTraceStep[] {
        // 5-node graph: 0 -> 1(4), 0 -> 2(2), 1 -> 2(1), 1 -> 3(5), 2 -> 3(8), 2 -> 4(10), 3 -> 4(2)
        const numNodes = 5;
        const labels = ['A', 'B', 'C', 'D', 'E'];
        const edgesData = [
            { u: 0, v: 1, w: 4 },
            { u: 0, v: 2, w: 2 },
            { u: 1, v: 2, w: 1 },
            { u: 1, v: 3, w: 5 },
            { u: 2, v: 3, w: 8 },
            { u: 2, v: 4, w: 10 },
            { u: 3, v: 4, w: 2 }
        ];

        const steps: GraphTraceStep[] = [];
        const dist: number[] = new Array(numNodes).fill(Infinity);
        const visited = new Set<number>();
        dist[0] = 0;
        let stepCount = 0;

        const makeNodes = (curr: number | null): GraphNodeState[] => {
            return labels.map((label, id) => ({
                id,
                label,
                status: visited.has(id) ? 'visited' : id === curr ? 'visiting' : 'unvisited',
                distance: dist[id] === Infinity ? 999 : dist[id]
            }));
        };

        const makeEdges = (activeU: number | null, activeV: number | null): GraphEdgeState[] => {
            return edgesData.map(e => ({
                u: e.u,
                v: e.v,
                weight: e.w,
                status: (e.u === activeU && e.v === activeV) ? 'relaxed' : 'idle'
            }));
        };

        steps.push({
            stepIndex: stepCount++,
            description: 'Initialize Dijkstra: Source Node A with distance 0, all others Infinity',
            actionType: 'init',
            explanation: 'Dijkstra maintains tentative shortest distances from source.',
            nodes: makeNodes(0),
            edges: makeEdges(null, null),
            frontier: [0],
            distances: { 0: 0, 1: 999, 2: 999, 3: 999, 4: 999 },
            currentVertex: 0
        });

        while (visited.size < numNodes) {
            // Find unvisited vertex with smallest distance
            let u = -1;
            let minD = Infinity;
            for (let i = 0; i < numNodes; i++) {
                if (!visited.has(i) && dist[i] < minD) {
                    minD = dist[i];
                    u = i;
                }
            }
            if (u === -1 || minD === Infinity) break;

            visited.add(u);

            steps.push({
                stepIndex: stepCount++,
                description: `Extract Min: Finalize vertex ${labels[u]} with confirmed shortest distance ${dist[u]}`,
                actionType: 'finalize_vertex',
                explanation: `Greedy choice: Node ${labels[u]} has smallest tentative distance (${dist[u]}). Because all edge weights are positive, this distance can never be decreased later.`,
                nodes: makeNodes(u),
                edges: makeEdges(null, null),
                frontier: Array.from(visited),
                distances: Object.fromEntries(dist.map((d, i) => [i, d === Infinity ? 999 : d])),
                currentVertex: u
            });

            // Relax incident edges
            for (const edge of edgesData.filter(e => e.u === u)) {
                const v = edge.v;
                if (!visited.has(v)) {
                    const newD = dist[u] + edge.w;
                    const relaxed = newD < dist[v];
                    if (relaxed) {
                        dist[v] = newD;
                    }

                    steps.push({
                        stepIndex: stepCount++,
                        description: `Check edge (${labels[u]} -> ${labels[v]}, weight ${edge.w}): ${relaxed ? `RELAXED! New dist = ${newD}` : `No update (${dist[v]} <= ${newD})`}`,
                        actionType: 'relax_edge',
                        explanation: `Distance formula: dist[${labels[u]}] + ${edge.w} = ${newD}. Current tentative dist[${labels[v]}] = ${dist[v]}. ${relaxed ? 'Updated!' : 'Kept current.'}`,
                        nodes: makeNodes(u),
                        edges: makeEdges(u, v),
                        frontier: Array.from(visited),
                        distances: Object.fromEntries(dist.map((d, i) => [i, d === Infinity ? 999 : d])),
                        currentVertex: u
                    });
                }
            }
        }

        return steps;
    }

    // ─────────────────────────────────────────────────────────────
    // E. SORTING: QuickSort with Pivot Partitioning
    // ─────────────────────────────────────────────────────────────
    public static generateQuickSortTrace(input: number[] = [29, 10, 14, 37, 13]): SortingTraceStep[] {
        const steps: SortingTraceStep[] = [];
        const arr = [...input];
        let stepCount = 0;
        const sortedIndices = new Set<number>();

        const record = (desc: string, action: string, expl: string, comparing: number[] = [], swapped: number[] = [], pivot?: number, range?: [number, number]) => {
            steps.push({
                stepIndex: stepCount++,
                description: desc,
                actionType: action,
                explanation: expl,
                array: [...arr],
                comparingIndices: comparing,
                swappedIndices: swapped,
                sortedIndices: Array.from(sortedIndices),
                pivotIndex: pivot,
                searchRange: range
            });
        };

        record('Initial Array State', 'init', 'Starting QuickSort with array elements.', [], []);

        const partition = (low: number, high: number): number => {
            const pivot = arr[high];
            record(`Selected Pivot element arr[${high}] = ${pivot}`, 'select_pivot', `Elements <= ${pivot} will move left, > ${pivot} move right.`, [], [], high, [low, high]);

            let i = low - 1;
            for (let j = low; j < high; j++) {
                record(`Compare arr[${j}] (${arr[j]}) with Pivot (${pivot})`, 'compare', arr[j] <= pivot ? `${arr[j]} <= ${pivot}: Swap with boundary` : `${arr[j]} > ${pivot}: Leave in place`, [j, high], [], high, [low, high]);

                if (arr[j] <= pivot) {
                    i++;
                    const tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                    if (i !== j) {
                        record(`Swapped arr[${i}] and arr[${j}]`, 'swap', `Moving ${arr[i]} to smaller element partition.`, [], [i, j], high, [low, high]);
                    }
                }
            }

            // Put pivot in right place
            const tmp = arr[i + 1];
            arr[i + 1] = arr[high];
            arr[high] = tmp;
            sortedIndices.add(i + 1);

            record(`Placed Pivot at correct sorted index ${i + 1}`, 'pivot_placed', `Partition complete. Sub-arrays [${low}..${i}] and [${i + 2}..${high}] will recurse independently.`, [], [i + 1, high], i + 1, [low, high]);
            return i + 1;
        };

        const sort = (low: number, high: number) => {
            if (low < high) {
                const pi = partition(low, high);
                sort(low, pi - 1);
                sort(pi + 1, high);
            } else if (low === high) {
                sortedIndices.add(low);
            }
        };

        sort(0, arr.length - 1);
        record('Sorting Complete! Array is in ascending order.', 'complete', 'All partitions resolved.', [], []);
        return steps;
    }
}

