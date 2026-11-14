/**
 * Genetic Algorithm (GA) Engine
 * 
 * Supports:
 * 1. Combinatorial Permutation Optimization: Travelling Salesperson Problem (TSP)
 *    - Order Crossover (OX1) ensuring valid permutations
 *    - 2-Opt Inversion Mutation & Swap Mutation
 *    - Tournament Selection
 *    - Elitism preservation
 * 2. Continuous Mathematical Optimization (for fair side-by-side comparison with PSO)
 *    - Real-valued chromosomes
 *    - Simulated Binary Crossover (SBX) / Arithmetic Crossover
 *    - Gaussian Mutation
 *    - Elitism preservation
 */

import { SeededRandom } from './random';
import { City } from './aco';
import { BenchmarkFunctionName, BENCHMARK_FUNCTIONS } from './pso';

export interface GAParameters {
    populationSize: number;
    maxGenerations: number;
    crossoverRate: number;      // Typically 0.7 - 0.9
    mutationRate: number;       // Typically 0.05 - 0.2
    tournamentSize: number;     // Typically 3 - 5
    elitismCount: number;       // Number of top individuals kept untouched
    seed?: number;
}

export interface GAIterationResult {
    generation: number;
    bestFitness: number;
    avgFitness: number;
    worstFitness: number;
    bestIndividual: number[];
    executionTimeMs: number;
}

export interface GARunResult {
    algorithm: 'GA';
    mode: 'TSP' | 'Continuous';
    bestCost: number;
    bestIndividual: number[];
    history: GAIterationResult[];
    totalTimeMs: number;
    totalGenerations: number;
    parameters: Required<GAParameters>;
}

export class GeneticAlgorithm {
    private rng: SeededRandom;
    private params: Required<GAParameters>;

    constructor(params?: Partial<GAParameters>) {
        this.rng = new SeededRandom(params?.seed ?? 42);
        this.params = {
            populationSize: params?.populationSize ?? 40,
            maxGenerations: params?.maxGenerations ?? 60,
            crossoverRate: params?.crossoverRate ?? 0.85,
            mutationRate: params?.mutationRate ?? 0.15,
            tournamentSize: params?.tournamentSize ?? 4,
            elitismCount: params?.elitismCount ?? 2,
            seed: params?.seed ?? 42
        };
    }

