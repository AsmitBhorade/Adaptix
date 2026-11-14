import * as vscode from 'vscode';
import { AnalysisContext } from '../analyzer';

export interface StlSymbolComplexity {
    symbol: string;
    category: 'container' | 'member_function' | 'algorithm';
    averageTime: string;
    amortizedTime?: string;
    worstCaseTime: string;
    spaceComplexity: string;
    description: string;
    loopWarning?: string;
}

export const STL_COMPLEXITY_CATALOG: Record<string, StlSymbolComplexity> = {
    // Containers
    'vector': {
        symbol: 'std::vector',
        category: 'container',
        averageTime: 'Access: O(1) | Append: O(1) amortized | Insert/Erase: O(N)',
        amortizedTime: 'O(1) push_back amortized, O(N) reallocation capacity geometric expansion',
        worstCaseTime: 'Insert/Erase at front/middle: O(N)',
        spaceComplexity: 'O(N) contiguous memory (capacity overhead up to 2x)',
        description: 'Contiguous sequence container with cache-friendly locality. Optimal for random access and back operations.'
    },
    'list': {
        symbol: 'std::list',
        category: 'container',
        averageTime: 'Access: O(N) | Insert/Erase with iterator: O(1)',
        worstCaseTime: 'Access/Search: O(N) linear traversal',
        spaceComplexity: 'O(N) with ~24 bytes pointer overhead per node (prev + next + data)',
        description: 'Doubly-linked list supporting constant-time insertions and removals anywhere, but with zero random access and high pointer overhead.'
    },
    'deque': {
        symbol: 'std::deque',
        category: 'container',
        averageTime: 'Access: O(1) | Push/Pop Front & Back: O(1)',
        worstCaseTime: 'Insert/Erase in middle: O(N)',
        spaceComplexity: 'O(N) chunked array buffers (minimal reallocation copying)',
        description: 'Double-ended queue with chunk-allocated fixed-size buffers. Fast front and back insertions without invalidating entire memory block.'
    },
    'unordered_map': {
        symbol: 'std::unordered_map',
        category: 'container',
        averageTime: 'Lookup / Insert / Erase: O(1) expected',
        amortizedTime: 'O(1) average hash table bucket lookup',
        worstCaseTime: 'O(N) under hash collision degeneracy',
        spaceComplexity: 'O(N) hash table with bucket array + node pointers (~36 bytes/node)',
        description: 'Hash-table-based key-value associative container. Fastest expected lookup when keys are hashed uniformly.'
    },
    'unordered_set': {
        symbol: 'std::unordered_set',
        category: 'container',
        averageTime: 'Lookup / Insert / Erase: O(1) expected',
        amortizedTime: 'O(1) average hash table bucket lookup',
        worstCaseTime: 'O(N) under hash collision degeneracy',
        spaceComplexity: 'O(N) bucket overhead + node overhead',
        description: 'Hash-table-based unique element set container. O(1) membership testing.'
    },
    'map': {
        symbol: 'std::map',
        category: 'container',
        averageTime: 'Lookup / Insert / Erase: O(log N)',
        worstCaseTime: 'O(log N) guaranteed via self-balancing Red-Black Tree',
        spaceComplexity: 'O(N) with 3 pointers (parent, left, right) + color bit (~32 bytes/node)',
        description: 'Ordered key-value associative container backed by Red-Black Tree. Maintains strict ascending key order.'
    },
    'set': {
        symbol: 'std::set',
        category: 'container',
        averageTime: 'Lookup / Insert / Erase: O(log N)',
        worstCaseTime: 'O(log N) guaranteed via Red-Black Tree',
        spaceComplexity: 'O(N) node overhead',
        description: 'Ordered unique element container backed by Red-Black Tree. Always sorted; supports range queries and lower_bound.'
    },
    'priority_queue': {
        symbol: 'std::priority_queue',
        category: 'container',
        averageTime: 'Top: O(1) | Push / Pop: O(log N)',
        worstCaseTime: 'O(log N) binary max/min-heap sift-up / sift-down',
        spaceComplexity: 'O(N) backed by contiguous std::vector',
        description: 'Container adapter providing constant-time lookup of the largest (or smallest) element using a binary heap.'
    },

    // Container Member Methods
    'push_back': {
        symbol: 'push_back',
        category: 'member_function',
        averageTime: 'O(1) amortized',
        worstCaseTime: 'O(N) when vector reaches capacity and must allocate new buffer and copy all elements',
        spaceComplexity: 'O(1) auxiliary',
        description: 'Appends an element to the end of the sequence container.'
    },
    'push_front': {
        symbol: 'push_front',
        category: 'member_function',
        averageTime: 'O(1) for std::list / std::deque',
        worstCaseTime: 'O(1) for std::deque / std::list | Not supported on std::vector',
        spaceComplexity: 'O(1)',
        description: 'Prepends an element to the beginning of the container.'
    },
    'erase': {
        symbol: 'erase',
        category: 'member_function',
        averageTime: 'Vector: O(N) | List: O(1) with iterator | Unordered: O(1) | Map/Set: O(log N)',
        worstCaseTime: 'Vector: O(N) shifting elements | Unordered: O(N) collision',
        spaceComplexity: 'O(1)',
        description: 'Removes elements from the container.',
        loopWarning: 'Calling std::vector::erase inside a loop creates an O(N²) quadratic bottleneck due to repeated element shifting. Consider using std::unordered_set or the erase-remove idiom.'
    },
    'insert': {
        symbol: 'insert',
        category: 'member_function',
        averageTime: 'Vector: O(N) | List: O(1) with iterator | Unordered: O(1) avg | Map: O(log N)',
        worstCaseTime: 'Vector: O(N) shift | Unordered: O(N) hash collision',
        spaceComplexity: 'O(1)',
        description: 'Inserts elements into the container.',
        loopWarning: 'Calling vector::insert at non-terminal positions inside a loop causes repeated memory shifts (O(N²)). Consider std::list or pre-allocating.'
    },
    'find': {
        symbol: 'find',
        category: 'member_function',
        averageTime: 'Unordered: O(1) | Map/Set: O(log N) | std::find(Vector): O(N)',
        worstCaseTime: 'std::find: O(N) | Map/Set: O(log N) | Unordered: O(N) collision',
        spaceComplexity: 'O(1)',
        description: 'Searches the container for a specified element or key.',
        loopWarning: 'Linear search (std::find or iteration) inside a loop results in O(N²) or O(N*M) complexity. Migrate to std::unordered_set / std::unordered_map for O(1) lookup.'
    },
    'count': {
        symbol: 'count',
        category: 'member_function',
        averageTime: 'Unordered: O(1) | Map/Set: O(log N)',
        worstCaseTime: 'Unordered: O(N) | Map/Set: O(log N)',
        spaceComplexity: 'O(1)',
        description: 'Returns the number of elements matching the specified key.'
    },
    'at': {
        symbol: 'at',
        category: 'member_function',
        averageTime: 'Vector/Deque: O(1) bounds-checked | Map: O(log N) | Unordered: O(1)',
        worstCaseTime: 'Vector/Deque: O(1) throws std::out_of_range | Map: O(log N)',
        spaceComplexity: 'O(1)',
        description: 'Returns a reference to the element at specified index/key with bounds checking.'
    },

    // STL Algorithms
    'sort': {
        symbol: 'std::sort',
        category: 'algorithm',
        averageTime: 'O(N log N) IntroSort (QuickSort + HeapSort + InsertionSort hybrid)',
        worstCaseTime: 'O(N log N) guaranteed by switching to HeapSort when recursion depth exceeds 2*log(N)',
        spaceComplexity: 'O(log N) stack frames',
        description: 'Non-stable sort using introsort. Does not preserve the relative order of equivalent elements.'
    },
    'stable_sort': {
        symbol: 'std::stable_sort',
        category: 'algorithm',
        averageTime: 'O(N log N) Adaptive MergeSort',
        worstCaseTime: 'O(N log N) if extra memory available, O(N log² N) if in-place',
        spaceComplexity: 'O(N) auxiliary memory buffer',
        description: 'Sorts elements while preserving relative order of equivalent elements.'
    },
    'lower_bound': {
        symbol: 'std::lower_bound',
        category: 'algorithm',
        averageTime: 'O(log N) on random-access iterators | O(N) on non-random-access iterators',
        worstCaseTime: 'O(log N) comparisons on vector/deque, but O(N) iterator advances on std::list',
        spaceComplexity: 'O(1)',
        description: 'Binary search returning iterator to first element not less than value. Requires range to be sorted.',
        loopWarning: 'Calling std::lower_bound on non-random access containers (like std::list) takes O(N) iterator steps, defeating binary search!'
    },
    'upper_bound': {
        symbol: 'std::upper_bound',
        category: 'algorithm',
        averageTime: 'O(log N) on random-access iterators',
        worstCaseTime: 'O(log N)',
        spaceComplexity: 'O(1)',
        description: 'Binary search returning iterator to first element strictly greater than value. Requires range to be sorted.'
    },
    'binary_search': {
        symbol: 'std::binary_search',
        category: 'algorithm',
        averageTime: 'O(log N) on random-access iterators',
        worstCaseTime: 'O(log N)',
        spaceComplexity: 'O(1)',
        description: 'Checks whether an element equivalent to value exists in sorted range.'
    },
    'reverse': {
        symbol: 'std::reverse',
        category: 'algorithm',
        averageTime: 'O(N) linear bidirectional swaps',
        worstCaseTime: 'O(N)',
        spaceComplexity: 'O(1) in-place',
        description: 'Reverses the order of elements in the given range.'
    }
};

