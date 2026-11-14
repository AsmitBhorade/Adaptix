/**
 * Unit Tests for Nature-Inspired Optimization Lab (Module 5)
 */

import * as assert from 'assert';
import { SeededRandom } from '../natureInspired/random';
import { AntColonyOptimizer } from '../natureInspired/aco';
import { ParticleSwarmOptimizer, BENCHMARK_FUNCTIONS } from '../natureInspired/pso';
import { GeneticAlgorithm } from '../natureInspired/ga';
import { MetaheuristicComparisonEngine } from '../natureInspired/comparisonEngine';

export function runNatureInspiredTests() {
    console.log('--- Testing Nature-Inspired Optimization Lab (Module 5) ---');

    // Test 1: Seeded Random Reproducibility
    {
        const rng1 = new SeededRandom(12345);
        const seq1 = [rng1.next(), rng1.next(), rng1.next(), rng1.nextRangeInt(1, 100)];

        const rng2 = new SeededRandom(12345);
        const seq2 = [rng2.next(), rng2.next(), rng2.next(), rng2.nextRangeInt(1, 100)];

        assert.deepStrictEqual(seq1, seq2, 'Identical random seeds MUST generate identical pseudo-random sequences');
        console.log('✓ SeededRandom: 100% deterministic reproducibility with identical seeds');
    }

    // Test 2: Objective Function Evaluations (Sphere, Rastrigin, Rosenbrock)
    {
        const sphere = BENCHMARK_FUNCTIONS['sphere'](2);
        assert.strictEqual(sphere.evaluate([0, 0]), 0, 'Sphere at origin must evaluate to 0');
        assert.strictEqual(sphere.evaluate([1, 2]), 5, 'Sphere at [1, 2] must evaluate to 1^2 + 2^2 = 5');

        const rastrigin = BENCHMARK_FUNCTIONS['rastrigin'](2);
        assert.strictEqual(rastrigin.evaluate([0, 0]), 0, 'Rastrigin at origin must evaluate to 0');

        const rosenbrock = BENCHMARK_FUNCTIONS['rosenbrock'](2);
        assert.strictEqual(rosenbrock.evaluate([1, 1]), 0, 'Rosenbrock at [1, 1] must evaluate to 0');
        console.log('✓ Benchmark Functions: Mathematical correctness of objective calculations at known optima');
    }

    // Test 3: Ant Colony Optimization (ACO) on TSP
    {
        const cities = MetaheuristicComparisonEngine.generateSampleCities(10, 42);
        const aco = new AntColonyOptimizer(cities, {
            numAnts: 15,
            maxIterations: 20,
            seed: 42,
            elitismWeight: 2.0
        });

        const result = aco.solve();
        assert.strictEqual(result.algorithm, 'ACO');
        assert.strictEqual(result.bestTour.length, 10, 'Tour must visit all 10 cities');

        // Verify valid permutation (every city visited exactly once)
        const visitedSet = new Set(result.bestTour);
        assert.strictEqual(visitedSet.size, 10, 'Every city must be visited exactly once (no duplicates, no omissions)');

        // Verify cost calculation matches distance sum
        const manualCost = aco.calculateTourCost(result.bestTour);
        assert.ok(Math.abs(result.bestCost - manualCost) < 1e-4, 'Reported best cost must match direct tour calculation');

        // Verify Elitism Guarantee: Best cost across iterations must be monotonically non-increasing
        for (let i = 1; i < result.history.length; i++) {
            assert.ok(
                result.history[i].bestCost <= result.history[i - 1].bestCost + 1e-6,
                `Elitism violation: iteration ${i} best cost (${result.history[i].bestCost}) cannot exceed iteration ${i-1} (${result.history[i-1].bestCost})`
            );
        }

        // Verify reproducibility
        const aco2 = new AntColonyOptimizer(cities, { numAnts: 15, maxIterations: 20, seed: 42, elitismWeight: 2.0 });
        const result2 = aco2.solve();
        assert.strictEqual(result.bestCost, result2.bestCost, 'ACO must be reproducible with same seed');

        console.log(`✓ Ant Colony Optimization: Valid permutation tours, monotonically non-increasing elitism (${result.bestCost.toFixed(2)})`);
    }

    // Test 4: Particle Swarm Optimization (PSO) on Continuous Function
    {
        const pso = new ParticleSwarmOptimizer('sphere', {
            swarmSize: 25,
            maxIterations: 30,
            dimensions: 2,
            seed: 42
        });

        const result = pso.solve();
        assert.strictEqual(result.algorithm, 'PSO');
        assert.strictEqual(result.globalBestPosition.length, 2, 'Position must match dimensions');

        // Verify boundary confinement (particles stayed within [-5.12, 5.12])
        for (const snap of result.history[result.history.length - 1].particlesSnapshot) {
            assert.ok(snap.x >= -5.12 && snap.x <= 5.12, `Particle x (${snap.x}) must stay within domain bounds`);
            assert.ok(snap.y >= -5.12 && snap.y <= 5.12, `Particle y (${snap.y}) must stay within domain bounds`);
        }

        // Verify optimization progress: final cost should improve substantially from iteration 1
        const initialCost = result.history[0].globalBestCost;
        const finalCost = result.globalBestCost;
        assert.ok(finalCost <= initialCost, 'PSO global best must monotonically improve or stay equal');
        assert.ok(finalCost < 1.0, `PSO on Sphere should converge close to 0, got: ${finalCost}`);

        console.log(`✓ Particle Swarm Optimization: Boundary confinement respected, converged to ${finalCost.toExponential(3)}`);
    }

    // Test 5: Genetic Algorithm (GA) on TSP and Continuous
    {
        const cities = MetaheuristicComparisonEngine.generateSampleCities(10, 42);
        const ga = new GeneticAlgorithm({
            populationSize: 30,
            maxGenerations: 25,
            seed: 42,
            elitismCount: 2
        });

        const result = ga.solveTSP(cities);
        assert.strictEqual(result.algorithm, 'GA');
        assert.strictEqual(result.mode, 'TSP');
        assert.strictEqual(result.bestIndividual.length, 10);

        // Verify valid permutation preserved under Order Crossover (OX) and Inversion Mutation
        const citySet = new Set(result.bestIndividual);
        assert.strictEqual(citySet.size, 10, 'GA TSP individual must be a valid permutation with no duplicate cities');

        // Verify elitism monotonicity
        for (let i = 1; i < result.history.length; i++) {
            assert.ok(
                result.history[i].bestFitness <= result.history[i - 1].bestFitness + 1e-6,
                `GA elitism guarantee: best fitness in gen ${i} cannot worsen`
            );
        }

        console.log(`✓ Genetic Algorithm: Order Crossover preserves permutations, elitism verified (${result.bestCost.toFixed(2)})`);
    }

    // Test 6: Comparison Engine (ACO vs GA on TSP & PSO vs GA on Continuous)
    {
        const cities = MetaheuristicComparisonEngine.generateSampleCities(8, 42);
        const comparisonTSP = MetaheuristicComparisonEngine.compareTSP(cities, 42, { maxIterations: 15 }, { maxGenerations: 15 });
        assert.ok(['ACO', 'GA', 'Tie'].includes(comparisonTSP.winner), 'Winner must be ACO, GA, or Tie');
        assert.ok(comparisonTSP.summary.length > 0, 'Summary must explain comparison');
        assert.ok(comparisonTSP.speedupFactor >= 1.0, 'Speedup factor must be >= 1.0');

        const comparisonCont = MetaheuristicComparisonEngine.compareContinuous('sphere', 2, 42, { maxIterations: 20 }, { maxGenerations: 20 });
        assert.ok(['PSO', 'GA', 'Tie'].includes(comparisonCont.winner));
        console.log(`✓ Metaheuristic Comparison Engine: Direct side-by-side benchmarking (TSP Winner: ${comparisonTSP.winner}, Continuous Winner: ${comparisonCont.winner})`);
    }
}

