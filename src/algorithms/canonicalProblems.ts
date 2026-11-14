/**
 * Canonical DAA Problem Knowledge Base & Reference Implementations
 * 
 * Provides reference C++ implementations, mathematical recurrence relations,
 * time and space complexity models, and semantic transformation templates for
 * core Semester 5 Design and Analysis of Algorithms paradigms:
 * - Divide and Conquer
 * - Dynamic Programming
 * - Greedy Algorithms
 * - Backtracking
 */

export type AlgorithmParadigm = 'divide_and_conquer' | 'dynamic_programming' | 'greedy' | 'backtracking';

export interface CanonicalProblem {
    id: string;
    title: string;
    paradigm: AlgorithmParadigm;
    description: string;
    subproblemCharacteristics: string;
    optimalSubstructure: string;
    recurrenceRelation?: string;
    naiveCodeCpp: string;
    naiveTimeComplexity: string;
    naiveSpaceComplexity: string;
    optimalCodeCpp: string;
    optimalTimeComplexity: string;
    optimalSpaceComplexity: string;
    tradeoffs: string[];
    whyParadigmApplies: string;
    whyOtherParadigmsFail: string;
    testCases: { input: any; expected: any }[];
}

export const CANONICAL_PROBLEMS: Record<string, CanonicalProblem> = {
    // ─────────────── DIVIDE AND CONQUER ───────────────
    'merge_sort': {
        id: 'merge_sort',
        title: 'Merge Sort',
        paradigm: 'divide_and_conquer',
        description: 'Sort an array by recursively dividing it into two halves, sorting each half independently, and merging them in linear time.',
        subproblemCharacteristics: 'Divides problem of size N into 2 strictly independent subproblems of size N/2.',
        optimalSubstructure: 'A sorted array consists of two individually sorted sub-arrays merged in non-decreasing order.',
        recurrenceRelation: 'T(n) = 2T(n/2) + O(n) ==> By Master Theorem (Case 2): Theta(n log n)',
        naiveCodeCpp: `// Naive Bubble Sort - O(n^2)
void bubbleSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                std::swap(arr[j], arr[j + 1]);
            }
        }
    }
}`,
        naiveTimeComplexity: 'O(n^2)',
        naiveSpaceComplexity: 'O(1)',
        optimalCodeCpp: `// Divide and Conquer Merge Sort - O(n log n)
void merge(std::vector<int>& arr, int l, int m, int r) {
    std::vector<int> left(arr.begin() + l, arr.begin() + m + 1);
    std::vector<int> right(arr.begin() + m + 1, arr.begin() + r + 1);
    int i = 0, j = 0, k = l;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) arr[k++] = left[i++];
        else arr[k++] = right[j++];
    }
    while (i < left.size()) arr[k++] = left[i++];
    while (j < right.size()) arr[k++] = right[j++];
}

void mergeSort(std::vector<int>& arr, int l, int r) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    mergeSort(arr, l, m);
    mergeSort(arr, m + 1, r);
    merge(arr, l, m, r);
}`,
        optimalTimeComplexity: 'O(n log n)',
        optimalSpaceComplexity: 'O(n)',
        tradeoffs: [
            'Guaranteed O(n log n) worst-case time complexity.',
            'Requires O(n) auxiliary memory for buffer allocations.',
            'Stable sorting: preserves relative ordering of equal elements.'
        ],
        whyParadigmApplies: 'The problem can be decomposed into two non-overlapping, balanced subproblems whose solutions can be merged in linear time.',
        whyOtherParadigmsFail: 'Greedy local swaps (like bubble or selection) make decisions without global perspective, leading to quadratic running times.',
        testCases: [
            { input: [38, 27, 43, 3, 9, 82, 10], expected: [3, 9, 10, 27, 38, 43, 82] }
        ]
    },

    'quick_sort': {
        id: 'quick_sort',
        title: 'Quick Sort',
        paradigm: 'divide_and_conquer',
        description: 'Partitions array around a pivot element such that smaller elements precede it and larger succeed it, then recurses.',
        subproblemCharacteristics: 'Divides into subproblems based on pivot partitioning; subproblem sizes depend on pivot selection.',
        optimalSubstructure: 'Array is sorted once every element is at its correct partition rank.',
        recurrenceRelation: 'Average: T(n) = 2T(n/2) + O(n) => O(n log n). Worst (sorted naive pivot): T(n) = T(n-1) + O(n) => O(n^2).',
        naiveCodeCpp: `// Naive Insertion Sort
void insertionSort(std::vector<int>& arr) {
    for (int i = 1; i < arr.size(); i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}`,
        naiveTimeComplexity: 'O(n^2)',
        naiveSpaceComplexity: 'O(1)',
        optimalCodeCpp: `// Divide and Conquer In-Place QuickSort with median/randomized pivot
int partition(std::vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            std::swap(arr[i], arr[j]);
        }
    }
    std::swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(std::vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`,
        optimalTimeComplexity: 'O(n log n) avg, O(n^2) worst',
        optimalSpaceComplexity: 'O(log n) call stack',
        tradeoffs: [
            'In-place cache-efficient partitioning with minimal space overhead.',
            'Unstable sorting.',
            'Requires randomized or median-of-three pivot to avoid worst-case on already sorted inputs.'
        ],
        whyParadigmApplies: 'Partitioning naturally breaks array into independent sub-arrays around the pivot position.',
        whyOtherParadigmsFail: 'Linear iterative methods without partitioning incur quadratic comparisons.',
        testCases: [
            { input: [10, 7, 8, 9, 1, 5], expected: [1, 5, 7, 8, 9, 10] }
        ]
    },

    // ─────────────── DYNAMIC PROGRAMMING ───────────────
    'fibonacci': {
        id: 'fibonacci',
        title: 'Fibonacci Sequence',
        paradigm: 'dynamic_programming',
        description: 'Computes the N-th Fibonacci number where F(n) = F(n-1) + F(n-2).',
        subproblemCharacteristics: 'High degree of overlapping subproblems: F(n-2) is computed independently by both F(n) and F(n-1).',
        optimalSubstructure: 'The solution to F(n) is directly composed of the solutions to subproblems F(n-1) and F(n-2).',
        recurrenceRelation: 'T(n) = T(n-1) + T(n-2) + O(1) ==> O(2^n) exponential tree collapsed to O(n) via Memoization/Tabulation',
        naiveCodeCpp: `// Inefficient Exponential Recursive Fibonacci - O(2^n)
long long fibNaive(int n) {
    if (n <= 1) return n;
    return fibNaive(n - 1) + fibNaive(n - 2);
}`,
        naiveTimeComplexity: 'O(2^n)',
        naiveSpaceComplexity: 'O(n) call stack',
        optimalCodeCpp: `// Optimized Dynamic Programming Tabulation with O(1) space - O(n)
long long fibDP(int n) {
    if (n <= 1) return n;
    long long prev2 = 0, prev1 = 1;
    for (int i = 2; i <= n; i++) {
        long long curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}`,
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(1)',
        tradeoffs: [
            'Eliminates exponential call stack recursion entirely.',
            'Reduces computation from billions of operations to simple linear passes.',
            'Can be computed in O(log n) via matrix exponentiation for very large N.'
        ],
        whyParadigmApplies: 'Overlapping subproblems are severe (identical function calls repeated thousands of times) and optimal substructure is direct.',
        whyOtherParadigmsFail: 'Greedy cannot make progress because each term depends strictly on both predecessor values. Pure Divide & Conquer repeats work exponentially.',
        testCases: [
            { input: 10, expected: 55 },
            { input: 20, expected: 6765 },
            { input: 30, expected: 832040 }
        ]
    },

    '01_knapsack': {
        id: '01_knapsack',
        title: '0/1 Knapsack Problem',
        paradigm: 'dynamic_programming',
        description: 'Given items with weights and values, find maximum value subset fitting in knapsack capacity W without splitting items.',
        subproblemCharacteristics: 'Subproblems defined by (item index i, remaining capacity w) overlap when different subsets yield identical remaining capacity.',
        optimalSubstructure: 'Optimal solution for capacity W with i items either includes item i (value[i] + optimal for W - weight[i]) or excludes it.',
        recurrenceRelation: 'dp[i][w] = max(dp[i-1][w], dp[i-1][w - wt[i-1]] + val[i-1])',
        naiveCodeCpp: `// Inefficient Brute Force Recursion - O(2^n)
int knapNaive(int W, const std::vector<int>& wt, const std::vector<int>& val, int n) {
    if (n == 0 || W == 0) return 0;
    if (wt[n - 1] > W)
        return knapNaive(W, wt, val, n - 1);
    return std::max(
        val[n - 1] + knapNaive(W - wt[n - 1], wt, val, n - 1),
        knapNaive(W, wt, val, n - 1)
    );
}`,
        naiveTimeComplexity: 'O(2^n)',
        naiveSpaceComplexity: 'O(n)',
        optimalCodeCpp: `// Optimized 2D/1D Tabulation DP - O(n * W)
int knapsackDP(int W, const std::vector<int>& wt, const std::vector<int>& val) {
    int n = wt.size();
    std::vector<int> dp(W + 1, 0);
    for (int i = 0; i < n; i++) {
        for (int w = W; w >= wt[i]; w--) {
            dp[w] = std::max(dp[w], dp[w - wt[i]] + val[i]);
        }
    }
    return dp[W];
}`,
        optimalTimeComplexity: 'O(n * W) pseudo-polynomial',
        optimalSpaceComplexity: 'O(W) rolling array',
        tradeoffs: [
            'Finds globally optimal subset without checking all 2^N subsets.',
            'Runtime depends on numerical value of capacity W (pseudo-polynomial).',
            'Cannot solve efficiently if W is exponentially large (NP-complete).'
        ],
        whyParadigmApplies: 'Optimal substructure exists across discrete remaining capacities, and identical (index, remaining_capacity) states recur frequently.',
        whyOtherParadigmsFail: 'Greedy choice (e.g., sorting by value/weight ratio) fails for 0/1 knapsack because leaving empty space in the knapsack can cause suboptimal totals. Divide & conquer without memoization branches 2^n times.',
        testCases: [
            { input: { W: 50, wt: [10, 20, 30], val: [60, 100, 120] }, expected: 220 }
        ]
    },

    'coin_change': {
        id: 'coin_change',
        title: 'Coin Change (Minimum Coins)',
        paradigm: 'dynamic_programming',
        description: 'Find minimum number of coins needed to make change for a given amount using available denominations.',
        subproblemCharacteristics: 'Making change for amount A depends on optimal ways to make change for (A - coin) for each denomination.',
        optimalSubstructure: 'Optimal solution for amount A consists of 1 coin of denomination c plus optimal solution for (A - c).',
        recurrenceRelation: 'dp[a] = 1 + min_{c in coins} dp[a - c] with dp[0] = 0',
        naiveCodeCpp: `// Exponential Recursive Coin Change
int minCoinsRec(const std::vector<int>& coins, int amount) {
    if (amount == 0) return 0;
    if (amount < 0) return 1e9;
    int res = 1e9;
    for (int c : coins) {
        res = std::min(res, 1 + minCoinsRec(coins, amount - c));
    }
    return res;
}`,
        naiveTimeComplexity: 'O(coins^amount)',
        naiveSpaceComplexity: 'O(amount)',
        optimalCodeCpp: `// Optimized Tabulation DP - O(amount * |coins|)
int coinChangeDP(const std::vector<int>& coins, int amount) {
    std::vector<int> dp(amount + 1, amount + 1);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (a >= c) {
                dp[a] = std::min(dp[a], 1 + dp[a - c]);
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}`,
        optimalTimeComplexity: 'O(amount * |coins|)',
        optimalSpaceComplexity: 'O(amount)',
        tradeoffs: [
            'Works for arbitrary non-canonical coin denomination systems.',
            'Guarantees minimal coin count.',
            'Requires array proportional to target amount.'
        ],
        whyParadigmApplies: 'Subproblems for intermediate amounts overlap massively across branching coin choices.',
        whyOtherParadigmsFail: 'Greedy choice (always taking highest denomination) fails for non-canonical systems (e.g. coins {1, 3, 4} for amount 6: greedy picks 4+1+1=3 coins, optimal DP is 3+3=2 coins).',
        testCases: [
            { input: { coins: [1, 2, 5], amount: 11 }, expected: 3 },
            { input: { coins: [1, 3, 4], amount: 6 }, expected: 2 }
        ]
    },

    'longest_common_subsequence': {
        id: 'longest_common_subsequence',
        title: 'Longest Common Subsequence (LCS)',
        paradigm: 'dynamic_programming',
        description: 'Find the length of the longest subsequence present in both strings in the same relative order.',
        subproblemCharacteristics: 'Prefix subproblems (i, j) comparing str1[0..i] and str2[0..j].',
        optimalSubstructure: 'If characters match at (i, j), LCS is 1 + LCS(i-1, j-1); otherwise max(LCS(i-1, j), LCS(i, j-1)).',
        recurrenceRelation: 'dp[i][j] = (s1[i-1] == s2[j-1]) ? 1 + dp[i-1][j-1] : max(dp[i-1][j], dp[i][j-1])',
        naiveCodeCpp: `// Exponential Recursive LCS - O(2^(m+n))
int lcsNaive(const std::string& s1, const std::string& s2, int i, int j) {
    if (i == 0 || j == 0) return 0;
    if (s1[i - 1] == s2[j - 1])
        return 1 + lcsNaive(s1, s2, i - 1, j - 1);
    return std::max(lcsNaive(s1, s2, i - 1, j), lcsNaive(s1, s2, i, j - 1));
}`,
        naiveTimeComplexity: 'O(2^(m+n))',
        naiveSpaceComplexity: 'O(m+n)',
        optimalCodeCpp: `// 2D Tabulation LCS - O(m * n)
int lcsDP(const std::string& s1, const std::string& s2) {
    int m = s1.length(), n = s2.length();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1[i - 1] == s2[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = std::max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}`,
        optimalTimeComplexity: 'O(m * n)',
        optimalSpaceComplexity: 'O(min(m, n)) with space optimization',
        tradeoffs: [
            'Provides exact subsequence alignment and reconstruction table.',
            'Polynomial in product of input string lengths.',
            'Essential for diff engines, bioinformatics DNA sequence matching.'
        ],
        whyParadigmApplies: 'Common prefix alignment requires evaluating previous match decisions without recalculating overlapping character offsets.',
        whyOtherParadigmsFail: 'Greedy matching of first occurrence can permanently eliminate longer future alignments.',
        testCases: [
            { input: { s1: 'AGGTAB', s2: 'GXTXAYB' }, expected: 4 }
        ]
    },

    'longest_increasing_subsequence': {
        id: 'longest_increasing_subsequence',
        title: 'Longest Increasing Subsequence (LIS)',
        paradigm: 'dynamic_programming',
        description: 'Find the length of the longest subsequence in an array such that all elements are sorted in strictly increasing order.',
        subproblemCharacteristics: 'LIS ending at index i depends on max LIS ending at index j where j < i and arr[j] < arr[i].',
        optimalSubstructure: 'LIS(i) = 1 + max(LIS(j)) for all j < i with arr[j] < arr[i].',
        recurrenceRelation: 'dp[i] = 1 + max_{0 <= j < i, arr[j] < arr[i]} dp[j]',
        naiveCodeCpp: `// Naive O(2^n) Recursive LIS
int lisRec(const std::vector<int>& arr, int prevIdx, int currIdx) {
    if (currIdx == arr.size()) return 0;
    int taken = 0;
    if (prevIdx < 0 || arr[currIdx] > arr[prevIdx]) {
        taken = 1 + lisRec(arr, currIdx, currIdx + 1);
    }
    int notTaken = lisRec(arr, prevIdx, currIdx + 1);
    return std::max(taken, notTaken);
}`,
        naiveTimeComplexity: 'O(2^n)',
        naiveSpaceComplexity: 'O(n)',
        optimalCodeCpp: `// Optimized Patience Sorting + Binary Search DP - O(n log n)
int lisOptimized(const std::vector<int>& arr) {
    std::vector<int> tails;
    for (int x : arr) {
        auto it = std::lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) {
            tails.push_back(x);
        } else {
            *it = x;
        }
    }
    return tails.size();
}`,
        optimalTimeComplexity: 'O(n log n)',
        optimalSpaceComplexity: 'O(n)',
        tradeoffs: [
            'Combines Dynamic Programming state modeling with Divide & Conquer binary search.',
            'O(n log n) speed enables processing millions of elements.',
            'Tails array maintains smallest tail of all increasing subsequences of length i+1.'
        ],
        whyParadigmApplies: 'Optimal state depends on the smallest tail element for each candidate sequence length.',
        whyOtherParadigmsFail: 'Pure greedy choices may accept large numbers early that block longer future chains.',
        testCases: [
            { input: [10, 9, 2, 5, 3, 7, 101, 18], expected: 4 }
        ]
    },

    'matrix_chain_multiplication': {
        id: 'matrix_chain_multiplication',
        title: 'Matrix Chain Multiplication (MCM)',
        paradigm: 'dynamic_programming',
        description: 'Find the most efficient parenthesization order to multiply a chain of matrices with minimal scalar multiplications.',
        subproblemCharacteristics: 'Subchains A[i..j] split at index k where i <= k < j.',
        optimalSubstructure: 'Optimal cost for chain i..j is optimal cost of i..k + optimal cost of (k+1)..j + cost of multiplying the two result matrices.',
        recurrenceRelation: 'm[i][j] = min_{i <= k < j} (m[i][k] + m[k+1][j] + p[i-1]*p[k]*p[j])',
        naiveCodeCpp: `// Naive Exponential MCM
int mcmNaive(const std::vector<int>& p, int i, int j) {
    if (i == j) return 0;
    int minCost = 1e9;
    for (int k = i; k < j; k++) {
        int cost = mcmNaive(p, i, k) + mcmNaive(p, k + 1, j) + p[i - 1] * p[k] * p[j];
        minCost = std::min(minCost, cost);
    }
    return minCost;
}`,
        naiveTimeComplexity: 'O(2^n) Catalan number',
        naiveSpaceComplexity: 'O(n)',
        optimalCodeCpp: `// Tabulation DP MCM - O(n^3)
int mcmDP(const std::vector<int>& p) {
    int n = p.size() - 1;
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(n + 1, 0));
    for (int len = 2; len <= n; len++) {
        for (int i = 1; i <= n - len + 1; i++) {
            int j = i + len - 1;
            dp[i][j] = 1e9;
            for (int k = i; k < j; k++) {
                int cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j];
                dp[i][j] = std::min(dp[i][j], cost);
            }
        }
    }
    return dp[1][n];
}`,
        optimalTimeComplexity: 'O(n^3)',
        optimalSpaceComplexity: 'O(n^2)',
        tradeoffs: [
            'Drastically reduces matrix multiplication execution from hours to milliseconds in linear algebra engines.',
            'O(n^3) complexity is negligible since chain lengths rarely exceed 100.'
        ],
        whyParadigmApplies: 'Chain parenthesizations split into overlapping subchains with optimal substructure.',
        whyOtherParadigmsFail: 'Greedy choice of multiplying smallest adjacent dimensions first can lead to catastrophic overall costs.',
        testCases: [
            { input: [10, 20, 30, 40, 30], expected: 30000 }
        ]
    },

    // ─────────────── GREEDY ALGORITHMS ───────────────
    'fractional_knapsack': {
        id: 'fractional_knapsack',
        title: 'Fractional Knapsack',
        paradigm: 'greedy',
        description: 'Maximize total knapsack value when items can be divided into fractional units.',
        subproblemCharacteristics: 'Remaining capacity is continuous; each choice greedily consumes capacity using highest value-to-weight ratio.',
        optimalSubstructure: 'After taking maximum possible amount of the highest ratio item, the remaining problem is optimal fractional knapsack on remaining capacity.',
        naiveCodeCpp: `// Unnecessary DP approach for fractional problem
// Overcomplicates with discretized capacity table O(n*W)
`,
        naiveTimeComplexity: 'O(n * W)',
        naiveSpaceComplexity: 'O(W)',
        optimalCodeCpp: `// Optimal Greedy Sorting by Value Density - O(n log n)
struct Item { int val, wt; double ratio; };

double fractionalKnapsack(int W, std::vector<Item>& items) {
    for (auto& it : items) it.ratio = (double)it.val / it.wt;
    std::sort(items.begin(), items.end(), [](const Item& a, const Item& b) {
        return a.ratio > b.ratio;
    });
    double totalVal = 0.0;
    for (const auto& it : items) {
        if (W >= it.wt) {
            totalVal += it.val;
            W -= it.wt;
        } else {
            totalVal += it.ratio * W;
            break;
        }
    }
    return totalVal;
}`,
        optimalTimeComplexity: 'O(n log n)',
        optimalSpaceComplexity: 'O(1)',
        tradeoffs: [
            'Proves the Greedy-Choice Property: Taking the highest value-per-pound item is always globally optimal when fractions are allowed.',
            'Much faster than 0/1 Knapsack DP (O(n log n) vs O(n * W)).'
        ],
        whyParadigmApplies: 'Because items can be split, the greedy choice never leaves unusable capacity slack, satisfying the greedy choice property.',
        whyOtherParadigmsFail: 'Dynamic Programming is unnecessary overhead here since greedy is mathematically proven to achieve 100% optimal value.',
        testCases: [
            { input: { W: 50, items: [{ val: 60, wt: 10 }, { val: 100, wt: 20 }, { val: 120, wt: 30 }] }, expected: 240 }
        ]
    },

    'activity_selection': {
        id: 'activity_selection',
        title: 'Activity Selection / Interval Scheduling',
        paradigm: 'greedy',
        description: 'Select the maximum number of mutually compatible activities that can be performed on a single resource.',
        subproblemCharacteristics: 'Selecting an activity leaves a subproblem of compatible activities starting after the chosen activity ends.',
        optimalSubstructure: 'An optimal schedule containing the activity that finishes earliest leaves an optimal schedule for the remaining time.',
        naiveCodeCpp: `// Inefficient Backtracking - O(2^n)
void scheduleBacktrack(const std::vector<std::pair<int, int>>& acts, int idx, int lastEnd, int count, int& maxCount) {
    if (idx == acts.size()) {
        maxCount = std::max(maxCount, count);
        return;
    }
    if (acts[idx].first >= lastEnd) {
        scheduleBacktrack(acts, idx + 1, acts[idx].second, count + 1, maxCount);
    }
    scheduleBacktrack(acts, idx + 1, lastEnd, count, maxCount);
}`,
        naiveTimeComplexity: 'O(2^n)',
        naiveSpaceComplexity: 'O(n)',
        optimalCodeCpp: `// Optimal Greedy Choice: Sort by Finish Time - O(n log n)
int maxActivities(std::vector<std::pair<int, int>>& activities) {
    // Sort by finish time (second element)
    std::sort(activities.begin(), activities.end(), [](const auto& a, const auto& b) {
        return a.second < b.second;
    });
    int count = 0, lastEnd = -1;
    for (const auto& act : activities) {
        if (act.first >= lastEnd) {
            count++;
            lastEnd = act.second;
        }
    }
    return count;
}`,
        optimalTimeComplexity: 'O(n log n)',
        optimalSpaceComplexity: 'O(1)',
        tradeoffs: [
            'Proves that greedily picking the activity that frees up the resource earliest maximizes remaining time for future activities.',
            'Runs in O(n log n) solely due to sorting.'
        ],
        whyParadigmApplies: 'Earliest finish time greedy choice leaves the maximum possible free time for remaining tasks, preserving optimal substructure.',
        whyOtherParadigmsFail: 'Greedily picking shortest duration or earliest start time fails counter-examples.',
        testCases: [
            { input: [[1, 2], [3, 4], [0, 6], [5, 7], [8, 9], [5, 9]], expected: 4 }
        ]
    },

    'dijkstra': {
        id: 'dijkstra',
        title: "Dijkstra's Shortest Path Algorithm",
        paradigm: 'greedy',
        description: 'Find shortest paths from a source vertex to all other vertices in a weighted graph with non-negative edge weights.',
        subproblemCharacteristics: 'Shortest path to target T extends the shortest path to an intermediate vertex U with edge (U, T).',
        optimalSubstructure: 'Subpaths of shortest paths are themselves shortest paths.',
        naiveCodeCpp: `// Naive Dijkstra with linear search for minimum distance vertex - O(V^2)
int findMinDist(const std::vector<int>& dist, const std::vector<bool>& visited, int V) {
    int minVal = 1e9, minIdx = -1;
    for (int v = 0; v < V; v++) {
        if (!visited[v] && dist[v] < minVal) {
            minVal = dist[v];
            minIdx = v;
        }
    }
    return minIdx;
}`,
        naiveTimeComplexity: 'O(V^2)',
        naiveSpaceComplexity: 'O(V)',
        optimalCodeCpp: `// Optimal Dijkstra using Min-Heap Priority Queue - O((V + E) log V)
std::vector<int> dijkstra(int V, int src, const std::vector<std::vector<std::pair<int, int>>>& adj) {
    std::vector<int> dist(V, 1e9);
    // Min-heap: stores {distance, vertex}
    std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, std::greater<>> pq;
    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue;

        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}`,
        optimalTimeComplexity: 'O((V + E) log V)',
        optimalSpaceComplexity: 'O(V + E)',
        tradeoffs: [
            'Requires non-negative edge weights.',
            'Greedily finalizes distance to the unvisited vertex with smallest current tentative distance.',
            'Cache-friendly priority queue implementation.'
        ],
        whyParadigmApplies: 'Because edge weights are non-negative, taking the minimum tentative distance vertex guarantees that no future path through other vertices can yield a shorter distance.',
        whyOtherParadigmsFail: 'Fails when negative edge weights exist (requires Bellman-Ford DP).',
        testCases: [
            { input: { V: 4, edges: [[0, 1, 1], [1, 2, 2], [0, 2, 4], [2, 3, 1]], src: 0 }, expected: [0, 1, 3, 4] }
        ]
    },

    // ─────────────── BACKTRACKING ───────────────
    'n_queens': {
        id: 'n_queens',
        title: 'N-Queens Problem',
        paradigm: 'backtracking',
        description: 'Place N non-attacking queens on an N x N chessboard such that no two queens share the same row, column, or diagonal.',
        subproblemCharacteristics: 'Placement in row R requires finding a column safe from queens placed in rows 0..R-1.',
        optimalSubstructure: 'Not an optimization problem; constraint satisfaction exploring the state-space tree with pruning.',
        naiveCodeCpp: `// Naive Generate All Configurations and Test - O(N^N)
// Generates every possible combination without pruning invalid placements early.
`,
        naiveTimeComplexity: 'O(N^N)',
        naiveSpaceComplexity: 'O(N)',
        optimalCodeCpp: `// Backtracking with O(1) Diagonal/Column Constraint Pruning - O(N!)
class NQueens {
    int n;
    std::vector<std::vector<std::string>> solutions;
    std::vector<bool> cols, diag1, diag2;
    std::vector<int> queens;

    void solve(int row) {
        if (row == n) {
            recordSolution();
            return;
        }
        for (int col = 0; col < n; col++) {
            int d1 = row - col + n - 1;
            int d2 = row + col;
            if (cols[col] || diag1[d1] || diag2[d2]) continue; // Prune!

            // Make decision
            cols[col] = diag1[d1] = diag2[d2] = true;
            queens[row] = col;

            solve(row + 1);

            // Backtrack (undo decision)
            cols[col] = diag1[d1] = diag2[d2] = false;
        }
    }
public:
    int solveNQueens(int N) {
        n = N;
        cols.assign(n, false);
        diag1.assign(2 * n - 1, false);
        diag2.assign(2 * n - 1, false);
        queens.assign(n, -1);
        solve(0);
        return solutions.size();
    }
};`,
        optimalTimeComplexity: 'O(N!) with aggressive pruning',
        optimalSpaceComplexity: 'O(N) state recursion stack',
        tradeoffs: [
            'Systematically explores decision space without evaluating dead-end branches.',
            'Uses boolean bitsets/arrays for O(1) safety validation.',
            'Finds all valid configurations or first valid configuration.'
        ],
        whyParadigmApplies: 'The problem involves sequential choices under strict mutual exclusion constraints where an invalid decision immediately disqualifies all descendant configurations.',
        whyOtherParadigmsFail: 'Greedy choice can lead directly into an unavoidable conflict. DP does not apply because intermediate board configurations cannot be easily memoized into overlapping independent values.',
        testCases: [
            { input: 4, expected: 2 },
            { input: 8, expected: 92 }
        ]
    },

    'sudoku_solver': {
        id: 'sudoku_solver',
        title: 'Sudoku Solver',
        paradigm: 'backtracking',
        description: 'Fill a 9x9 grid with digits 1-9 so that each column, row, and 3x3 box contains all digits 1-9 without duplicates.',
        subproblemCharacteristics: 'Each empty cell has 1-9 candidate digits subject to row, column, and box constraints.',
        optimalSubstructure: 'Constraint satisfaction search over the permutation grid.',
        naiveCodeCpp: `// Naive 9^(empty_cells) exploration without constraint propagation
`,
        naiveTimeComplexity: 'O(9^81)',
        naiveSpaceComplexity: 'O(1)',
        optimalCodeCpp: `// Backtracking Solver with Constraint Checks
bool isValid(const std::vector<std::vector<char>>& board, int row, int col, char c) {
    for (int i = 0; i < 9; i++) {
        if (board[row][i] == c) return false;
        if (board[i][col] == c) return false;
        if (board[3 * (row / 3) + i / 3][3 * (col / 3) + i % 3] == c) return false;
    }
    return true;
}

bool solveSudoku(std::vector<std::vector<char>>& board) {
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (board[r][c] == '.') {
                for (char ch = '1'; ch <= '9'; ch++) {
                    if (isValid(board, r, c, ch)) {
                        board[r][c] = ch;
                        if (solveSudoku(board)) return true;
                        board[r][c] = '.'; // Backtrack
                    }
                }
                return false; // Prune branch
            }
        }
    }
    return true;
}`,
        optimalTimeComplexity: 'O(9^m) where m is empty cells, drastically pruned',
        optimalSpaceComplexity: 'O(m) recursion stack',
        tradeoffs: [
            'Guaranteed to find a valid solution if one exists.',
            'Prunes immediately when any constraint is violated.',
            'Can be accelerated with Minimum Remaining Values (MRV) heuristic.'
        ],
        whyParadigmApplies: 'Decisions must be made under mutually coupled constraints with frequent backtrack recovery.',
        whyOtherParadigmsFail: 'Greedy choices fail due to future deadlocks; DP cannot collapse the combinatorial board state.',
        testCases: []
    }
};

