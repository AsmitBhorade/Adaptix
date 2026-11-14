/**
 * NP-Completeness and Approximation Advisor
 * 
 * Provides rigorous theoretical and practical analysis of computationally difficult problems:
 * - P, NP, co-NP, NP-hard, NP-completeness definitions
 * - Polynomial-time reductions (Cook-Levin theorem, Karp reductions)
 * - Supported canonical problems: SAT, 3-SAT, Vertex Cover, Clique, Independent Set, TSP, ILP
 * - Input-size feasibility estimator (Exact vs Approximation vs Metaheuristic)
 * - Approximation ratio guarantees and hardness of approximation
 * - Clear distinction between heuristic recognition and formal mathematical proofs
 */

export type ComplexityClass = 'P' | 'NP' | 'NP-Complete' | 'NP-Hard' | 'co-NP';

export interface HardnessProblemDefinition {
    id: string;
    name: string;
    complexityClass: ComplexityClass;
    decisionFormulation: string;
    optimizationFormulation: string;
    polynomialReductionFrom: string;
    knownExactAlgorithms: { name: string; complexity: string; practicalMaxN: number }[];
    knownApproximationAlgorithms: { name: string; approxRatio: string; complexity: string }[];
    heuristicsAndMetaheuristics: string[];
    inapproximabilityBound?: string;
    realWorldApplications: string[];
    description: string;
}