export class AdaptixHoverProvider implements vscode.HoverProvider {
    constructor(private readonly getAnalysisMap: () => Map<string, AnalysisContext>) {}

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);
        const lineText = document.lineAt(position.line).text;

        // 1. Check if hovering over a tracked variable in current analysis
        const analysisMap = this.getAnalysisMap();
        const varAnalysis = analysisMap.get(word);

        if (varAnalysis) {
            return this.buildVariableHover(word, varAnalysis);
        }

        // 2. Check if hovering over an STL container, member function, or algorithm
        const cleanSymbol = word.replace(/^std::/, '');
        const stlInfo = STL_COMPLEXITY_CATALOG[cleanSymbol] || STL_COMPLEXITY_CATALOG[word];

        if (stlInfo) {
            const isInsideLoop = this.detectLoopNesting(document, position.line);
            return this.buildStlHover(stlInfo, isInsideLoop, lineText);
        }

        return null;
    }

    /**
     * Inspects preceding lines in the function scope to determine if line is inside a loop
     */
    public detectLoopNesting(document: vscode.TextDocument, targetLine: number): boolean {
        let loopDepth = 0;
        const scanStart = Math.max(0, targetLine - 50);

        for (let i = scanStart; i <= targetLine; i++) {
            const text = document.lineAt(i).text.trim();
            // Match for/while/do loops
            if (/\b(for|while)\s*\(/.test(text) || /\bdo\s*\{/.test(text)) {
                loopDepth++;
            }
            if (text.includes('}') && loopDepth > 0) {
                // Approximate scope close
                if (!text.includes('{')) {
                    loopDepth = Math.max(0, loopDepth - 1);
                }
            }
        }
        return loopDepth > 0;
    }

    private buildStlHover(info: StlSymbolComplexity, isInsideLoop: boolean, _lineText: string): vscode.Hover {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;

        const categoryTag = info.category === 'container' ? '📦 STL Container' :
                            info.category === 'member_function' ? '⚙️ Container Member Method' : '⚡ STL Algorithm';

        md.appendMarkdown(`### \`${info.symbol}\` — ${categoryTag}\n\n`);
        md.appendMarkdown(`*${info.description}*\n\n`);

        md.appendMarkdown(`| Metric | Complexity |\n`);
        md.appendMarkdown(`| :--- | :--- |\n`);
        md.appendMarkdown(`| **Average Time** | \`${info.averageTime}\` |\n`);
        if (info.amortizedTime) {
            md.appendMarkdown(`| **Amortized Time** | \`${info.amortizedTime}\` |\n`);
        }
        md.appendMarkdown(`| **Worst-Case Time** | \`${info.worstCaseTime}\` |\n`);
        md.appendMarkdown(`| **Auxiliary Space** | \`${info.spaceComplexity}\` |\n\n`);

        if (isInsideLoop && info.loopWarning) {
            md.appendMarkdown(`> ⚠️ **Loop Nesting Warning**\n>\n> ${info.loopWarning}\n\n`);
        }

        md.appendMarkdown(`---\n*ADAPTIX 3.0 Big-O Live Inspector*`);
        return new vscode.Hover(md);
    }

    private buildVariableHover(varName: string, ctx: AnalysisContext): vscode.Hover {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;

        md.appendMarkdown(`### Adaptix Analysis: \`${varName}\`\n\n`);
        md.appendMarkdown(`- **Current Structure:** \`${ctx.monitor.currentStructure}\`\n`);
        md.appendMarkdown(`- **Total Operations:** \`${ctx.monitor.totalOperations}\` (Ins: ${ctx.monitor.insertCount}, Src: ${ctx.monitor.searchCount}, Del: ${ctx.monitor.deleteCount})\n`);

        if (ctx.decision && ctx.decision.suggestedStructure) {
            const speedup = ctx.decision.speedup || 'Faster';
            md.appendMarkdown(`- **Suggested Optimization:** \`${ctx.decision.suggestedStructure}\`\n`);
            md.appendMarkdown(`- **Expected Speedup:** **${speedup}** (${ctx.decision.confidenceLabel} Confidence)\n`);
            md.appendMarkdown(`- **Reason:** ${ctx.decision.reason}\n\n`);
            md.appendMarkdown(`[⚡ Apply Refactor](command:adaptix.applyRefactor?${encodeURIComponent(JSON.stringify([varName, ctx.decision.suggestedStructure]))}) | `);
            md.appendMarkdown(`[🔍 Preview Smart Diff](command:adaptix.openSmartDiff?${encodeURIComponent(JSON.stringify([varName, ctx.decision.suggestedStructure]))})\n`);
        } else {
            md.appendMarkdown(`- **Status:** Structure usage is optimal for observed access patterns.\n`);
        }

        md.appendMarkdown(`\n---\n*ADAPTIX 3.0 Code Intelligence*`);
        return new vscode.Hover(md);
    }
}

