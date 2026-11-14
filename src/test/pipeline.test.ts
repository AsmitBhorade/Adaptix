/**
 * Unit Tests for Unified Intelligence Pipeline
 */

import * as assert from 'assert';
import { UnifiedPipeline } from '../pipeline/unifiedPipeline';
import { Analyzer } from '../analyzer';

export function runPipelineTests() {
    console.log('--- Testing Unified Intelligence Pipeline ---');

    // Test 1: Combined Code Analysis (Data Structure + Algorithm Strategy)
    {
        const code = `
        #include <vector>
        #include <iostream>

        // Recursive Fibonacci - exponential DP candidate
        int fib(int n) {
            if (n <= 1) return n;
            return fib(n - 1) + fib(n - 2);
        }

        int main() {
            std::vector<int> lookups;
            for(int i = 0; i < 50; i++) {
                lookups.push_back(i);
            }
            // Linear search heavy
            for(int i = 0; i < 500; i++) {
                for(int j = 0; j < lookups.size(); j++) {
                    if (lookups[j] == i) break;
                }
            }
            return 0;
        }
        `;

        const pipeline = new UnifiedPipeline(new Analyzer());
        const report = pipeline.analyze(code);

        // Verify Data Structure insights
        assert.ok(report.dataStructures.trackedVariablesCount >= 1, 'Should track lookups variable');
        assert.ok(report.dataStructures.primaryRecommendation !== undefined, 'Should recommend data structure upgrade for vector');

        // Verify Algorithm Strategy insights
        assert.strictEqual(report.algorithmStrategy.dominantParadigm, 'dynamic_programming', 'Should detect Dynamic Programming');
        assert.strictEqual(report.algorithmStrategy.hasExponentialRecursion, true, 'Should detect exponential recursion');

        // Verify Visualizer recommendation
        assert.ok(report.suggestedVisualizer.mode === 'recursion_tree' || report.suggestedVisualizer.mode === 'dp_table', 'Should recommend tree or table visualizer');

        // Verify Executive actions
        assert.ok(report.executiveSummary.recommendedActions.length >= 2, 'Should provide at least 2 cross-cutting recommendations');

        console.log(`✓ Unified Pipeline: Cross-cutting synthesis combining DS (${report.dataStructures.primaryRecommendation?.suggested}) and Algorithm (${report.algorithmStrategy.dominantParadigm})`);
    }

    // Test 2: TSP NP-Hard Problem Pipeline Routing
    {
        const tspCode = `
        struct City { int x, y; };
        double tsp_tour_distance(const std::vector<City>& cities) {
            double total = 0.0;
            // salesman visiting each city
            return total;
        }
        `;
        const pipeline = new UnifiedPipeline(new Analyzer());
        const report = pipeline.analyze(tspCode);

        assert.strictEqual(report.computationalHardness.isKnownNPHard, true, 'Should flag TSP as NP-Hard');
        assert.strictEqual(report.computationalHardness.matchedProblem?.id, 'tsp');
        assert.ok(report.suggestedVisualizer.title.includes('TSP') || report.suggestedVisualizer.title.includes('Route'));
        console.log('✓ Unified Pipeline: NP-Hard problem routed to Nature-Inspired Optimization Lab');
    }
}

