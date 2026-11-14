# ADAPTIX 3.0 — Frictionless Developer-First Algorithm & Data Structure Optimization Engine

[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.9-blue.svg)](https://www.typescriptlang.org/)
[![VS Code Extension](https://img.shields.io/badge/Platform-VS_Code_Extension_API-purple.svg)](https://code.visualstudio.com/api)
[![Academic Scope](https://img.shields.io/badge/Academic_Scope-Semester_4_DSA_%2B_Semester_5_DAA-emerald.svg)](#academic-relevance)
[![Tests](https://img.shields.io/badge/Test_Suite-8%2F8_Passed-brightgreen.svg)](#test-suite-and-verification)
[![License](https://img.shields.io/badge/License-MIT-gray.svg)](LICENSE)

---

## 1. Executive Summary & Objective

**ADAPTIX 3.0** is an enterprise-grade, developer-first algorithmic engineering and optimization engine built natively as a Visual Studio Code extension for C++ engineers, performance specialists, computer science students, and researchers.

Where ADAPTIX 2.0 consolidated algorithmic complexity theory and Semester 5 DAA concepts, **ADAPTIX 3.0** streamlines the user interface, elevates editor-native integration, closes the code-refactoring loop, and enforces progressive disclosure. The result is a frictionless, high-precision production developer tool that retains the full mathematical power of Semester 4 DSA and Semester 5 DAA on demand.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                      ADAPTIX 3.0                                       │
│          Frictionless Developer-First Algorithm & Data Structure Optimization          │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    CODE INTELLIGENCE     │       PERFORMANCE LAB       │        VISUAL DEBUGGER        │
│ • Container Recommendations • Space vs. Time Slider    │ • Timeline Scrubber (0 to N)  │
│ • Algorithm Paradigm AST │ • Real C++ Runner (-O2)     │ • Frame-by-Frame Stepper      │
│ • Two-Sentence Rule      │ • Before vs. After Speedups │ • Variable State Snapshots    │
│ • Inline CodeLens Engine │ • Empirical Big-O Charts    │ • Recursion, DP, Graph, Trees │
│ • Automated Counterexamples • History & Reports Drawer │ • Multi-Speed Playback (5x)   │
├──────────────────────────┴─────────────────────────────┴───────────────────────────────┤
│                                  ACADEMIC LAB (DAA)                                    │
│       [OFF by default | Toggle in Webview Header or 'adaptix.academicMode' Setting]     │
│ • NP-Completeness & Feasibility Gate (N <= 18 Exact vs 1.5-Approx vs Metaheuristics)   │
│ • Nature-Inspired Optimization Lab (Ant Colony, Particle Swarm, Genetic Algorithm)    │
│ • Master Theorem Formulations, Recurrence Derivations & Full Mathematical Proofs       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Upgrades in ADAPTIX 3.0

### Pillar 1 — Decluttering & Progressive Disclosure ("Trim the Fat")
* **Consolidated 3-Pillar Dashboard:** The 9 fragmented dashboard sections from ADAPTIX 2.0 are now organized into 3 primary tabs:
  1. **Code Intelligence:** Unified workspace for Data Structure recommendations, Algorithm Strategy detection, Automated Edge-Case tests, Template Injection, and Semantic Smart Diffs.
  2. **Performance Lab:** Complexity analysis, Space vs. Time slider controls, real C++ execution benchmarking, Before/After optimization speedups, and a collapsible History & Reports drawer.
  3. **Visual Debugger:** Interactive step-by-step algorithm visualizers with the new Timeline Scrubber.
* **"Advanced Academic Mode" Toggle (`adaptix.academicMode`):**
  * **When OFF (Default Production Mode):** Heavy academic modules (NP-Completeness Advisor and Nature-Inspired Lab) are hidden from the primary interface. AI explanations strictly adhere to the **Two-Sentence Rule**: a sharp 2-sentence diagnosis with Big-O impact upfront, placing deeper mathematical proofs behind an expandable `"Read More / Explain the Math"` accordion.
  * **When ON (Academic / DAA Mode):** Unlocks the **Academic Lab** tab, revealing full NP-Completeness feasibility tables, Nature-Inspired optimizers (ACO, PSO, GA), and comprehensive theoretical derivations.

### Pillar 2 — Editor-Native & Interactive UX Polish
* **Contextual Inline CodeLens (`vscode.CodeLensProvider`):** Automatically detects C++ functions and displays actionable annotations above signatures:
  * `⚠️ O(2^N) Recursive Bottleneck | ⚡ Optimize with DP`
  * `💡 std::vector::erase inside loop -> O(N²) | 🔄 Switch to std::unordered_set`
  * `💡 Paradigm: DIVIDE AND CONQUER (O(N²) → O(N log N)) | 🛠️ Inject Template`
  * `🧪 Run Edge-Case Counterexample`
  * `📊 Benchmark Before vs After`
* **Interactive "Space vs. Time" Optimization Slider:**
  * 3-state slider (`Memory-First [O(1) Space]` ↔ `Balanced` ↔ `Speed-First [O(1)/O(N) Time]`) wired to `adaptix.optimizationBias`, `decision.ts`, and `aiService.ts`.
  * **Memory-First:** Prioritizes in-place transformations, iterative two-pointer patterns, bit manipulation, and compact containers (`std::vector`, flat arrays, `std::deque`).
  * **Speed-First:** Prioritizes memoization, tabulation, hash lookups (`std::unordered_map`, `std::unordered_set`), and precomputation trade-offs.
* **Smooth Visualizer Timeline Scrubber:**
  * Upgrades all visualizers (Recursion Tree, DP Table, Backtracking, Graph, Sorting/Searching) with an interactive **Timeline Playback Scrubber** (range slider + frame counter + playback speed control + Play/Pause/Step buttons). Drag smoothly across trace frames $t \in [0, N]$ to inspect variable states, call stacks, and grid highlights instantly.

### Pillar 3 — High-Impact Developer Upgrades
* **Automated Edge-Case & Counterexample Generator (`EdgeCaseRunner`):**
  * When fragile algorithms are detected (e.g. Greedy Coin Change on non-canonical systems, midpoint calculation integer overflow `(l + r) / 2`, or missing boundary guards), generates a compilable C++ test harness.
  * Executes safely in a sandboxed child process with strict timeouts, displaying failing input, expected optimal output, and actual naive output in the UI.
* **Live Standard Library Big-O Hover (`AdaptixHoverProvider`):**
  * Tooltips for STL containers (`vector`, `list`, `map`, `unordered_set`, etc.) and algorithms (`sort`, `lower_bound`, `binary_search`, etc.).
  * Displays Average, Amortized, and Worst-Case Time Complexity, Auxiliary Space Complexity, and context-aware loop-nesting warnings (e.g., warning if `std::vector::erase` is called inside a loop).
* **Native VS Code Semantic "Smart" Diff (`AdaptixDiffContentProvider`):**
  * Replaces plain text code previews with native side-by-side diffs using a virtual read-only provider (`adaptix-diff://`).
  * Developers inspect exact additions/deletions and click "Accept Refactor" or "Discard" without polluting the workspace.

### Pillar 4 — Closing the Algorithmic Refactoring Loop
* **Context-Aware Algorithmic Template Injection (`TemplateInjector`):**
  * One-click **"Inject Skeleton"** pre-populated with the user's actual function signature, return type, and parameter names.
  * Supports Dynamic Programming (tabulation & memoization), Divide & Conquer, Two Pointers, Sliding Window, Binary Search on Answer Space, and Backtracking with Pruning.
* **Automatic Before/After Closed-Loop Benchmarking (`BeforeAfterRunner`):**
  * Compiles both original and refactored implementations with identical compiler flags (`-O2`) and executes them across controlled input sizes ($N = 1000, 5000, 20000, 50000$).
  * Displays comparative execution time speedups (e.g., `Optimization Verified: Execution time reduced by 99.8% (7600 ms -> 17.52 ms at N = 50,000)`), memory deltas, and 100% output correctness verification.

---

## 3. Preserved Semester 4 & 5 Engines

ADAPTIX 3.0 preserves 100% backward compatibility with underlying analytical engines:
1. **Data Structure Intelligence (Semester 4 Foundation):**
   * Real-time operation counting (insertions, searches, deletions).
   * Min-Heap priority queue candidate ranking in $O(\log K)$.
   * Constraint-based safety validator preventing ordering violations.
2. **Algorithm Strategy Intelligence (Module 1):**
   * Detection of Divide & Conquer, Dynamic Programming, Greedy, and Backtracking.
   * Master Theorem recurrence derivations ($T(n) = aT(n/b) + f(n)$).
3. **Complexity Analysis & Benchmark Lab (Module 2):**
   * Empirical benchmarking across input distributions (Random, Sorted, Reverse, Duplicate-Heavy).
   * Overlay of measured CPU execution time with asymptotic theoretical curves.
4. **Visual Algorithm Debugger (Module 3):**
   * Trace generators for 0/1 Knapsack DP Table, Fibonacci Recursion Tree, N-Queens Backtracking, Dijkstra Graph, and QuickSort Partitions.
5. **NP-Completeness & Approximation Advisor (Module 4):**
   * Catalog of canonical NP-Complete / NP-Hard problems (SAT, TSP, Vertex Cover, Clique, ILP).
   * Feasibility gate: $N \le 18$ (Exact), $20 < N \le 100$ (1.5-Approx), $N > 100$ (Metaheuristics).
6. **Nature-Inspired Optimization Lab (Module 5):**
   * Ant Colony Optimization (ACO) for TSP routes.
   * Particle Swarm Optimization (PSO) for continuous non-linear functions (Sphere, Rastrigin, Rosenbrock, Ackley).
   * Genetic Algorithm (GA) with Order Crossover (OX) and elitism.
   * 100% deterministic reproducibility using `SeededRandom`.

---

## 4. Extension Configuration & Commands

### Settings (`package.json`)
| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `adaptix.academicMode` | `boolean` | `false` | Enable Advanced Academic Mode (DAA NP-Completeness, Nature Lab, Deep Proofs) |
| `adaptix.optimizationBias` | `enum` | `"speed"` | Optimization Bias: `"speed"` (O(1) time), `"balanced"`, `"memory"` (O(1) space) |
| `adaptix.autoEdgeCaseCheck` | `boolean` | `true` | Automatically run edge-case & counterexample test harnesses for fragile logic |

### Commands
| Command | Title | Description |
| :--- | :--- | :--- |
| `adaptix.showInsights` | Show Developer Dashboard | Opens the 3-pillar ADAPTIX sidebar view |
| `adaptix.toggleAcademicMode` | Toggle Academic Mode | Switches between clean Production and full Academic DAA mode |
| `adaptix.setOptimizationBias` | Set Optimization Bias | Adjusts trade-off between execution speed and memory consumption |
| `adaptix.injectTemplate` | Inject Algorithmic Skeleton | Inserts pre-populated idiomatic C++ template matching detected paradigm |
| `adaptix.openSmartDiff` | Preview Semantic Smart Diff | Opens native VS Code diff viewer for proposed refactorings |
| `adaptix.runEdgeCaseTest` | Run Counterexample Test | Generates and executes compilable C++ counterexample harness |
| `adaptix.runBeforeAfterBenchmark` | Benchmark Before vs After | Compiles with `-O2` and benchmarks original vs refactored implementations |
| `adaptix.runBenchmark` | Run Empirical Benchmark | Runs empirical complexity benchmark suite across input sizes |
| `adaptix.openVisualizer` | Open Visual Debugger | Launches algorithm visualizer with Timeline Scrubber |
| `adaptix.openNatureLab` | Open Nature-Inspired Lab | Opens ACO, PSO, and GA comparison lab (Academic Mode) |
| `adaptix.openNPAdvisor` | Open NP-Completeness Advisor | Evaluates problem tractability for input size $N$ (Academic Mode) |
| `adaptix.analyzeCurrentFile` | Run Full Analysis Pipeline | Triggers full AST inspection of active C++ editor |
| `adaptix.applyRefactor` | Apply Safe Refactor | Applies validated mechanical or semantic refactoring |

---

## 5. Test Suite and Verification

ADAPTIX 3.0 includes an expanded master test suite verifying all modules:

```bash
npm test
```

### Verified Test Suites (8/8 Passed):
```
===============================================================
  ADAPTIX 3.0 MASTER TEST SUITE EXECUTION
  Frictionless Algorithm & Data Structure Optimization Engine
===============================================================

--- Testing Data Structure Intelligence (Semester 4 Foundation) ---
✓ Monitor operation counting and ratio calculation
✓ Decision Engine: Vector -> Hash Map recommendation for search-heavy workloads
✓ Constraint Engine: Enforces ordering requirement safety
✓ Pattern Detector: Identifies Priority Queue extrema extraction via Trie
✓ Intent Detector: Recognizes frequency counting syntax patterns
✓ Full Analyzer: Parses C++ code and maps operations correctly (Searches: 400, Inserts: 100)
>>> [PASS] Data Structure Intelligence (Semester 4 Preserved)

--- Testing Algorithm Strategy Intelligence Engine (Module 1) ---
✓ Strategy Detection: Exponential recursion flagged for Dynamic Programming
✓ Strategy Detection: Halving + dual recursion flagged as Divide & Conquer
✓ Strategy Detection: Sort by finish time + single pass flagged as Greedy
✓ Strategy Detection: Recursion + constraint check + state rollback flagged as Backtracking
✓ Canonical Problems Catalog: All 4 DAA paradigms populated with C++ implementations
>>> [PASS] Algorithm Strategy Intelligence Engine (Module 1)

--- Testing Complexity Analysis and Benchmark Lab (Module 2) ---
✓ Input Generator: Generates random, sorted, reverse-sorted, and duplicate distributions
✓ Sorting Presets: Bubble, Merge, and QuickSort sort correctly
✓ Search Presets: Linear Search vs Binary Search Big-O operation count verification
✓ Fibonacci Presets: Correctness + Exponential operations (177) vs DP Linear operations (9)
✓ Benchmark Runner: Multi-size empirical benchmark with measured times
>>> [PASS] Complexity Analysis and Benchmark Lab (Module 2)

--- Testing Visual Algorithm Debugger Trace Generators (Module 3) ---
✓ Recursion Tree: Generates 18 steps with 4 overlapping nodes identified
✓ DP Table Visualizer: Generates 2D table snapshots with cell dependencies and final reconstruction
✓ Backtracking Visualizer: Search-space tree with 18 pruned branches and valid solution
✓ Graph Visualizer: Priority queue extract-min and edge relaxation step generation
✓ Sorting Visualizer: Pivot selection, pairwise comparisons, and swap animations verified
>>> [PASS] Visual Algorithm Debugger Trace Generators (Module 3)

--- Testing NP-Completeness and Approximation Advisor (Module 4) ---
✓ NP Problems Catalog: All canonical NP-Complete / NP-Hard problems cataloged
✓ Feasibility Estimator: Accurately routes N <= 18 (Exact), N = 50 (1.5-Approx), N = 300 (Metaheuristics)
✓ Pattern Recognition: Identifies TSP problem context and explains reductions
>>> [PASS] NP-Completeness and Approximation Advisor (Module 4)

--- Testing Nature-Inspired Optimization Lab (Module 5) ---
✓ SeededRandom: 100% deterministic reproducibility with identical seeds
✓ Benchmark Functions: Mathematical correctness of objective calculations at known optima
✓ Ant Colony Optimization: Valid permutation tours, monotonically non-increasing elitism (1106.37)
✓ Particle Swarm Optimization: Boundary confinement respected, converged to 1.382e-6
✓ Genetic Algorithm: Order Crossover preserves permutations, elitism verified (1106.37)
✓ Metaheuristic Comparison Engine: Direct side-by-side benchmarking
>>> [PASS] Nature-Inspired Optimization Lab (Module 5)

--- Testing Unified Intelligence Pipeline ---
✓ Unified Pipeline: Cross-cutting synthesis combining DS (unordered_set) and Algorithm (dynamic_programming)
✓ Unified Pipeline: NP-Hard problem routed to Nature-Inspired Optimization Lab
>>> [PASS] Unified Intelligence Pipeline (Module 6)

--- Testing ADAPTIX 3.0 Architecture & Upgrade Pillars ---
✓ STL Big-O Hover: Comprehensive complexity specifications & loop warnings verified
✓ Space vs. Time Slider: Bias dynamically alters decision costs and populates Two-Sentence diagnosis
✓ Two-Sentence Rule: Produces crisp Big-O diagnosis upfront with deep theory segregated
✓ Inline CodeLens Pipeline: Correctly extracts functions, exponential recursion, and loop-nested erase bottlenecks
✓ Template Injector: Preserves function signature, adapts to Space vs. Time bias (O(1) rolling space vs O(N) table)
✓ Timeline Scrubber: Verified frame sequential integrity across all 18 trace steps
✓ Edge-Case Generator: Successfully constructed and verified concrete failing counterexample
✓ Closed-Loop Benchmark: Optimization Verified: Execution time reduced by 99.8% (7600 ms -> 17.52 ms at N = 50,000) (Verified: true)
>>> [PASS] ADAPTIX 3.0 Architecture & Upgrade Pillars (Module 7)

===============================================================
  ALL TEST SUITES PASSED! (8/8 suites passed in 240ms)
  Semester 4 functionality preserved. Semester 5 DAA verified. ADAPTIX 3.0 Upgrades Operational.
===============================================================
```

---

## 6. Architecture & Directory Map

```
Adaptix-DSA-master/
├── package.json                          # Extension manifest (v3.0.0, commands, configuration)
├── README.md                             # Comprehensive ADAPTIX 3.0 technical documentation
├── tsconfig.json                         # TypeScript configuration (ES2022, DOM, Node16)
├── src/
│   ├── extension.ts                      # Main entry point registering all 3.0 providers & commands
│   ├── ui.ts                             # Consolidated 3-Pillar Webview dashboard provider
│   ├── analyzer.ts                       # Real-time C++ keystroke parser & operation monitor
│   ├── decision.ts                       # Min-Heap cost engine with Space vs. Time optimization bias
│   ├── monitor.ts                        # Container operation ratio tracker
│   ├── intent.ts                         # Developer intent classifier
│   ├── patternDetector.ts                # Advanced data structure pattern recognizer
│   ├── constraints.ts                    # Ordering & random-access constraint builder
│   ├── refactorPlanner.ts                # Mechanical refactoring planner
│   ├── refactorSafety.ts                 # Safety validator
│   ├── refactorType.ts                   # Refactoring classification
│   ├── validator.ts                      # Strict AI output validation
│   ├── explanation.ts                    # Explanation generator
│   ├── simulation.ts                     # Speedup multiplier simulator
│   ├── insight.ts                        # Insight generator
│   ├── logger.ts                         # Debug logging
│   ├── capabilities.ts                   # Container capabilities registry
│   ├── consistency.ts                    # Consistency checker
│   ├── learning.ts                       # Personalized recommendation weighting
│   ├── aiService.ts                      # Backward-compatible AI service facade
│   ├── providers/
│   │   ├── codeLensProvider.ts           # Contextual inline CodeLens for C++ functions
│   │   ├── hoverProvider.ts              # Live STL container & algorithm Big-O hover tooltips
│   │   └── diffContentProvider.ts        # Native VS Code Semantic Smart Diff (adaptix-diff://)
│   ├── validation/
│   │   └── edgeCaseRunner.ts             # Automated C++ counterexample test harness runner
│   ├── refactoring/
│   │   └── templateInjector.ts           # Context-aware algorithmic template boilerplate generator
│   ├── benchmark/
│   │   ├── beforeAfterRunner.ts          # Closed-loop before/after compilation & execution runner
│   │   ├── benchmarkRunner.ts            # Multi-size empirical benchmark lab
│   │   └── benchmarkPresets.ts           # Sorting, searching, and recursion presets
│   ├── services/
│   │   └── aiService.ts                  # Semantic refactor AI service with Two-Sentence Rule & bias
│   ├── webview/
│   │   ├── dashboard.html                # Consolidated 3-tab dashboard template
│   │   ├── main.ts                       # Webview controller for Timeline Scrubber & sliders
│   │   └── style.css                     # Dark-mode technical design & glassmorphism stylesheet
│   ├── algorithms/
│   │   ├── strategyDetector.ts           # D&C, DP, Greedy, and Backtracking paradigm detector
│   │   └── canonicalProblems.ts          # Knowledge base of canonical Semester 5 DAA problems
│   ├── analysis/
│   │   └── astParser.ts                  # Fault-tolerant C++ AST parser & loop nesting inspector
│   ├── npCompleteness/
│   │   └── npAdvisor.ts                  # P vs NP advisor & input size feasibility gate
│   ├── natureInspired/
│   │   ├── aco.ts                        # Ant Colony Optimization (TSP)
│   │   ├── pso.ts                        # Particle Swarm Optimization (Continuous)
│   │   ├── ga.ts                         # Genetic Algorithm (Permutation & Continuous)
│   │   ├── comparisonEngine.ts           # Side-by-side metaheuristic comparison
│   │   └── random.ts                     # Seedable deterministic pseudo-random generator
│   ├── pipeline/
│   │   └── unifiedPipeline.ts            # Unified cross-cutting intelligence coordinator
│   └── test/
│       ├── runAllTests.ts                # Master test runner (all 8 suites)
│       ├── adaptix3.test.ts              # Comprehensive ADAPTIX 3.0 upgrade tests
│       ├── algorithms.test.ts            # Algorithm strategy detection tests
│       ├── complexityBenchmark.test.ts   # Benchmark runner tests
│       ├── dataStructures.test.ts        # Data structure intelligence tests
│       ├── extension.test.ts             # Extension integration tests
│       ├── natureInspired.test.ts        # ACO, PSO, GA reproducibility tests
│       ├── npAdvisor.test.ts             # NP-completeness catalog & feasibility tests
│       ├── pipeline.test.ts              # Unified pipeline synthesis tests
│       └── visualizer.test.ts            # Visual debugger trace step tests
```

---

## 7. License
MIT License. Created by Adhiraj Patil. Upgraded to ADAPTIX 3.0.