    /**
     * Solves TSP using Order Crossover (OX) and Inversion Mutation
     */
    public solveTSP(cities: City[]): GARunResult {
        const startTime = Date.now();
        const numCities = cities.length;

        // Precompute distance matrix
        const dist: number[][] = [];
        for (let i = 0; i < numCities; i++) {
            dist[i] = [];
            for (let j = 0; j < numCities; j++) {
                const dx = cities[i].x - cities[j].x;
                const dy = cities[i].y - cities[j].y;
                dist[i][j] = Math.sqrt(dx * dx + dy * dy);
            }
        }

        const calcCost = (tour: number[]): number => {
            let cost = 0;
            for (let i = 0; i < tour.length - 1; i++) {
                cost += dist[tour[i]][tour[i + 1]];
            }
            cost += dist[tour[tour.length - 1]][tour[0]];
            return cost;
        };

        // Initialize population
        let population: number[][] = [];
        const baseTour: number[] = Array.from({ length: numCities }, (_, i) => i);

        for (let i = 0; i < this.params.populationSize; i++) {
            const ind = [...baseTour];
            this.rng.shuffle(ind);
            population.push(ind);
        }

        let globalBestCost = Infinity;
        let globalBestIndividual: number[] = [];
        const history: GAIterationResult[] = [];

        for (let gen = 1; gen <= this.params.maxGenerations; gen++) {
            const genStart = Date.now();

            // Evaluate fitness (minimize tour cost)
            const costs = population.map(calcCost);
            let genBestCost = Infinity;
            let genBestIdx = 0;
            let sumCost = 0;
            let worstCost = -Infinity;

            for (let i = 0; i < costs.length; i++) {
                const c = costs[i];
                sumCost += c;
                if (c < genBestCost) {
                    genBestCost = c;
                    genBestIdx = i;
                }
                if (c > worstCost) worstCost = c;
            }

            if (genBestCost < globalBestCost) {
                globalBestCost = genBestCost;
                globalBestIndividual = [...population[genBestIdx]];
            }

            history.push({
                generation: gen,
                bestFitness: globalBestCost,
                avgFitness: sumCost / population.length,
                worstFitness: worstCost,
                bestIndividual: [...globalBestIndividual],
                executionTimeMs: Date.now() - genStart
            });

            // Selection & Reproduction
            // Sort population by cost to extract elites
            const sortedIndices = Array.from({ length: population.length }, (_, i) => i)
                .sort((a, b) => costs[a] - costs[b]);

            const nextPop: number[][] = [];

            // Elitism: carry over best individuals directly
            for (let e = 0; e < this.params.elitismCount && e < sortedIndices.length; e++) {
                nextPop.push([...population[sortedIndices[e]]]);
            }

            // Tournament selection helper
            const selectParent = (): number[] => {
                let bestIdx = this.rng.nextRangeInt(0, population.length - 1);
                let bestC = costs[bestIdx];
                for (let t = 1; t < this.params.tournamentSize; t++) {
                    const cand = this.rng.nextRangeInt(0, population.length - 1);
                    if (costs[cand] < bestC) {
                        bestIdx = cand;
                        bestC = costs[cand];
                    }
                }
                return population[bestIdx];
            };

            // Order Crossover (OX1)
            const orderCrossover = (p1: number[], p2: number[]): [number[], number[]] => {
                const len = p1.length;
                let cp1 = this.rng.nextRangeInt(0, len - 2);
                let cp2 = this.rng.nextRangeInt(cp1 + 1, len - 1);

                const c1 = new Array(len).fill(-1);
                const c2 = new Array(len).fill(-1);

                const set1 = new Set<number>();
                const set2 = new Set<number>();

                for (let i = cp1; i <= cp2; i++) {
                    c1[i] = p1[i];
                    set1.add(p1[i]);
                    c2[i] = p2[i];
                    set2.add(p2[i]);
                }

                let idx1 = (cp2 + 1) % len;
                let idx2 = (cp2 + 1) % len;

                for (let i = 0; i < len; i++) {
                    const elem2 = p2[(cp2 + 1 + i) % len];
                    if (!set1.has(elem2)) {
                        c1[idx1] = elem2;
                        idx1 = (idx1 + 1) % len;
                    }

                    const elem1 = p1[(cp2 + 1 + i) % len];
                    if (!set2.has(elem1)) {
                        c2[idx2] = elem1;
                        idx2 = (idx2 + 1) % len;
                    }
                }

                return [c1, c2];
            };

            // Mutation: Inversion (2-Opt reverse segment)
            const mutate = (ind: number[]): void => {
                if (this.rng.next() < this.params.mutationRate) {
                    const len = ind.length;
                    const i = this.rng.nextRangeInt(0, len - 2);
                    const j = this.rng.nextRangeInt(i + 1, len - 1);
                    // Reverse subsegment [i, j]
                    let l = i, r = j;
                    while (l < r) {
                        const temp = ind[l];
                        ind[l] = ind[r];
                        ind[r] = temp;
                        l++;
                        r--;
                    }
                }
            };

            while (nextPop.length < this.params.populationSize) {
                const p1 = selectParent();
                const p2 = selectParent();

                let child1: number[] = [...p1];
                let child2: number[] = [...p2];

                if (this.rng.next() < this.params.crossoverRate) {
                    [child1, child2] = orderCrossover(p1, p2);
                }

                mutate(child1);
                mutate(child2);

                nextPop.push(child1);
                if (nextPop.length < this.params.populationSize) {
                    nextPop.push(child2);
                }
            }

            population = nextPop;
        }

        return {
            algorithm: 'GA',
            mode: 'TSP',
            bestCost: globalBestCost,
            bestIndividual: globalBestIndividual,
            history,
            totalTimeMs: Date.now() - startTime,
            totalGenerations: this.params.maxGenerations,
            parameters: this.params
        };
    }

