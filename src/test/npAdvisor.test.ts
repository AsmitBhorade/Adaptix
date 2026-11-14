/**
 * Unit Tests for NP-Completeness and Approximation Advisor (Module 4)
 */

import * as assert from 'assert';
import { NPAdvisor, NP_PROBLEMS_CATALOG } from '../npCompleteness/npAdvisor';

export function runNPAdvisorTests() {
    console.log('--- Testing NP-Completeness and Approximation Advisor (Module 4) ---');

    // Test 1: Catalog Integrity
    {
        const catalogKeys = Object.keys(NP_PROBLEMS_CATALOG);
        assert.ok(catalogKeys.includes('sat'), 'SAT must be in catalog');
        assert.ok(catalogKeys.includes('vertex_cover'), 'Vertex Cover must be in catalog');
        assert.ok(catalogKeys.includes('clique'), 'Clique must be in catalog');
        assert.ok(catalogKeys.includes('independent_set'), 'Independent Set must be in catalog');
        assert.ok(catalogKeys.includes('tsp'), 'TSP must be in catalog');
        assert.ok(catalogKeys.includes('ilp'), 'ILP must be in catalog');
        console.log('✓ NP Problems Catalog: All canonical NP-Complete / NP-Hard problems cataloged');
    }

    // Test 2: Input Size Feasibility Routing for TSP
    {
        // Small N <= 18: Exact Algorithm (Held-Karp)
        const small = NPAdvisor.assessFeasibility('tsp', 14);
        assert.strictEqual(small.feasibilityTier, 'Feasible Exact');
        assert.strictEqual(small.recommendedApproach, 'Exact Algorithm');
        assert.ok(small.specificRecommendation.includes('Held-Karp'));

        // Medium N = 50: Approximation Algorithm (Christofides / 2-Opt)
        const medium = NPAdvisor.assessFeasibility('tsp', 50);
        assert.strictEqual(medium.feasibilityTier, 'Intractable for Exact — Approximation Required');
        assert.strictEqual(medium.recommendedApproach, 'Approximation Algorithm');
        assert.ok(medium.ratioGuarantee?.includes('1.5'));

        // Large N = 300: Metaheuristics Mandatory (ACO / GA)
        const large = NPAdvisor.assessFeasibility('tsp', 300);
        assert.strictEqual(large.feasibilityTier, 'Extremely Intractable — Metaheuristics Mandatory');
        assert.strictEqual(large.recommendedApproach, 'Metaheuristic / Nature-Inspired');
        assert.ok(large.specificRecommendation.includes('Ant Colony') || large.specificRecommendation.includes('Genetic'));

        console.log('✓ Feasibility Estimator: Accurately routes N <= 18 (Exact), N = 50 (1.5-Approx), N = 300 (Metaheuristics)');
    }

    // Test 3: Pattern Detection on Problem Statements / Code
    {
        const tspCode = `
        struct City { int x, y; };
        double calculateTourDistance(const std::vector<City>& tsp_tour) {
            double total = 0;
            // salesman traveling across all cities
            return total;
        }
        `;
        const res = NPAdvisor.detectNPPatterns(tspCode);
        assert.strictEqual(res.matchedProblem?.id, 'tsp');
        assert.ok(res.reductionInsight.includes('Hamiltonian Cycle'));
        console.log('✓ Pattern Recognition: Identifies TSP problem context and explains reductions');
    }
}

