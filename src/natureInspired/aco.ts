/**
 * Ant Colony Optimization (ACO) Engine
 * 
 * Specialized for the Travelling Salesperson Problem (TSP).
 * Implements the Max-Min Ant System (MMAS) variant of ACO with:
 * - Pheromone initialization, bounds, and evaporation
 * - Probabilistic transition rule with alpha (pheromone) and beta (heuristic visibility)
 * - Elitist ant pheromone reinforcement
 * - Iteration-by-iteration convergence tracking
 * - Reproducibility through SeededRandom
 */

import { SeededRandom } from './random';

export interface City {
    id: number;
    name: string;
    x: number;
    y: number;
}

export interface ACOParameters {
    numAnts: number;
    maxIterations: number;
    alpha: number;        // Pheromone importance factor (typically 1.0)
    beta: number;         // Heuristic visibility importance factor (typically 2.0 to 5.0)
    evaporationRate: number; // Rho, typically 0.05 to 0.5
    q: number;            // Pheromone deposit factor
    elitismWeight: number; // Extra multiplier for best tour
    seed?: number;
}

export interface ACOIterationResult {
    iteration: number;
    bestCost: number;
    avgCost: number;
    worstCost: number;
    bestTour: number[];
    executionTimeMs: number;
}

export interface ACORunResult {
    algorithm: 'ACO';
    bestCost: number;
    bestTour: number[];
    cities: City[];
    history: ACOIterationResult[];
    totalTimeMs: number;
    totalIterations: number;
    parameters: ACOParameters;
    distanceMatrix: number[][];
    pheromoneMatrix: number[][];
}

export class AntColonyOptimizer {
    private cities: City[];
    private distanceMatrix: number[][];
    private visibilityMatrix: number[][];
    private pheromoneMatrix: number[][];
    private params: Required<ACOParameters>;
    private rng: SeededRandom;
    private numCities: number;
    private tauMin: number = 0.01;
    private tauMax: number = 10.0;

    constructor(cities: City[], params?: Partial<ACOParameters>) {
        this.cities = cities;
        this.numCities = cities.length;
        this.rng = new SeededRandom(params?.seed ?? 42);

        this.params = {
            numAnts: params?.numAnts ?? Math.max(10, Math.min(30, cities.length)),
            maxIterations: params?.maxIterations ?? 50,
            alpha: params?.alpha ?? 1.0,
            beta: params?.beta ?? 3.0,
            evaporationRate: params?.evaporationRate ?? 0.1,
            q: params?.q ?? 100.0,
            elitismWeight: params?.elitismWeight ?? 2.0,
            seed: params?.seed ?? 42
        };

        this.distanceMatrix = this.computeDistanceMatrix();
        this.visibilityMatrix = this.computeVisibilityMatrix();
        this.pheromoneMatrix = this.initializePheromones();
    }

