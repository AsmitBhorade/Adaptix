/**
 * Particle Swarm Optimization (PSO) Engine
 * 
 * Specialized for continuous mathematical function optimization.
 * Implements canonical PSO with:
 * - Selectable multi-dimensional benchmark functions (Sphere, Rastrigin, Rosenbrock, Ackley)
 * - Inertia weight with optional linear damping
 * - Cognitive (personal best) and social (global best) components
 * - Velocity clamping and boundary confinement
 * - 2D particle coordinate tracking for visual debugger
 * - Seedable PRNG for reproducible research experiments
 */

import { SeededRandom } from './random';

export type BenchmarkFunctionName = 'sphere' | 'rastrigin' | 'rosenbrock' | 'ackley';

export interface ObjectiveFunction {
    name: BenchmarkFunctionName;
    displayName: string;
    description: string;
    domain: [number, number];
    evaluate: (x: number[]) => number;
    globalMinimum: {
        position: number[];
        value: number;
    };
}

export const BENCHMARK_FUNCTIONS: Record<BenchmarkFunctionName, (dimensions: number) => ObjectiveFunction> = {
    sphere: (d: number) => ({
        name: 'sphere',
        displayName: 'Sphere Function (Convex)',
        description: 'Smooth, unimodal convex bowl. Ideal for testing convergence speed.',
        domain: [-5.12, 5.12],
        evaluate: (x: number[]) => x.reduce((sum, val) => sum + val * val, 0),
        globalMinimum: { position: new Array(d).fill(0), value: 0 }
    }),
    rastrigin: (d: number) => ({
        name: 'rastrigin',
        displayName: 'Rastrigin Function (Highly Multimodal)',
        description: 'Non-linear multimodal landscape with many local minima. Tests escape from local optima.',
        domain: [-5.12, 5.12],
        evaluate: (x: number[]) => 10 * d + x.reduce((sum, val) => sum + (val * val - 10 * Math.cos(2 * Math.PI * val)), 0),
        globalMinimum: { position: new Array(d).fill(0), value: 0 }
    }),
    rosenbrock: (d: number) => ({
        name: 'rosenbrock',
        displayName: 'Rosenbrock Valley (Banana Function)',
        description: 'Narrow, parabolic valley where finding the valley is easy but finding the global minimum is difficult.',
        domain: [-5.0, 10.0],
        evaluate: (x: number[]) => {
            let sum = 0;
            for (let i = 0; i < x.length - 1; i++) {
                const term1 = x[i + 1] - x[i] * x[i];
                const term2 = 1 - x[i];
                sum += 100 * term1 * term1 + term2 * term2;
            }
            return sum;
        },
        globalMinimum: { position: new Array(d).fill(1), value: 0 }
    }),
    ackley: (d: number) => ({
        name: 'ackley',
        displayName: 'Ackley Function (Exponential Well)',
        description: 'Nearly flat outer region with a steep central funnel. Tests exploration vs exploitation balance.',
        domain: [-5.0, 5.0],
        evaluate: (x: number[]) => {
            const sumSq = x.reduce((acc, v) => acc + v * v, 0);
            const sumCos = x.reduce((acc, v) => acc + Math.cos(2 * Math.PI * v), 0);
            return -20 * Math.exp(-0.2 * Math.sqrt(sumSq / d)) - Math.exp(sumCos / d) + 20 + Math.E;
        },
        globalMinimum: { position: new Array(d).fill(0), value: 0 }
    })
};

export interface PSOParameters {
    swarmSize: number;
    maxIterations: number;
    dimensions: number;
    inertiaWeight: number;      // w (typically 0.729)
    inertiaDamping?: number;    // w decay per iteration (e.g., 0.99)
    cognitiveCoeff: number;     // c1 (typically 1.494)
    socialCoeff: number;        // c2 (typically 1.494)
    seed?: number;
}

export interface ParticleState {
    id: number;
    position: number[];
    velocity: number[];
    fitness: number;
    bestPosition: number[];
    bestFitness: number;
}

export interface PSOIterationResult {
    iteration: number;
    globalBestCost: number;
    globalBestPosition: number[];
    averageCost: number;
    worstCost: number;
    particlesSnapshot: { x: number; y: number; fitness: number }[];
    executionTimeMs: number;
}

export interface PSORunResult {
    algorithm: 'PSO';
    functionName: BenchmarkFunctionName;
    globalBestCost: number;
    globalBestPosition: number[];
    theoreticalOptimum: number;
    history: PSOIterationResult[];
    totalTimeMs: number;
    totalIterations: number;
    parameters: Required<PSOParameters>;
}

export class ParticleSwarmOptimizer {
    private params: Required<PSOParameters>;
    private objFunc: ObjectiveFunction;
    private rng: SeededRandom;
    private particles: ParticleState[] = [];
    private globalBestPosition: number[] = [];
    private globalBestCost: number = Infinity;
    private vMin: number;
    private vMax: number;

