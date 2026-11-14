import * as vscode from 'vscode';
import { CppFunctionNode } from '../analysis/astParser';
import { AdaptixDiffContentProvider } from '../providers/diffContentProvider';

export type TemplateParadigm =
    | 'dynamic_programming_memo'
    | 'dynamic_programming_tab'
    | 'divide_and_conquer'
    | 'sliding_window'
    | 'two_pointers'
    | 'binary_search_answer'
    | 'backtracking_pruning';

export interface TemplateInjectionOptions {
    paradigm: TemplateParadigm;
    optimizationBias?: 'speed' | 'balanced' | 'memory';
    functionNode?: CppFunctionNode;
}

export class TemplateInjector {
    /**
     * Generates context-aware, idiomatic C++ boilerplate pre-populated
     * with the user's actual function signature, return type, and parameter names.
     */
    public static generateTemplate(options: TemplateInjectionOptions): string {
        const func = options.functionNode;
        const funcName = func ? func.name : 'solve';
        const returnType = func ? func.returnType : 'int';
        const rawParams = func && func.parameters.length > 0
            ? func.parameters.join(', ')
            : 'const std::vector<int>& arr, int target';

        // Extract primary parameter name
        const primaryParam = func && func.parameters.length > 0
            ? func.parameters[0].split(/\s+/).pop()?.replace(/[*&]/g, '') || 'n'
            : 'n';

        const bias = options.optimizationBias || 'speed';

        switch (options.paradigm) {
            case 'dynamic_programming_tab':
                if (bias === 'memory') {
                    // Memory-First: Rolling variables O(1) space
                    return `// ADAPTIX 3.0: Memory-Optimized DP Tabulation (Rolling Variables - O(1) Auxiliary Space)
${returnType} ${funcName}_optimized(${rawParams}) {
    if (${primaryParam} <= 1) return ${primaryParam};
    
    // Space-Optimized Rolling State (Eliminates O(N) table allocation)
    ${returnType} prev2 = 0;
    ${returnType} prev1 = 1;
    ${returnType} current = 0;

    for (int i = 2; i <= ${primaryParam}; ++i) {
        current = prev1 + prev2; // Recurrence transition
        prev2 = prev1;
        prev1 = current;
    }
    return current;
}`;
                } else {
                    // Speed-First: Flat vector DP table
                    return `// ADAPTIX 3.0: Bottom-Up DP Tabulation (Iterative O(N) Time - Cache Friendly)
#include <vector>

${returnType} ${funcName}_optimized(${rawParams}) {
    if (${primaryParam} <= 1) return ${primaryParam};

    // Pre-allocated contiguous DP table
    std::vector<${returnType}> dp(${primaryParam} + 1, 0);
    dp[0] = 0;
    dp[1] = 1;

    for (int i = 2; i <= ${primaryParam}; ++i) {
        dp[i] = dp[i - 1] + dp[i - 2]; // O(1) table lookup
    }
    return dp[${primaryParam}];
}`;
                }

            case 'dynamic_programming_memo':
                return `// ADAPTIX 3.0: Top-Down DP with Memoization (O(N) Time, O(N) Space)
#include <unordered_map>

${returnType} ${funcName}_memoHelper(int state, std::unordered_map<int, ${returnType}>& memo) {
    // Base Cases
    if (state <= 1) return state;

    // Check Memoization Cache (O(1) expected lookup)
    auto it = memo.find(state);
    if (it != memo.end()) return it->second;

    // Compute & Store
    return memo[state] = ${funcName}_memoHelper(state - 1, memo) + ${funcName}_memoHelper(state - 2, memo);
}

${returnType} ${funcName}_optimized(${rawParams}) {
    std::unordered_map<int, ${returnType}> memo;
    return ${funcName}_memoHelper(${primaryParam}, memo);
}`;

            case 'divide_and_conquer':
                return `// ADAPTIX 3.0: Divide and Conquer Template (Master Theorem Theta(N log N))
#include <vector>

void ${funcName}_combine(std::vector<int>& arr, int left, int mid, int right) {
    std::vector<int> temp(right - left + 1);
    int i = left, j = mid + 1, k = 0;
    while (i <= mid && j <= right) {
        temp[k++] = (arr[i] <= arr[j]) ? arr[i++] : arr[j++];
    }
    while (i <= mid) temp[k++] = arr[i++];
    while (j <= right) temp[k++] = arr[j++];
    for (int p = 0; p < k; ++p) arr[left + p] = temp[p];
}

void ${funcName}_divideAndConquer(std::vector<int>& arr, int left, int right) {
    if (left >= right) return; // Base Case

    // Overflow-Safe Midpoint Calculation
    int mid = left + (right - left) / 2;

    // Solve strictly independent subproblems
    ${funcName}_divideAndConquer(arr, left, mid);
    ${funcName}_divideAndConquer(arr, mid + 1, right);

    // Linear Combine Step
    ${funcName}_combine(arr, left, mid, right);
}`;

            case 'two_pointers':
                return `// ADAPTIX 3.0: In-Place Two Pointers Pattern (O(N) Time, O(1) Auxiliary Memory)
#include <vector>

${returnType} ${funcName}_twoPointers(std::vector<int>& arr, int target) {
    int left = 0;
    int right = static_cast<int>(arr.size()) - 1;

    while (left < right) {
        int currentSum = arr[left] + arr[right];
        if (currentSum == target) {
            return 1; // Found optimal match
        } else if (currentSum < target) {
            left++;  // Monotonically increase lower bound
        } else {
            right--; // Monotonically decrease upper bound
        }
    }
    return 0;
}`;

            case 'sliding_window':
                return `// ADAPTIX 3.0: Monotonic Sliding Window (Amortized O(N) Time, O(1) Extra Space)
#include <vector>
#include <algorithm>

${returnType} ${funcName}_slidingWindow(const std::vector<int>& arr, int k) {
    int n = static_cast<int>(arr.size());
    if (n < k) return 0;

    int windowSum = 0;
    for (int i = 0; i < k; ++i) windowSum += arr[i];

    int maxSum = windowSum;
    for (int right = k; right < n; ++right) {
        windowSum += arr[right] - arr[right - k]; // Slide window in O(1)
        maxSum = std::max(maxSum, windowSum);
    }
    return maxSum;
}`;

            case 'binary_search_answer':
                return `// ADAPTIX 3.0: Binary Search on Monotonic Answer Space (O(N log(Range)))
#include <vector>

bool ${funcName}_isValid(long long mid, const std::vector<int>& arr, int k) {
    // Monotonic Feasibility Check (Predicated Condition)
    int required = 1;
    long long current = 0;
    for (int val : arr) {
        if (current + val > mid) {
            required++;
            current = val;
        } else {
            current += val;
        }
    }
    return required <= k;
}

long long ${funcName}_binarySearchAnswer(const std::vector<int>& arr, int k) {
    long long low = 1;
    long long high = 1e14; // Upper boundary of feasible space
    long long answer = high;

    while (low <= high) {
        long long mid = low + (high - low) / 2; // Overflow-Safe
        if (${funcName}_isValid(mid, arr, k)) {
            answer = mid;
            high = mid - 1; // Try minimizing
        } else {
            low = mid + 1;  // Infeasible, shift right
        }
    }
    return answer;
}`;

            case 'backtracking_pruning':
            default:
                return `// ADAPTIX 3.0: Backtracking with Constraint Pruning & State Rollback
#include <vector>

void ${funcName}_backtrack(int depth, std::vector<int>& state, std::vector<std::vector<int>>& solutions) {
    // 1. Goal State Reached
    if (depth == 4) {
        solutions.push_back(state);
        return;
    }

    for (int choice = 0; choice < 4; ++choice) {
        // 2. Pruning Condition (Bounding Function)
        bool isValid = true;
        for (int prev : state) {
            if (prev == choice) { isValid = false; break; }
        }
        if (!isValid) continue; // Prune branch early!

        // 3. Make Decision & Recurse
        state.push_back(choice);
        ${funcName}_backtrack(depth + 1, state, solutions);

        // 4. State Rollback (Backtrack)
        state.pop_back();
    }
}`;
        }
    }