export const NP_PROBLEMS_CATALOG: Record<string, HardnessProblemDefinition> = {
    'sat': {
        id: 'sat',
        name: 'Boolean Satisfiability (SAT / 3-SAT)',
        complexityClass: 'NP-Complete',
        decisionFormulation: 'Given a Boolean formula in Conjunctive Normal Form (CNF), does there exist a truth assignment making the entire formula evaluate to TRUE?',
        optimizationFormulation: 'MAX-SAT: Find a truth assignment satisfying the maximum number of clauses.',
        polynomialReductionFrom: 'Cook-Levin Theorem: Every problem in NP reduces to SAT in polynomial time.',
        knownExactAlgorithms: [
            { name: 'DPLL (Davis-Putnam-Logemann-Loveland)', complexity: 'O(2^n) worst case, highly pruned with unit propagation', practicalMaxN: 50 },
            { name: 'CDCL (Conflict-Driven Clause Learning)', complexity: 'O(2^n) worst case, solves practical instances with 10^5+ variables', practicalMaxN: 100000 }
        ],
        knownApproximationAlgorithms: [
            { name: 'Randomized Assignment for MAX-3-SAT', approxRatio: '7/8 (0.875) expected', complexity: 'O(m) where m is clauses' }
        ],
        heuristicsAndMetaheuristics: ['WalkSAT (stochastic local search)', 'Survey Propagation', 'Genetic Algorithms'],
        inapproximabilityBound: 'Hastad (2001): Approximating MAX-3-SAT within (7/8 + epsilon) is NP-hard.',
        realWorldApplications: ['Hardware and software formal verification', 'Microprocessor pipeline bug finding', 'Automated theorem proving', 'Cryptanalysis'],
        description: 'The cornerstone of computational complexity theory. Proven NP-complete by Stephen Cook (1971) and Leonid Levin (1973).'
    },

    'vertex_cover': {
        id: 'vertex_cover',
        name: 'Vertex Cover',
        complexityClass: 'NP-Complete',
        decisionFormulation: 'Given an undirected graph G = (V, E) and integer k, does there exist a subset of at most k vertices that touches every edge in E?',
        optimizationFormulation: 'Minimum Vertex Cover: Find a subset of vertices of minimum cardinality that touches every edge.',
        polynomialReductionFrom: '3-SAT <=p Vertex Cover (Karp, 1972).',
        knownExactAlgorithms: [
            { name: 'Branch and Bound with Nemhauser-Trotter Reduction', complexity: 'O(1.2738^k + k*V)', practicalMaxN: 400 },
            { name: 'Integer Linear Programming (ILP) Formulation', complexity: 'Exponential worst-case, fast in practice via branch-and-cut', practicalMaxN: 1000 }
        ],
        knownApproximationAlgorithms: [
            { name: 'Greedy Maximal Matching (Take both endpoints of disjoint edges)', approxRatio: '2.0 (factor of 2 guaranteed)', complexity: 'O(V + E)' }
        ],
        heuristicsAndMetaheuristics: ['Simulated Annealing', 'Genetic Algorithm', 'Tabu Search'],
        inapproximabilityBound: 'NP-hard to approximate within 1.3606 (Dinur & Safra); Unique Games Conjecture implies 2.0 is optimal for polynomial time.',
        realWorldApplications: ['Network security monitor placement', 'Biological regulatory subnetworks', 'Traffic sensor surveillance'],
        description: 'A fundamental graph problem with dual relationships to Independent Set and Clique.'
    },

    'clique': {
        id: 'clique',
        name: 'Maximum Clique',
        complexityClass: 'NP-Complete',
        decisionFormulation: 'Given graph G = (V, E) and integer k, does G contain a complete subgraph of size at least k?',
        optimizationFormulation: 'Find the largest subset of vertices where every pair is connected by an edge.',
        polynomialReductionFrom: 'Vertex Cover <=p Clique (Complement graph G_bar has vertex cover of size |V| - k iff G has a clique of size k).',
        knownExactAlgorithms: [
            { name: 'Bron-Kerbosch Algorithm with Pivoting', complexity: 'O(3^(V/3)) worst case', practicalMaxN: 80 }
        ],
        knownApproximationAlgorithms: [
            { name: 'Greedy Degree-Based Heuristic', approxRatio: 'O(V / log^2 V) (Very poor approximation guarantee)', complexity: 'O(V^2)' }
        ],
        heuristicsAndMetaheuristics: ['Ant Colony Optimization', 'Reactive Local Search', 'Maximum Weight Clique PSO'],
        inapproximabilityBound: 'Hastad: Cannot be approximated within V^(1 - epsilon) unless P = NP.',
        realWorldApplications: ['Social network community detection', 'Bioinformatics protein-protein interaction clusters', 'Financial market correlation networks'],
        description: 'Notoriously hard to even approximate. Complements the Independent Set problem.'
    },

    'independent_set': {
        id: 'independent_set',
        name: 'Maximum Independent Set',
        complexityClass: 'NP-Complete',
        decisionFormulation: 'Given graph G = (V, E) and integer k, does G contain a subset of at least k vertices with no edges between any pair?',
        optimizationFormulation: 'Find the largest subset of vertices such that no two are adjacent.',
        polynomialReductionFrom: 'Clique <=p Independent Set (S is a clique in G iff S is an independent set in G_bar).',
        knownExactAlgorithms: [
            { name: 'Robson / Fomin-Grandoni-Kratsch Exact Branching', complexity: 'O(1.1996^V)', practicalMaxN: 100 }
        ],
        knownApproximationAlgorithms: [
            { name: 'Turán Theorem Bound Greedy Selection', approxRatio: 'd_avg / 2 (Weak)', complexity: 'O(V + E)' }
        ],
        heuristicsAndMetaheuristics: ['Evolutionary Algorithms', 'Simulated Annealing'],
        inapproximabilityBound: 'Cannot be approximated within V^(1 - epsilon) unless P = NP.',
        realWorldApplications: ['Wireless mesh channel assignment', 'Parallel task scheduling', 'Facility location without interference'],
        description: 'Direct dual of Vertex Cover: S is an independent set iff V \\ S is a vertex cover.'
    },

    'tsp': {
        id: 'tsp',
        name: 'Travelling Salesperson Problem (TSP)',
        complexityClass: 'NP-Hard',
        decisionFormulation: 'Given pairwise distances and threshold L, is there a Hamiltonian cycle visiting every city once with total distance <= L?',
        optimizationFormulation: 'Find a tour visiting every city exactly once and returning to origin with minimum total distance.',
        polynomialReductionFrom: 'Hamiltonian Cycle <=p TSP (Set edge weight = 1 if edge exists, 2 otherwise; threshold = N).',
        knownExactAlgorithms: [
            { name: 'Held-Karp Dynamic Programming', complexity: 'O(n^2 * 2^n)', practicalMaxN: 24 },
            { name: 'Concorde TSP Solver (Branch and Cut on Dantzig-Fulkerson-Johnson LP)', complexity: 'Exponential worst-case, solves instances with 85,000+ cities to proven optimality', practicalMaxN: 50000 }
        ],
        knownApproximationAlgorithms: [
            { name: 'Metric MST Doubling (Triangle Inequality)', approxRatio: '2.0', complexity: 'O(V^2)' },
            { name: "Christofides' Algorithm (MST + Minimum Weight Perfect Matching + Eulerian Tour)", approxRatio: '1.5', complexity: 'O(V^3)' },
            { name: 'Karlin-Klein-Oveis Gharan (2020)', approxRatio: '1.5 - 10^(-36) (Recent theoretical breakthrough)', complexity: 'Polynomial' }
        ],
        heuristicsAndMetaheuristics: [
            'Ant Colony Optimization (ACO)',
            'Genetic Algorithm (GA) with Order Crossover',
            'Lin-Kernighan-Helsgaun (LKH) 2-Opt / 3-Opt Local Search'
        ],
        inapproximabilityBound: 'General TSP (without triangle inequality) cannot be approximated within any constant factor alpha unless P = NP.',
        realWorldApplications: ['Logistics route planning', 'PCB drill routing', 'DNA sequencing assembly', 'Astronomical telescope observation sequencing'],
        description: 'The most celebrated NP-hard optimization problem. Explored extensively in ADAPTIX Nature-Inspired Optimization Lab.'
    },

    'ilp': {
        id: 'ilp',
        name: 'Integer Linear Programming (ILP / 0-1 ILP)',
        complexityClass: 'NP-Hard',
        decisionFormulation: 'Given matrix A, vector b, and vector c, does there exist an integer vector x >= 0 such that A*x <= b?',
        optimizationFormulation: 'Maximize c^T * x subject to A*x <= b, with all x_i integers.',
        polynomialReductionFrom: '3-SAT <=p 0-1 ILP (Each Boolean variable becomes 0/1 variable; clauses become linear inequalities).',
        knownExactAlgorithms: [
            { name: 'Branch and Bound + Gomory Cutting Planes', complexity: 'Exponential worst case', practicalMaxN: 5000 }
        ],
        knownApproximationAlgorithms: [
            { name: 'LP Relaxation with Randomized Rounding', approxRatio: 'Problem-specific (e.g., O(log m) for Set Cover)', complexity: 'Polynomial' }
        ],
        heuristicsAndMetaheuristics: ['Large Neighborhood Search (LNS)', 'Feasibility Pump', 'Genetic Algorithms'],
        realWorldApplications: ['Airline crew scheduling', 'Supply chain optimization', 'Compiler register allocation', 'Resource management'],
        description: 'Universal combinatorial formulation. Almost all discrete NP-hard optimization problems can be cast as an ILP.'
    }
};