    constructor(
        functionName: BenchmarkFunctionName = 'sphere',
        params?: Partial<PSOParameters>
    ) {
        const dims = params?.dimensions ?? 2;
        this.objFunc = BENCHMARK_FUNCTIONS[functionName](dims);
        this.rng = new SeededRandom(params?.seed ?? 42);

        this.params = {
            swarmSize: params?.swarmSize ?? 30,
            maxIterations: params?.maxIterations ?? 60,
            dimensions: dims,
            inertiaWeight: params?.inertiaWeight ?? 0.7298,
            inertiaDamping: params?.inertiaDamping ?? 0.995,
            cognitiveCoeff: params?.cognitiveCoeff ?? 1.496,
            socialCoeff: params?.socialCoeff ?? 1.496,
            seed: params?.seed ?? 42
        };

        const domainSpan = this.objFunc.domain[1] - this.objFunc.domain[0];
        this.vMax = domainSpan * 0.2;
        this.vMin = -this.vMax;

        this.initializeSwarm();
    }

    private initializeSwarm(): void {
        this.particles = [];
        this.globalBestCost = Infinity;
        this.globalBestPosition = [];

        const [minBound, maxBound] = this.objFunc.domain;

        for (let i = 0; i < this.params.swarmSize; i++) {
            const position: number[] = [];
            const velocity: number[] = [];

            for (let d = 0; d < this.params.dimensions; d++) {
                position.push(this.rng.nextFloat(minBound, maxBound));
                velocity.push(this.rng.nextFloat(this.vMin * 0.5, this.vMax * 0.5));
            }

            const fitness = this.objFunc.evaluate(position);

            const particle: ParticleState = {
                id: i,
                position,
                velocity,
                fitness,
                bestPosition: [...position],
                bestFitness: fitness
            };

            this.particles.push(particle);

            if (fitness < this.globalBestCost) {
                this.globalBestCost = fitness;
                this.globalBestPosition = [...position];
            }
        }
    }

    public solve(): PSORunResult {
        const startTime = Date.now();
        const history: PSOIterationResult[] = [];
        const [minBound, maxBound] = this.objFunc.domain;
        let w = this.params.inertiaWeight;

        for (let iter = 1; iter <= this.params.maxIterations; iter++) {
            const iterStart = Date.now();
            let sumCost = 0;
            let worstCost = -Infinity;

            for (const particle of this.particles) {
                for (let d = 0; d < this.params.dimensions; d++) {
                    const r1 = this.rng.next();
                    const r2 = this.rng.next();

                    // Standard canonical velocity update formula
                    const cognitive = this.params.cognitiveCoeff * r1 * (particle.bestPosition[d] - particle.position[d]);
                    const social = this.params.socialCoeff * r2 * (this.globalBestPosition[d] - particle.position[d]);

                    particle.velocity[d] = w * particle.velocity[d] + cognitive + social;

                    // Velocity clamping
                    if (particle.velocity[d] > this.vMax) particle.velocity[d] = this.vMax;
                    if (particle.velocity[d] < this.vMin) particle.velocity[d] = this.vMin;

                    // Position update
                    particle.position[d] += particle.velocity[d];

                    // Boundary confinement: reflect velocity if boundary hit
                    if (particle.position[d] < minBound) {
                        particle.position[d] = minBound;
                        particle.velocity[d] = -particle.velocity[d] * 0.5;
                    } else if (particle.position[d] > maxBound) {
                        particle.position[d] = maxBound;
                        particle.velocity[d] = -particle.velocity[d] * 0.5;
                    }
                }

                // Evaluate new fitness
                particle.fitness = this.objFunc.evaluate(particle.position);
                sumCost += particle.fitness;
                if (particle.fitness > worstCost) worstCost = particle.fitness;

                // Update personal best
                if (particle.fitness < particle.bestFitness) {
                    particle.bestFitness = particle.fitness;
                    particle.bestPosition = [...particle.position];

                    // Update global best
                    if (particle.fitness < this.globalBestCost) {
                        this.globalBestCost = particle.fitness;
                        this.globalBestPosition = [...particle.position];
                    }
                }
            }

            // Inertia damping
            w *= this.params.inertiaDamping;

            // Capture snapshot (take 1st 2 dimensions for visualization)
            const snapshot = this.particles.map(p => ({
                x: p.position[0],
                y: p.position[1] ?? 0,
                fitness: p.fitness
            }));

            history.push({
                iteration: iter,
                globalBestCost: this.globalBestCost,
                globalBestPosition: [...this.globalBestPosition],
                averageCost: sumCost / this.particles.length,
                worstCost,
                particlesSnapshot: snapshot,
                executionTimeMs: Date.now() - iterStart
            });
        }

        return {
            algorithm: 'PSO',
            functionName: this.objFunc.name,
            globalBestCost: this.globalBestCost,
            globalBestPosition: this.globalBestPosition,
            theoreticalOptimum: this.objFunc.globalMinimum.value,
            history,
            totalTimeMs: Date.now() - startTime,
            totalIterations: this.params.maxIterations,
            parameters: this.params
        };
    }
}

