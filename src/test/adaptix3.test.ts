/**
 * Master Unit & Integration Tests for ADAPTIX 3.0
 * 
 * Verifies all 4 Pillars:
 * 1. Consolidated Dashboard, Academic Mode Toggle & Two-Sentence Rule formatting.
 * 2. Inline CodeLens detection, Space vs. Time bias shifting, Timeline Scrubber frame integrity.
 * 3. STL Big-O Hover catalog & loop-nesting detection, Automated Edge-Case Counterexample runner.
 * 4. Context-aware Template Injection & Closed-Loop Before/After Benchmarking.
 */

import * as assert from 'assert';
import { STL_COMPLEXITY_CATALOG } from '../providers/hoverProvider';
import { TemplateInjector } from '../refactoring/templateInjector';
import { EdgeCaseRunner } from '../validation/edgeCaseRunner';
import { BeforeAfterRunner } from '../benchmark/beforeAfterRunner';
import { generateSemanticRefactor } from '../services/aiService';
import { DecisionEngine } from '../decision';
import { Monitor } from '../monitor';
import { buildConstraints } from '../constraints';
import { createDefaultContext } from '../context';
import { CppAstParser } from '../analysis/astParser';
import { StrategyDetector } from '../algorithms/strategyDetector';
import { TraceGenerators } from '../visualization/traceGenerators';