export interface FeasibilityAssessment {
    problemId: string;
    problemName: string;
    inputSizeN: number;
    feasibilityTier: 'Feasible Exact' | 'Borderline / Constrained Exact' | 'Intractable for Exact — Approximation Required' | 'Extremely Intractable — Metaheuristics Mandatory';
    estimatedOperationsExact: string;
    estimatedExecutionTimeExact: string;
    recommendedApproach: 'Exact Algorithm' | 'Approximation Algorithm' | 'Metaheuristic / Nature-Inspired';
    specificRecommendation: string;
    tradeoffSummary: string;
    ratioGuarantee?: string;
}

export class NPAdvisor {
    /**
     * Estimates practical computational feasibility based on problem class and input size N
     */
    public static assessFeasibility(problemId: string, n: number): FeasibilityAssessment {
        const def = NP_PROBLEMS_CATALOG[problemId] ?? NP_PROBLEMS_CATALOG['tsp'];

        let ops = 0;
        let opsStr = '';
        let timeStr = '';
        let tier: FeasibilityAssessment['feasibilityTier'] = 'Feasible Exact';
        let rec: FeasibilityAssessment['recommendedApproach'] = 'Exact Algorithm';
        let specific = '';
        let tradeoffs = '';
        let ratio: string | undefined = undefined;

        if (problemId === 'tsp') {
            // Held-Karp O(n^2 * 2^n)
            const exactOps = Math.pow(2, n) * (n * n);
            ops = exactOps;
            opsStr = exactOps > 1e18 ? `~2^${n} * ${n}^2 (> 10^${Math.round(Math.log10(exactOps))})` : `${Math.round(exactOps).toLocaleString()} ops`;

            if (n <= 18) {
                tier = 'Feasible Exact';
                rec = 'Exact Algorithm';
                timeStr = '< 1.5 seconds (Held-Karp Dynamic Programming)';
                specific = 'Held-Karp Dynamic Programming (O(n^2 2^n)) will find the exact globally optimal tour quickly.';
                tradeoffs = 'Exact 100% optimal tour with zero error, requiring O(n 2^n) memory.';
                ratio = '1.0 (Exact Optimum)';
            } else if (n <= 23) {
                tier = 'Borderline / Constrained Exact';
                rec = 'Exact Algorithm';
                timeStr = '10s - 5 minutes (depending on RAM for DP table)';
                specific = 'Held-Karp DP or Branch-and-Bound. High memory consumption (~200MB - 2GB RAM).';
                tradeoffs = 'Guarantees global optimum, but approaching memory and CPU limits of standard hardware.';
                ratio = '1.0 (Exact Optimum)';
            } else if (n <= 100) {
                tier = 'Intractable for Exact — Approximation Required';
                rec = 'Approximation Algorithm';
                timeStr = 'Exact would take > 1,000 years! Christofides runs in < 50ms.';
                specific = "Use Christofides' 1.5-Approximation algorithm (O(n^3)) or 2-Opt local search.";
                tradeoffs = 'Guaranteed tour length at most 1.5x of the true optimum. Polynomial runtime.';
                ratio = '1.5x guarantee';
            } else {
                tier = 'Extremely Intractable — Metaheuristics Mandatory';
                rec = 'Metaheuristic / Nature-Inspired';
                timeStr = 'Exact would exceed age of the universe! ACO / GA runs in 0.5 - 2s.';
                specific = 'Ant Colony Optimization (ACO) or Genetic Algorithm (GA) with 2-Opt mutation.';
                tradeoffs = 'No theoretical worst-case ratio guarantee, but empirically yields solutions within 1-3% of optimum in seconds.';
                ratio = 'Empirical ~1.01 - 1.05x';
            }
        } else if (problemId === 'vertex_cover') {
            if (n <= 35) {
                tier = 'Feasible Exact';
                rec = 'Exact Algorithm';
                timeStr = '< 100 ms (Branch and Bound with Nemhauser-Trotter)';
                specific = 'Exact branch and bound with kernelization.';
                tradeoffs = 'Exact minimal vertex set.';
                ratio = '1.0 (Exact)';
            } else if (n <= 200) {
                tier = 'Borderline / Constrained Exact';
                rec = 'Exact Algorithm';
                timeStr = '0.5s - 10s via ILP Solver';
                specific = 'Formulate as 0-1 Integer Linear Program (minimize sum x_v subject to x_u + x_v >= 1).';
                tradeoffs = 'Fast exact solution on sparse graphs; slower on dense graphs.';
                ratio = '1.0 (Exact)';
            } else {
                tier = 'Intractable for Exact — Approximation Required';
                rec = 'Approximation Algorithm';
                timeStr = '< 5 ms (Greedy Maximal Matching)';
                specific = '2-Approximation Greedy Maximal Matching: pick edge (u, v), add both u and v, remove all incident edges.';
                tradeoffs = 'Linear time O(V + E), guaranteed solution <= 2 * OPT.';
                ratio = '2.0x guarantee';
            }
        } else {
            // General 2^n exponential
            const exactOps = Math.pow(2, n);
            ops = exactOps;
            opsStr = exactOps > 1e18 ? `~2^${n} (> 10^${Math.round(Math.log10(exactOps))})` : `${Math.round(exactOps).toLocaleString()} ops`;

            if (n <= 22) {
                tier = 'Feasible Exact';
                rec = 'Exact Algorithm';
                timeStr = '< 500 ms';
                specific = 'Standard exponential branch and bound / DPLL / exact search.';
                tradeoffs = 'Guaranteed globally optimal exact solution.';
                ratio = '1.0 (Exact)';
            } else if (n <= 40) {
                tier = 'Borderline / Constrained Exact';
                rec = 'Exact Algorithm';
                timeStr = 'Seconds to minutes with advanced solver heuristics.';
                specific = 'Use CDCL / modern SAT solvers or cutting plane branch-and-cut.';
                tradeoffs = 'Explores worst-case exponential space with aggressive pruning.';
                ratio = '1.0 (Exact)';
            } else {
                tier = 'Intractable for Exact — Approximation Required';
                rec = 'Metaheuristic / Nature-Inspired';
                timeStr = 'Exact: astronomical years; Metaheuristic: < 1 second.';
                specific = 'Apply Stochastic Local Search, Genetic Algorithms, or Simulated Annealing.';
                tradeoffs = 'Trades optimality guarantee for instant, high-quality practical feasibility.';
                ratio = 'Empirical heuristic';
            }
        }

        return {
            problemId,
            problemName: def.name,
            inputSizeN: n,
            feasibilityTier: tier,
            estimatedOperationsExact: opsStr,
            estimatedExecutionTimeExact: timeStr,
            recommendedApproach: rec,
            specificRecommendation: specific,
            tradeoffSummary: tradeoffs,
            ratioGuarantee: ratio
        };
    }

