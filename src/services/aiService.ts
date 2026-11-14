/**
 * Adaptix 3.0 AI Service for Semantic Refactoring
 * 
 * Interfaces with LLM / local Qwen Coder to generate semantic code transformations.
 * Enforces:
 * 1. The Two-Sentence Rule (sharp 2-sentence diagnosis with Big-O impact upfront).
 * 2. Academic Mode toggle (deep theoretical explanations behind expandable accordion when OFF).
 * 3. Space vs. Time Optimization Bias (Memory-First vs Balanced vs Speed-First).
 * 
 * STRICT ARCHITECTURAL PRINCIPLE:
 * The AI only generates code; static AST & cost engines determine data structures and validate safety.
 */

import { Context } from '../context';
import { logDebug, logWarn } from '../logger';

export interface SemanticRefactorInput {
    code: string;
    context: Context;
    currentDS: string;
    targetDS: string;
    optimizationBias?: 'speed' | 'balanced' | 'memory';
    academicMode?: boolean;
}

export interface SemanticRefactorResult {
    new_code: string;
    changes: string[];
    warnings: string[];
    twoSentenceSummary: string;
    deepExplanation: string;
}

/**
 * Triggers the AI to generate a semantic refactoring.
 * Designed to connect to a local Qwen3 Coder instance via Ollama with fallback.
 */
export async function generateSemanticRefactor(input: SemanticRefactorInput): Promise<SemanticRefactorResult | null> {
    const bias = input.optimizationBias || 'speed';
    const academic = input.academicMode || false;

    // 1. Build bias-specific directives
    let biasDirective = '';
    if (bias === 'memory') {
        biasDirective = `CRITICAL OPTIMIZATION BIAS: MEMORY-FIRST [O(1) Space].
Prioritize in-place algorithms, iterative two-pointer patterns, bit manipulation, and compact containers.
Avoid large hash tables, duplicate buffers, or redundant state memoization tables. Keep auxiliary space O(1) where possible.`;
    } else if (bias === 'speed') {
        biasDirective = `CRITICAL OPTIMIZATION BIAS: SPEED-FIRST [O(1)/O(N) Time].
Prioritize memoization, tabulation, hash-based O(1) lookups (std::unordered_map, std::unordered_set), and precomputation.
Sacrifice auxiliary memory freely if it achieves maximum CPU throughput.`;
    } else {
        biasDirective = `CRITICAL OPTIMIZATION BIAS: BALANCED.
Maintain a balanced compromise between CPU execution time and per-element memory overhead.`;
    }

    // 2. Build target-specific guidance to prevent AI hallucination
    let dsGuidance = '';
    const target = input.targetDS;
    if (target === 'std::unordered_set' || target === 'std::unordered_map') {
        dsGuidance = `Use std::${target.replace('std::', '')} from <${target.replace('std::', '')}>.
Replace linear search (std::find, for-loop search) with .find() method.
Replace push_back/insert with .insert(). This is a container swap — do NOT create custom structs.`;
    } else if (target === 'std::set' || target === 'std::map') {
        dsGuidance = `Use std::${target.replace('std::', '')} from <${target.replace('std::', '')}>.
Replace linear search with .find()/.count(). Replace push_back with .insert().`;
    } else if (target === 'std::deque') {
        dsGuidance = `Use std::deque from <deque>. Near drop-in replacement for std::vector with O(1) push_front/pop_front.`;
    } else if (target === 'std::priority_queue') {
        dsGuidance = `Use std::priority_queue from <queue>. Replace sort+front access with .push() and .top()/.pop().`;
    } else if (target === 'Trie') {
        dsGuidance = `Implement a lightweight TrieNode struct with children[26] and bool isEnd for prefix matching.`;
    } else if (target === 'Segment Tree') {
        dsGuidance = `Use Segment Tree for O(log N) range sum/min/max queries and point updates.`;
    } else if (target === 'Skip List') {
        dsGuidance = `Implement a probabilistic skip list with levels for O(log N) search on linked data.`;
    }

    const twoSentenceRulePrompt = `TWO-SENTENCE RULE ENFORCEMENT:
Provide a "twoSentenceSummary" containing EXACTLY two crisp sentences:
Sentence 1: State the exact bottleneck and its asymptotic Big-O cost in the original code.
Sentence 2: State the concrete optimization applied and the resulting asymptotic improvement.
Provide the deeper mathematical proofs, recurrence relations, and theoretical trade-offs in "deepExplanation".`;

    const prompt = `You are an expert C++ performance engineer and compiler specialist.
Refactor the provided code to use ${input.targetDS}.

${biasDirective}

${twoSentenceRulePrompt}

TARGET DATA STRUCTURE GUIDANCE:
${dsGuidance}

Academic Mode Active: ${academic ? 'YES (Full DAA theoretical breakdown requested)' : 'NO (Concise production developer format)'}
Original Data Structure: ${input.currentDS}

Code:
\`\`\`cpp
${input.code}
\`\`\`

Output STRICT JSON matching this schema:
{
  "new_code": "string (the complete refactored C++ file)",
  "changes": ["string (list each specific change made)"],
  "warnings": ["string (any caveats or considerations)"],
  "twoSentenceSummary": "string (strictly two sentences diagnosing Big-O bottleneck and concrete improvement)",
  "deepExplanation": "string (expanded theoretical explanation, recurrence derivation, or memory analysis)"
}
`;

    logDebug('AIService', 'Requesting semantic refactor with Two-Sentence Rule and Bias', {
        targetDS: input.targetDS,
        bias,
        academic
    });

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-oss:120b-cloud',
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) {
            throw new Error(`AI API returned status ${response.status}`);
        }

        const data = await response.json() as { response: string };
        let cleanJson = data.response.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.substring(7);
        else if (cleanJson.startsWith('```')) cleanJson = cleanJson.substring(3);
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.length - 3);
        cleanJson = cleanJson.trim();

        const parsed = JSON.parse(cleanJson) as SemanticRefactorResult;

        return {
            new_code: parsed.new_code || input.code,
            changes: parsed.changes || [],
            warnings: parsed.warnings || [],
            twoSentenceSummary: parsed.twoSentenceSummary || formatDefaultTwoSentence(input),
            deepExplanation: parsed.deepExplanation || formatDefaultDeepExplanation(input)
        };
    } catch (error) {
        logWarn('AIService', `Local AI offline; generating deterministic semantic refactor: ${error}`);
        // Deterministic fallback matching Two-Sentence Rule
        return generateDeterministicFallback(input);
    }
}