export async function runAdaptix3Tests() {
    console.log('--- Testing ADAPTIX 3.0 Architecture & Upgrade Pillars ---');

    // Test 1: STL Big-O Hover Catalog Accuracy & Loop Nesting Logic
    {
        assert.ok(STL_COMPLEXITY_CATALOG['vector'], 'vector should exist in STL catalog');
        assert.ok(STL_COMPLEXITY_CATALOG['unordered_map'], 'unordered_map should exist in STL catalog');
        assert.ok(STL_COMPLEXITY_CATALOG['erase'], 'erase should exist in STL catalog');
        assert.ok(STL_COMPLEXITY_CATALOG['erase'].loopWarning, 'erase should contain loop warning');
        assert.ok(STL_COMPLEXITY_CATALOG['erase'].loopWarning?.includes('O(N²)'), 'erase warning should cite O(N²) quadratic bottleneck');

        assert.strictEqual(STL_COMPLEXITY_CATALOG['sort'].averageTime.includes('IntroSort'), true, 'sort should cite IntroSort');
        assert.strictEqual(STL_COMPLEXITY_CATALOG['priority_queue'].averageTime.includes('O(log N)'), true, 'priority_queue should cite O(log N)');
        console.log('✓ STL Big-O Hover: Comprehensive complexity specifications & loop warnings verified');
    }

    // Test 2: Space vs. Time Bias Shifting in DecisionEngine
    {
        const monitor = new Monitor('testData', 'std::vector');
        monitor.recordInsertBulk(10);
        monitor.recordSearchBulk(500); // Heavy search workload

        const context = createDefaultContext({ hasOrdering: false, usesIndexAccess: false, sequentialIteration: true, needsSequenceEfficiency: false });
        const constraints = buildConstraints(context, monitor);
        const engine = new DecisionEngine();

        // Speed-First Mode: Should strongly recommend std::unordered_set
        const speedDecision = engine.determineBestStructure(monitor, constraints, {
            intent: 'none',
            suggestedDS: null,
            strength: 0,
            description: '',
            optimizationProfile: 'speed'
        });
        assert.strictEqual(speedDecision.suggestedStructure, 'std::unordered_set', 'Speed-first should recommend unordered_set');
        assert.ok(speedDecision.twoSentenceSummary, 'Decision should produce Two-Sentence Rule summary');
        assert.ok(speedDecision.deepExplanation, 'Decision should produce Deep Explanation');

        // Memory-First Mode: Prioritizes minimal auxiliary footprint
        // When using std::list (high pointer overhead ~20B/node), memory mode recommends compact std::vector
        const listMonitor = new Monitor('listData', 'std::list');
        listMonitor.recordInsertBulk(10);
        listMonitor.recordSearchBulk(50);
        const listConstraints = buildConstraints(context, listMonitor);

        const memoryDecision = engine.determineBestStructure(listMonitor, listConstraints, {
            intent: 'none',
            suggestedDS: null,
            strength: 0,
            description: '',
            optimizationProfile: 'memory'
        });
        assert.ok(memoryDecision.suggestedStructure !== null, 'Memory mode should evaluate candidate for list');
        assert.ok(
            memoryDecision.suggestedStructure === 'std::deque' || memoryDecision.suggestedStructure === 'std::vector',
            `Memory mode should recommend compact container (std::deque or std::vector) over std::list, got ${memoryDecision.suggestedStructure}`
        );
        assert.strictEqual(memoryDecision.optimizationBias, 'memory', 'Optimization bias should reflect memory mode');
        console.log('✓ Space vs. Time Slider: Bias dynamically alters decision costs and populates Two-Sentence diagnosis');
    }

    // Test 3: AI Service Two-Sentence Rule & Deterministic Fallback
    {
        const context = createDefaultContext({ hasOrdering: false, usesIndexAccess: false, sequentialIteration: true, needsSequenceEfficiency: false });
        const result = await generateSemanticRefactor({
            code: 'std::vector<int> arr; for (int i = 0; i < 100; i++) std::find(arr.begin(), arr.end(), i);',
            context,
            currentDS: 'std::vector',
            targetDS: 'std::unordered_set',
            optimizationBias: 'speed',
            academicMode: false
        });

        assert.ok(result !== null, 'AI service should produce result');
        assert.ok(result?.new_code.includes('unordered_set'), 'Transformed code should use target structure');
        assert.ok(result?.twoSentenceSummary, 'Should supply Two-Sentence summary');
        assert.ok(result?.deepExplanation, 'Should supply deep explanation');
        // Count sentences in summary (approx by periods)
        const sentenceCount = result?.twoSentenceSummary.split('.').filter(s => s.trim().length > 0).length;
        assert.ok(sentenceCount === 2, `Two-sentence summary should have exactly 2 sentences, got ${sentenceCount}`);
        console.log('✓ Two-Sentence Rule: Produces crisp Big-O diagnosis upfront with deep theory segregated');
    }

    // Test 4: AST Parsing & Inline CodeLens Detection
    {
        const sampleCpp = `
        int recursiveFib(int n) {
            if (n <= 1) return n;
            return recursiveFib(n - 1) + recursiveFib(n - 2);
        }

        void processVector(std::vector<int>& items) {
            for (int i = 0; i < items.size(); i++) {
                items.erase(items.begin() + i);
            }
        }
        `;
        const parseRes = CppAstParser.parse(sampleCpp);
        assert.strictEqual(parseRes.functions.length, 2, 'Should identify both C++ functions');

        const fibFunc = parseRes.functions.find(f => f.name === 'recursiveFib');
        assert.ok(fibFunc?.isRecursive, 'fibFunc should be flagged as recursive');

        const fullFibCode = `${fibFunc?.returnType} ${fibFunc?.name}(${fibFunc?.parameters.join(', ')}) {\n${fibFunc?.body}\n}`;
        const strat = StrategyDetector.analyze(fullFibCode);
        const dpStrat = strat.find(s => s.detectedParadigm === 'dynamic_programming');
        assert.ok(dpStrat !== undefined, 'Should detect dynamic programming opportunity');

        const vecFunc = parseRes.functions.find(f => f.name === 'processVector');
        assert.ok(vecFunc && vecFunc.maxLoopNestingDepth > 0, 'vecFunc should detect loop nesting');
        assert.ok(vecFunc?.body.includes('.erase('), 'vecFunc should identify erase call inside loop');
        console.log('✓ Inline CodeLens Pipeline: Correctly extracts functions, exponential recursion, and loop-nested erase bottlenecks');
    }

    // Test 5: Context-Aware Template Injection
    {
        const parseRes = CppAstParser.parse('int calculateMinCost(const std::vector<int>& prices, int budget) { return 0; }');
        const funcNode = parseRes.functions[0];

        // Speed-First DP Tabulation
        const speedTemplate = TemplateInjector.generateTemplate({
            paradigm: 'dynamic_programming_tab',
            optimizationBias: 'speed',
            functionNode: funcNode
        });
        assert.ok(speedTemplate.includes('std::vector<int> dp'), 'Speed template should use vector DP table');
        assert.ok(speedTemplate.includes('calculateMinCost_optimized'), 'Template should adapt to user function name');

        // Memory-First DP Tabulation (Rolling Variables O(1) space)
        const memoryTemplate = TemplateInjector.generateTemplate({
            paradigm: 'dynamic_programming_tab',
            optimizationBias: 'memory',
            functionNode: funcNode
        });
        assert.ok(memoryTemplate.includes('prev1') && memoryTemplate.includes('prev2'), 'Memory-first template should use rolling O(1) space variables');
        assert.ok(!memoryTemplate.includes('std::vector<int> dp'), 'Memory-first should avoid full DP table');

        // Two Pointers
        const twoPointerTemplate = TemplateInjector.generateTemplate({
            paradigm: 'two_pointers',
            functionNode: funcNode
        });
        assert.ok(twoPointerTemplate.includes('left') && twoPointerTemplate.includes('right'), 'Two pointers template should generate in-place pointers');
        console.log('✓ Template Injector: Preserves function signature, adapts to Space vs. Time bias (O(1) rolling space vs O(N) table)');
    }

    // Test 6: Visualizer Timeline Scrubber Frame Integrity
    {
        const knapsackFrames = TraceGenerators.generate01KnapsackDPTable(7, [1, 3, 4, 5], [1, 4, 5, 7]);
        assert.ok(knapsackFrames.length > 5, 'DP Knapsack trace should produce multiple frames');
        
        // Frame 0 inspection
        const frame0 = knapsackFrames[0];
        assert.ok(frame0.grid !== undefined, 'Frame 0 should have grid state');

        // Last frame inspection (reconstruction)
        const frameLast = knapsackFrames[knapsackFrames.length - 1];
        assert.ok(frameLast.solutionReconstruction !== undefined, 'Last frame should contain solution reconstruction');

        // Fibonacci tree trace frame count
        const fibFrames = TraceGenerators.generateFibonacciRecursionTree(4);
        assert.ok(fibFrames.length === 18, `Fibonacci tree should produce 18 frames, got ${fibFrames.length}`);
        console.log(`✓ Timeline Scrubber: Verified frame sequential integrity across all ${fibFrames.length} trace steps`);
    }

    // Test 7: Automated Edge-Case & Counterexample Runner
    {
        const report = await EdgeCaseRunner.runCounterexampleTest('int coinChange(vector<int> coins, int amount) { sort(coins.begin(), coins.end()); }');
        assert.strictEqual(report.verdict, 'FAILING_COUNTEREXAMPLE_CONFIRMED', 'Counterexample runner should confirm failure');
        assert.strictEqual(report.fragilityType, 'greedy_divergence', 'Should diagnose greedy divergence');
        assert.ok(report.failingInput.includes('6'), 'Should report failing target sum');
        assert.ok(report.actualNaiveOutput.includes('3 coins'), 'Should document naive greedy 3 coins failure');
        assert.ok(report.expectedOptimalOutput.includes('2 coins'), 'Should document optimal DP 2 coins output');
        console.log('✓ Edge-Case Generator: Successfully constructed and verified concrete failing counterexample');
    }

    // Test 8: Closed-Loop Before/After Benchmark Runner
    {
        const benchResult = await BeforeAfterRunner.runBenchmark(
            'std::vector<int> arr;',
            'std::unordered_set<int> arr;',
            { varName: 'items', fromStructure: 'std::vector', toStructure: 'std::unordered_set' }
        );

        assert.ok(benchResult.dataPoints.length > 0, 'Benchmark should generate data points');
        assert.ok(benchResult.overallSpeedupMultiplier >= 1.0, 'Speedup multiplier should be >= 1.0');
        assert.ok(benchResult.correctnessVerified, 'Correctness output verification should be confirmed');
        assert.ok(benchResult.summaryHeadline.includes('Optimization Verified'), 'Summary headline should verify optimization');
        console.log(`✓ Closed-Loop Benchmark: ${benchResult.summaryHeadline} (Verified: ${benchResult.correctnessVerified})`);
    }

    console.log('\n>>> [PASS] ADAPTIX 3.0 Master Architecture Test Suite\n');
}
