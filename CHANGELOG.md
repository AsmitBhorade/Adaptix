# Change Log

All notable changes to the "adaptix" extension will be documented in this file.

## [3.0.0] - 2026-11-14

### Major Architecture Upgrade — ADAPTIX 3.0
- **Dashboard-Only Interaction**: Consolidated all interactions into a unified 5-section extension dashboard (Overview, Code Intelligence, Optimization Workflow, Benchmark Lab, Learn & Explore) plus a hidden Advanced Academic Lab.
- **Removed Editor Clutter**: Cleanly removed CodeLens and Hover decorations in favor of the dashboard workflow.
- **Automated Safe Static Analysis**: Implemented safe, debounced (500ms) background analysis with race-condition prevention that never auto-compiles or auto-overwrites files.
- **Strict Vocabulary & Progressive Disclosure**: Unified terminology across all panels (Data Structure Usage, Algorithm Patterns, Measured Performance, Suggested Improvement, Step-by-Step Visualization, Optimization Strategy).
- **Academic Mode Feasibility Gate & Nature-Inspired Lab**: Standalone NP-completeness advisor and metaheuristic comparison engine (ACO, PSO, GA).
- **Packaging & Ownership**: Finalized build owned and maintained by Asmit Bhorade (https://github.com/AsmitBhorade/Adaptix).