    private computeDistanceMatrix(): number[][] {
        const matrix: number[][] = [];
        for (let i = 0; i < this.numCities; i++) {
            matrix[i] = [];
            for (let j = 0; j < this.numCities; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    const dx = this.cities[i].x - this.cities[j].x;
                    const dy = this.cities[i].y - this.cities[j].y;
                    matrix[i][j] = Math.sqrt(dx * dx + dy * dy);
                }
            }
        }
        return matrix;
    }

    private computeVisibilityMatrix(): number[][] {
        const matrix: number[][] = [];
        for (let i = 0; i < this.numCities; i++) {
            matrix[i] = [];
            for (let j = 0; j < this.numCities; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    // Heuristic visibility eta_ij = 1 / d_ij
                    matrix[i][j] = 1.0 / (this.distanceMatrix[i][j] + 1e-6);
                }
            }
        }
        return matrix;
    }

    private initializePheromones(): number[][] {
        // Initial estimate from nearest-neighbor tour
        const nnTour = this.nearestNeighborTour();
        const nnCost = this.calculateTourCost(nnTour);
        const tau0 = this.params.numAnts / (nnCost + 1e-6);
        this.tauMax = tau0 * 5;
        this.tauMin = this.tauMax / (2 * this.numCities);

        const matrix: number[][] = [];
        for (let i = 0; i < this.numCities; i++) {
            matrix[i] = [];
            for (let j = 0; j < this.numCities; j++) {
                matrix[i][j] = tau0;
            }
        }
        return matrix;
    }

    private nearestNeighborTour(): number[] {
        const visited = new Set<number>();
        const tour: number[] = [0];
        visited.add(0);

        while (tour.length < this.numCities) {
            const current = tour[tour.length - 1];
            let nearest = -1;
            let minDist = Infinity;
            for (let next = 0; next < this.numCities; next++) {
                if (!visited.has(next)) {
                    const d = this.distanceMatrix[current][next];
                    if (d < minDist) {
                        minDist = d;
                        nearest = next;
                    }
                }
            }
            if (nearest !== -1) {
                visited.add(nearest);
                tour.push(nearest);
            }
        }
        return tour;
    }

    public calculateTourCost(tour: number[]): number {
        if (tour.length === 0) return 0;
        let cost = 0;
        for (let i = 0; i < tour.length - 1; i++) {
            cost += this.distanceMatrix[tour[i]][tour[i + 1]];
        }
        // Return to start
        cost += this.distanceMatrix[tour[tour.length - 1]][tour[0]];
        return cost;
    }

    /**
     * Probabilistically construct one ant's tour based on pheromones and distance heuristic
     */
    private constructAntTour(): number[] {
        const startCity = this.rng.nextRangeInt(0, this.numCities - 1);
        const tour: number[] = [startCity];
        const unvisited = new Set<number>();
        for (let i = 0; i < this.numCities; i++) {
            if (i !== startCity) unvisited.add(i);
        }

        while (unvisited.size > 0) {
            const current = tour[tour.length - 1];
            let totalWeight = 0;
            const candidates = Array.from(unvisited);
            const probabilities: number[] = [];

            for (const cand of candidates) {
                const tau = Math.pow(this.pheromoneMatrix[current][cand], this.params.alpha);
                const eta = Math.pow(this.visibilityMatrix[current][cand], this.params.beta);
                const weight = tau * eta;
                probabilities.push(weight);
                totalWeight += weight;
            }

            // Roulette wheel selection
            let chosen = candidates[0];
            if (totalWeight > 0) {
                let r = this.rng.next() * totalWeight;
                for (let i = 0; i < candidates.length; i++) {
                    r -= probabilities[i];
                    if (r <= 0) {
                        chosen = candidates[i];
                        break;
                    }
                }
            } else {
                chosen = candidates[this.rng.nextRangeInt(0, candidates.length - 1)];
            }

            tour.push(chosen);
            unvisited.delete(chosen);
        }

        return tour;
    }

    /**
     * Executes the full ACO optimization run
     */
    public solve(): ACORunResult {
        const startTime = Date.now();
        const history: ACOIterationResult[] = [];

        let globalBestTour: number[] = [];
        let globalBestCost = Infinity;

        for (let iter = 1; iter <= this.params.maxIterations; iter++) {
            const iterStart = Date.now();
            const antTours: number[][] = [];
            const antCosts: number[] = [];

            // 1. All ants construct a tour
            for (let a = 0; a < this.params.numAnts; a++) {
                const tour = this.constructAntTour();
                const cost = this.calculateTourCost(tour);
                antTours.push(tour);
                antCosts.push(cost);

                if (cost < globalBestCost) {
                    globalBestCost = cost;
                    globalBestTour = [...tour];
                }
            }

            // Calculate iteration statistics
            let sumCost = 0;
            let worstCost = -Infinity;
            let iterBestCost = Infinity;
            let iterBestTour: number[] = [];

            for (let i = 0; i < antCosts.length; i++) {
                const c = antCosts[i];
                sumCost += c;
                if (c > worstCost) worstCost = c;
                if (c < iterBestCost) {
                    iterBestCost = c;
                    iterBestTour = antTours[i];
                }
            }
            const avgCost = sumCost / antCosts.length;

            // 2. Pheromone Evaporation
            for (let i = 0; i < this.numCities; i++) {
                for (let j = 0; j < this.numCities; j++) {
                    this.pheromoneMatrix[i][j] *= (1.0 - this.params.evaporationRate);
                    if (this.pheromoneMatrix[i][j] < this.tauMin) {
                        this.pheromoneMatrix[i][j] = this.tauMin;
                    }
                }
            }

            // 3. Pheromone Deposit by current iteration ants
            for (let a = 0; a < antTours.length; a++) {
                const tour = antTours[a];
                const deposit = this.params.q / (antCosts[a] + 1e-6);
                for (let i = 0; i < tour.length; i++) {
                    const u = tour[i];
                    const v = tour[(i + 1) % tour.length];
                    this.pheromoneMatrix[u][v] += deposit;
                    this.pheromoneMatrix[v][u] += deposit;
                }
            }

            // 4. Elitist Deposit: Reinforce global best tour
            if (globalBestTour.length > 0 && this.params.elitismWeight > 0) {
                const eliteDeposit = (this.params.elitismWeight * this.params.q) / (globalBestCost + 1e-6);
                for (let i = 0; i < globalBestTour.length; i++) {
                    const u = globalBestTour[i];
                    const v = globalBestTour[(i + 1) % globalBestTour.length];
                    this.pheromoneMatrix[u][v] += eliteDeposit;
                    this.pheromoneMatrix[v][u] += eliteDeposit;
                }
            }

            // Clamp pheromones to [tauMin, tauMax]
            for (let i = 0; i < this.numCities; i++) {
                for (let j = 0; j < this.numCities; j++) {
                    if (this.pheromoneMatrix[i][j] > this.tauMax) {
                        this.pheromoneMatrix[i][j] = this.tauMax;
                    }
                }
            }

            history.push({
                iteration: iter,
                bestCost: globalBestCost,
                avgCost,
                worstCost,
                bestTour: [...globalBestTour],
                executionTimeMs: Date.now() - iterStart
            });
        }

        return {
            algorithm: 'ACO',
            bestCost: globalBestCost,
            bestTour: globalBestTour,
            cities: this.cities,
            history,
            totalTimeMs: Date.now() - startTime,
            totalIterations: this.params.maxIterations,
            parameters: this.params,
            distanceMatrix: this.distanceMatrix,
            pheromoneMatrix: this.pheromoneMatrix
        };
    }
}