function formatDefaultTwoSentence(input: SemanticRefactorInput): string {
    const from = input.currentDS.replace('std::', '');
    const to = input.targetDS.replace('std::', '');
    return `Linear traversal across ${from} incurs an inefficient O(N) cost per query. Refactoring to ${to} delivers amortized O(1) lookups, boosting throughput by orders of magnitude.`;
}

function formatDefaultDeepExplanation(input: SemanticRefactorInput): string {
    const from = input.currentDS;
    const to = input.targetDS;
    return `Asymptotic Analysis:
• Current Container (${from}): Element lookup relies on sequential memory traversal, requiring N comparisons in the worst case.
• Target Container (${to}): Utilizes hash-bucket indexing or self-balancing binary search tree invariants to guarantee sub-linear O(log N) or constant O(1) access.
• Memory Trade-off: Additional per-node pointer overhead (~24-36 bytes per entry) is exchanged for dramatic execution speedups on high-frequency query workloads.`;
}

function generateDeterministicFallback(input: SemanticRefactorInput): SemanticRefactorResult {
    const from = input.currentDS.replace('std::', '');
    const to = input.targetDS.replace('std::', '');
    const cleanTo = input.targetDS;

    let refactored = input.code;
    const headerInclude = `#include <${to}>\n`;

    if (!refactored.includes(`<${to}>`)) {
        refactored = headerInclude + refactored;
    }

    // Replace declaration
    const declRegex = new RegExp(`(?:std::)?${from}\\s*<([^>]+)>\\s+(\\w+)`, 'g');
    refactored = refactored.replace(declRegex, `${cleanTo}<$1> $2`);

    // Replace .find iteration with container find
    if (to.includes('unordered_set') || to.includes('set')) {
        refactored = refactored.replace(/\bstd::find\s*\(\s*(\w+)\.begin\(\)\s*,\s*\1\.end\(\)\s*,\s*([^)]+)\)\s*!=\s*\1\.end\(\)/g, '$1.find($2) != $1.end()');
        refactored = refactored.replace(/\b(\w+)\.push_back\s*\(/g, '$1.insert(');
    }

    return {
        new_code: refactored,
        changes: [
            `Replaced container declaration from ${from} to ${to}`,
            `Transformed linear search into native O(1) hash membership inspection`,
            `Updated insertion semantics to .insert()`
        ],
        warnings: [
            `Deterministic fallback generated without live LLM connection. Review generated syntax.`
        ],
        twoSentenceSummary: formatDefaultTwoSentence(input),
        deepExplanation: formatDefaultDeepExplanation(input)
    };
}

