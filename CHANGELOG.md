# Change Log

All notable changes to the "adaptix" extension will be documented in this file.

## [3.1.3] - 2026-11-16

### Bug Fix: Webview Carousel State Sync on Smart Diff
- **Retain Webview Context**: Set `retainContextWhenHidden: true` in `registerWebviewViewProvider` to prevent reloading and UI resetting when switching tabs to diff editor.
- **Diff Scheme Exclusion**: Prevented `performSafeAnalysis` from running on virtual `adaptix-diff://` documents during side-by-side inspection.
- **Carousel Freeze on Diff**: Ensured `openSmartDiff` click handler purely requests diff preview without mutating local carousel item state or advancing navigation.

## [3.1.2] - 2026-11-16

### Refinements & Global Polish
- **Decoupled Smart Diff**: Previewing Smart Diff opens side-by-side comparison in editor without popup modals; application is triggered exclusively via the dashboard.
- **DCE Elimination in Benchmark Harness**: Volatile accumulator sinks and isolated iteration buffers prevent compiler dead code elimination under `-O2`.
- **Dynamic Algorithm Rewriting Engine**: Generalized automated refactoring for algorithmic bottlenecks.
- **Strict Brand Unification**: Consolidated branding workspace-wide to Adaptix.
- **Workspace Cleanup**: Pruned legacy packages and temporary artifacts.

## [3.0.0] - 2026-11-14

### Major Architecture Upgrade — Adaptix
- **Dashboard-Only Interaction**: Consolidated all interactions into a unified 5-section extension dashboard (Overview, Code Intelligence, Optimization Workflow, Benchmark Lab, Learn & Explore) plus a hidden Advanced Academic Lab.
- **Removed Editor Clutter**: Cleanly removed CodeLens and Hover decorations in favor of the dashboard workflow.
- **Automated Safe Static Analysis**: Implemented safe, debounced (500ms) background analysis with race-condition prevention that never auto-compiles or auto-overwrites files.
- **Strict Vocabulary & Progressive Disclosure**: Unified terminology across all panels (Data Structure Usage, Algorithm Patterns, Measured Performance, Suggested Improvement, Step-by-Step Visualization, Optimization Strategy).
- **Academic Mode Feasibility Gate & Nature-Inspired Lab**: Standalone NP-completeness advisor and metaheuristic comparison engine (ACO, PSO, GA).
- **Packaging & Ownership**: Finalized build owned and maintained by Asmit Bhorade (https://github.com/AsmitBhorade/Adaptix).