    /**
     * Inspects C++ code to detect known NP-hard problem patterns
     */
    public static detectNPPatterns(code: string): {
        matchedProblem?: HardnessProblemDefinition;
        confidence: number;
        reason: string;
        reductionInsight: string;
    } {
        const lower = code.toLowerCase();

        if (lower.includes('tsp') || (lower.includes('tour') && lower.includes('city')) || (lower.includes('salesperson'))) {
            return {
                matchedProblem: NP_PROBLEMS_CATALOG['tsp'],
                confidence: 0.95,
                reason: 'Matched Travelling Salesperson Problem signature (tour calculation across cities).',
                reductionInsight: 'Hamiltonian Cycle reduces to TSP in polynomial time. Exact solution via DP is O(n^2 2^n). For n > 20, recommend 1.5-approximation Christofides or ACO metaheuristic.'
            };
        }

        if (lower.includes('vertex') && lower.includes('cover')) {
            return {
                matchedProblem: NP_PROBLEMS_CATALOG['vertex_cover'],
                confidence: 0.95,
                reason: 'Matched Vertex Cover signature (vertex subset covering all edges).',
                reductionInsight: '3-SAT reduces to Vertex Cover (Karp 1972). Minimum Vertex Cover can be 2-approximated in linear time O(V+E) via maximal matching.'
            };
        }

        if (lower.includes('clique')) {
            return {
                matchedProblem: NP_PROBLEMS_CATALOG['clique'],
                confidence: 0.9,
                reason: 'Matched Maximum Clique signature (fully connected vertex subgraph).',
                reductionInsight: 'Vertex Cover reduces to Clique on the complement graph. Clique is notoriously hard to approximate within V^(1-eps).'
            };
        }

        if (lower.includes('sat') || lower.includes('cnf') || (lower.includes('clause') && lower.includes('literal'))) {
            return {
                matchedProblem: NP_PROBLEMS_CATALOG['sat'],
                confidence: 0.9,
                reason: 'Matched Boolean Satisfiability CNF clause/literal evaluation signature.',
                reductionInsight: 'Cook-Levin Theorem: SAT is NP-complete. Use CDCL / DPLL for exact or WalkSAT / GA for approximation.'
            };
        }

        return {
            confidence: 0.0,
            reason: 'No distinctive NP-hard or NP-complete problem pattern detected in current buffer.',
            reductionInsight: 'Problem appears to belong to polynomial class P or represents general data structure manipulation.'
        };
    }
}