    /**
     * Solves continuous function optimization for comparison with PSO
     */
    public solveContinuous(funcName: BenchmarkFunctionName, dimensions: number = 2): GARunResult {
        const startTime = Date.now();
        const objFunc = BENCHMARK_FUNCTIONS[funcName](dimensions);
        const [minBound, maxBound] = objFunc.domain;

        // Initialize real-valued population
        let population: number[][] = [];
        for (let i = 0; i < this.params.populationSize; i++) {
            const ind: number[] = [];
            for (let d = 0; d < dimensions; d++) {
                ind.push(this.rng.nextFloat(minBound, maxBound));
            }
            population.push(ind);
        }

        let globalBestCost = Infinity;
        let globalBestIndividual: number[] = [];
        const history: GAIterationResult[] = [];

        for (let gen = 1; gen <= this.params.maxGenerations; gen++) {
            const genStart = Date.now();
            const costs = population.map(ind => objFunc.evaluate(ind));

            let genBestCost = Infinity;
            let genBestIdx = 0;
            let sumCost = 0;
            let worstCost = -Infinity;

            for (let i = 0; i < costs.length; i++) {
                const c = costs[i];
                sumCost += c;
                if (c < genBestCost) {
                    genBestCost = c;
                    genBestIdx = i;
                }
                if (c > worstCost) worstCost = c;
            }

            if (genBestCost < globalBestCost) {
                globalBestCost = genBestCost;
                globalBestIndividual = [...population[genBestIdx]];
            }

            history.push({
                generation: gen,
                bestFitness: globalBestCost,
                avgFitness: sumCost / population.length,
                worstFitness: worstCost,
                bestIndividual: [...globalBestIndividual],
                executionTimeMs: Date.now() - genStart
            });

            // Elitism
            const sortedIndices = Array.from({ length: population.length }, (_, i) => i)
                .sort((a, b) => costs[a] - costs[b]);

            const nextPop: number[][] = [];
            for (let e = 0; e < this.params.elitismCount && e < sortedIndices.length; e++) {
                nextPop.push([...population[sortedIndices[e]]]);
            }

            // Tournament selection
            const selectParent = (): number[] => {
                let bestIdx = this.rng.nextRangeInt(0, population.length - 1);
                let bestC = costs[bestIdx];
                for (let t = 1; t < this.params.tournamentSize; t++) {
                    const cand = this.rng.nextRangeInt(0, population.length - 1);
                    if (costs[cand] < bestC) {
                        bestIdx = cand;
                        bestC = costs[cand];
                    }
                }
                return population[bestIdx];
            };

            // Arithmetic crossover
            const crossover = (p1: number[], p2: number[]): [number[], number[]] => {
                const alpha = this.rng.next();
                const c1: number[] = [];
                const c2: number[] = [];
                for (let d = 0; d < dimensions; d++) {
                    c1.push(alpha * p1[d] + (1 - alpha) * p2[d]);
                    c2.push((1 - alpha) * p1[d] + alpha * p2[d]);
                }
                return [c1, c2];
            };

            // Gaussian mutation
            const mutate = (ind: number[]): void => {
                for (let d = 0; d < dimensions; d++) {
                    if (this.rng.next() < this.params.mutationRate) {
                        const span = maxBound - minBound;
                        ind[d] += this.rng.nextGaussian(0, span * 0.05);
                        // Clamp
                        if (ind[d] < minBound) ind[d] = minBound;
                        if (ind[d] > maxBound) ind[d] = maxBound;
                    }
                }
            };

            while (nextPop.length < this.params.populationSize) {
                const p1 = selectParent();
                const p2 = selectParent();
                let [c1, c2] = [p1, p2];
                if (this.rng.next() < this.params.crossoverRate) {
                    [c1, c2] = crossover(p1, p2);
                }
                mutate(c1);
                mutate(c2);
                nextPop.push(c1);
                if (nextPop.length < this.params.populationSize) {
                    nextPop.push(c2);
                }
            }

            population = nextPop;
        }

        return {
            algorithm: 'GA',
            mode: 'Continuous',
            bestCost: globalBestCost,
            bestIndividual: globalBestIndividual,
            history,
            totalTimeMs: Date.now() - startTime,
            totalGenerations: this.params.maxGenerations,
            parameters: this.params
        };
    }
}
