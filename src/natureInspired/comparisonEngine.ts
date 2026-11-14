/**
 * Metaheuristic Comparison Engine
 * 
 * Provides fair, rigorous side-by-side benchmarking between:
 * 1. ACO vs GA for Combinatorial Optimization (Travelling Salesperson Problem)
 * 2. PSO vs GA for Continuous Function Optimization (Sphere, Rastrigin, Rosenbrock, Ackley)
 * 
 * Uses identical random seeds, problem definitions, and input representations
 * to ensure scientific validity.
 */

import { AntColonyOptimizer, City, ACORunResult, ACOParameters } from './aco';
import { ParticleSwarmOptimizer, PSORunResult, PSOParameters, BenchmarkFunctionName } from './pso';
import { GeneticAlgorithm, GARunResult, GAParameters } from './ga';

export interface TSPComparisonResult {
    problemType: 'TSP';
    numCities: number;
    cities: City[];
    seed: number;
    aco: ACORunResult;
    ga: GARunResult;
    winner: 'ACO' | 'GA' | 'Tie';
    percentageDifference: number; // How much better the winner was
    speedupFactor: number;        // Execution time ratio
    summary: string;
}

export interface ContinuousComparisonResult {
    problemType: 'Continuous';
    functionName: BenchmarkFunctionName;
    dimensions: number;
    seed: number;
    pso: PSORunResult;
    ga: GARunResult;
    winner: 'PSO' | 'GA' | 'Tie';
    percentageDifference: number;
    speedupFactor: number;
    summary: string;
}

export class MetaheuristicComparisonEngine {
    /** Generate standardized sample TSP cities for comparison */
    public static generateSampleCities(count: number = 15, seed: number = 42): City[] {
        // Deterministic city coordinates on 500x500 plane
        const cities: City[] = [];
        let s = seed;
        const nextR = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280.0;
        };

        const names = [
            'Metropolis', 'Gotham', 'Star City', 'Central City', 'Coast City',
            'Bludhaven', 'Keystone', 'Opal City', 'Midway', 'Hub City',
            'National City', 'Fawcett', 'Ivy Town', 'Dakota', 'Happy Harbor',
            'Atlantis', 'Themyscira', 'Smallville', 'Argo', 'Kandor'
        ];

        for (let i = 0; i < count; i++) {
            cities.push({
                id: i,
                name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
                x: Math.round(50 + nextR() * 400),
                y: Math.round(50 + nextR() * 400)
            });
        }
        return cities;
    }

    /**
     * Run ACO vs GA on TSP under identical conditions
     */
    public static compareTSP(
        cities: City[],
        seed: number = 42,
        acoParams?: Partial<ACOParameters>,
        gaParams?: Partial<GAParameters>
    ): TSPComparisonResult {
        const aco = new AntColonyOptimizer(cities, { ...acoParams, seed });
        const acoResult = aco.solve();

        const ga = new GeneticAlgorithm({ ...gaParams, seed });
        const gaResult = ga.solveTSP(cities);

        const acoCost = acoResult.bestCost;
        const gaCost = gaResult.bestCost;

        let winner: 'ACO' | 'GA' | 'Tie' = 'Tie';
        let pctDiff = 0;

        if (Math.abs(acoCost - gaCost) < 1e-4) {
            winner = 'Tie';
            pctDiff = 0;
        } else if (acoCost < gaCost) {
            winner = 'ACO';
            pctDiff = ((gaCost - acoCost) / gaCost) * 100;
        } else {
            winner = 'GA';
            pctDiff = ((acoCost - gaCost) / acoCost) * 100;
        }

        const speedup = acoResult.totalTimeMs > 0 && gaResult.totalTimeMs > 0
            ? Number((Math.max(acoResult.totalTimeMs, gaResult.totalTimeMs) / Math.min(acoResult.totalTimeMs, gaResult.totalTimeMs)).toFixed(2))
            : 1.0;

        const faster = acoResult.totalTimeMs < gaResult.totalTimeMs ? 'ACO' : 'GA';

        const summary = winner === 'Tie'
            ? `Both algorithms converged to the same tour cost (${acoCost.toFixed(2)}). ${faster} was ${speedup}x faster.`
            : `${winner} produced a ${pctDiff.toFixed(1)}% shorter tour (${(winner === 'ACO' ? acoCost : gaCost).toFixed(2)} vs ${(winner === 'ACO' ? gaCost : acoCost).toFixed(2)}). ${faster} completed in ${Math.min(acoResult.totalTimeMs, gaResult.totalTimeMs)}ms vs ${Math.max(acoResult.totalTimeMs, gaResult.totalTimeMs)}ms.`;

        return {
            problemType: 'TSP',
            numCities: cities.length,
            cities,
            seed,
            aco: acoResult,
            ga: gaResult,
            winner,
            percentageDifference: Number(pctDiff.toFixed(2)),
            speedupFactor: speedup,
            summary
        };
    }

    /**
     * Run PSO vs GA on Continuous Function Optimization under identical conditions
     */
    public static compareContinuous(
        functionName: BenchmarkFunctionName = 'sphere',
        dimensions: number = 2,
        seed: number = 42,
        psoParams?: Partial<PSOParameters>,
        gaParams?: Partial<GAParameters>
    ): ContinuousComparisonResult {
        const pso = new ParticleSwarmOptimizer(functionName, { ...psoParams, dimensions, seed });
        const psoResult = pso.solve();

        const ga = new GeneticAlgorithm({ ...gaParams, seed });
        const gaResult = ga.solveContinuous(functionName, dimensions);

        const psoCost = psoResult.globalBestCost;
        const gaCost = gaResult.bestCost;

        let winner: 'PSO' | 'GA' | 'Tie' = 'Tie';
        let pctDiff = 0;

        if (Math.abs(psoCost - gaCost) < 1e-4) {
            winner = 'Tie';
            pctDiff = 0;
        } else if (psoCost < gaCost) {
            winner = 'PSO';
            pctDiff = gaCost !== 0 ? Math.abs(((gaCost - psoCost) / gaCost) * 100) : 100;
        } else {
            winner = 'GA';
            pctDiff = psoCost !== 0 ? Math.abs(((psoCost - gaCost) / psoCost) * 100) : 100;
        }

        const speedup = psoResult.totalTimeMs > 0 && gaResult.totalTimeMs > 0
            ? Number((Math.max(psoResult.totalTimeMs, gaResult.totalTimeMs) / Math.min(psoResult.totalTimeMs, gaResult.totalTimeMs)).toFixed(2))
            : 1.0;

        const faster = psoResult.totalTimeMs < gaResult.totalTimeMs ? 'PSO' : 'GA';

        const summary = winner === 'Tie'
            ? `Both algorithms converged to similar objective values (${psoCost.toFixed(5)}).`
            : `${winner} converged closer to the optimum (${(winner === 'PSO' ? psoCost : gaCost).toExponential(4)} vs ${(winner === 'PSO' ? gaCost : psoCost).toExponential(4)}). ${faster} was ${speedup}x faster.`;

        return {
            problemType: 'Continuous',
            functionName,
            dimensions,
            seed,
            pso: psoResult,
            ga: gaResult,
            winner,
            percentageDifference: Number(pctDiff.toFixed(2)),
            speedupFactor: speedup,
            summary
        };
    }
}

