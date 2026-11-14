/**
 * Unit Tests for ADAPTIX 1.0 Preserved Data Structure Intelligence
 */

import * as assert from 'assert';
import { Analyzer } from '../analyzer';
import { Monitor } from '../monitor';
import { DecisionEngine } from '../decision';
import { buildConstraints } from '../constraints';
import { createDefaultContext } from '../context';
import { detectIntent } from '../intent';
import { detectPatterns } from '../patternDetector';

export function runDataStructureTests() {
    console.log('--- Testing Data Structure Intelligence (Semester 4 Foundation) ---');

    // Test 1: Monitor Operation Counting and Ratios
    {
        const monitor = new Monitor('testVec', 'std::vector');
        monitor.recordInsert();
        monitor.recordSearchBulk(9);
        assert.strictEqual(monitor.totalOperations, 10, 'Total operations should be 10');
        assert.strictEqual(monitor.insertRatio, 0.1, 'Insert ratio should be 0.1');
        assert.strictEqual(monitor.searchRatio, 0.9, 'Search ratio should be 0.9');
        assert.strictEqual(monitor.deleteRatio, 0.0, 'Delete ratio should be 0.0');
        console.log('✓ Monitor operation counting and ratio calculation');
    }

    // Test 2: Decision Engine recommends Hash Map for search-heavy vector
    {
        const monitor = new Monitor('userLookups', 'std::vector');
        monitor.recordInsertBulk(5);
        monitor.recordSearchBulk(95); // 95% searches

        const context = createDefaultContext({ hasOrdering: false, usesIndexAccess: false });
        const constraints = buildConstraints(context, monitor);
        const engine = new DecisionEngine();
        const decision = engine.determineBestStructure(monitor, constraints);

        assert.ok(decision.suggestedStructure !== null, 'Should suggest an alternative');
        assert.ok(
            decision.suggestedStructure?.includes('unordered_map') || decision.suggestedStructure?.includes('unordered_set'),
            `Should suggest unordered container for search-heavy workload, got: ${decision.suggestedStructure}`
        );
        assert.strictEqual(decision.confidenceLabel, 'Strong', 'Confidence should be Strong for 95% search dominance');
        console.log('✓ Decision Engine: Vector -> Hash Map recommendation for search-heavy workloads');
    }

    // Test 3: Constraints prevent unordered containers when ordering is required
    {
        const monitor = new Monitor('sortedItems', 'std::vector');
        monitor.recordSearchBulk(90);

        const contextWithOrdering = createDefaultContext({ hasOrdering: true, usesIndexAccess: false });
        const constraints = buildConstraints(contextWithOrdering, monitor);
        const engine = new DecisionEngine();
        const decision = engine.determineBestStructure(monitor, constraints);

        // When ordering is required (sort/lower_bound), it must not suggest unordered_map
        if (decision.suggestedStructure) {
            assert.ok(!decision.suggestedStructure.includes('unordered'), 'Must NOT suggest unordered structure when ordering required');
        }
        console.log('✓ Constraint Engine: Enforces ordering requirement safety');
    }

    // Test 4: Pattern Detector recognizes Priority Queue (sort + back/pop_back)
    {
        const lines = [
            'std::vector<int> pq_candidate;',
            'std::sort(pq_candidate.begin(), pq_candidate.end());',
            'int maxVal = pq_candidate.back();',
            'pq_candidate.pop_back();',
            'std::sort(pq_candidate.begin(), pq_candidate.end());',
            'int nextVal = pq_candidate.back();'
        ];
        const context = createDefaultContext();
        const pattern = detectPatterns('pq_candidate', lines, context);
        assert.ok(pattern.isPriorityQueueCandidate, 'Should detect repeated extrema extraction pattern');
        assert.strictEqual(pattern.detectedPatternLabel, 'Repeated Extrema Extraction');
        console.log('✓ Pattern Detector: Identifies Priority Queue extrema extraction via Trie');
    }

    // Test 5: Intent Detection recognizes frequency counting (mp[key]++)
    {
        const lines = [
            'std::map<string, int> counts;',
            'counts[word]++;',
            'counts[word]++;',
            'counts[token] += 1;'
        ];
        const signal = detectIntent('counts', lines, 'std::map');
        assert.strictEqual(signal.intent, 'frequency_counting', 'Should detect frequency counting intent');
        assert.ok(signal.strength >= 0.5, 'Signal strength should be >= 0.5');
        console.log('✓ Intent Detector: Recognizes frequency counting syntax patterns');
    }

    // Test 6: Full Analyzer end-to-end pass on C++ code
    {
        const code = `
        #include <vector>
        #include <algorithm>
        int solve(int n) {
            std::vector<int> ids;
            for(int i = 0; i < n; i++) {
                ids.push_back(i);
            }
            int searchCount = n * 4;
            for(int i = 0; i < searchCount; i++) {
                auto it = std::find(ids.begin(), ids.end(), i);
            }
            return 0;
        }
        `;
        const analyzer = new Analyzer();
        const results = analyzer.analyze(code);
        assert.ok(results.has('ids'), 'Should track variable ids');
        const idsCtx = results.get('ids')!;
        assert.ok(idsCtx.monitor.searchCount > idsCtx.monitor.insertCount, `Search count (${idsCtx.monitor.searchCount}) should dominate insert count (${idsCtx.monitor.insertCount})`);
        console.log(`✓ Full Analyzer: Parses C++ code and maps operations correctly (Searches: ${idsCtx.monitor.searchCount}, Inserts: ${idsCtx.monitor.insertCount})`);
    }
}