    /**
     * Injects the template directly into the active editor via WorkspaceEdit
     */
    public static async injectIntoEditor(
        editor: vscode.TextEditor,
        templateCode: string,
        functionNode?: CppFunctionNode
    ): Promise<boolean> {
        const edit = new vscode.WorkspaceEdit();

        if (functionNode) {
            // Insert directly after the function or replace
            const targetPos = new vscode.Position(functionNode.endLine + 1, 0);
            edit.insert(editor.document.uri, targetPos, `\n${templateCode}\n`);
        } else {
            // Append at the cursor position
            edit.insert(editor.document.uri, editor.selection.active, `\n${templateCode}\n`);
        }

        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            vscode.window.showInformationMessage('Adaptix 3.0: Algorithmic template injected successfully!');
        }
        return success;
    }

    /**
     * Previews the template in native VS Code Smart Diff
     */
    public static async previewInSmartDiff(
        editor: vscode.TextEditor,
        templateCode: string,
        functionNode?: CppFunctionNode
    ): Promise<void> {
        const fullText = editor.document.getText();
        let proposedCode = fullText;

        if (functionNode) {
            const lines = fullText.split('\n');
            const before = lines.slice(0, functionNode.startLine - 1).join('\n');
            const after = lines.slice(functionNode.endLine).join('\n');
            proposedCode = `${before}\n${templateCode}\n${after}`;
        } else {
            proposedCode = `${fullText}\n\n${templateCode}`;
        }

        const diffProvider = AdaptixDiffContentProvider.getInstance();
        await diffProvider.openDiff(
            editor.document.uri,
            proposedCode,
            `Adaptix Template Preview: ${functionNode ? functionNode.name : 'Algorithm Refactor'}`
        );
    }
}

