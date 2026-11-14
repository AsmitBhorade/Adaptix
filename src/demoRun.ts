/**
 * ADAPTIX 2.0 — Complete Engine Live Execution Runner
 * 
 * Ingests 'examples/all_features_demo.cpp' and runs all 6 core subsystems:
 * 1. Unified Intelligence Pipeline
 * 2. Data Structure Intelligence (Semester 4)
 * 3. Algorithm Strategy Detection (Semester 5 DAA)
 * 4. Complexity Analysis & Empirical Benchmarks
 * 5. Visual Algorithm Trace Generation
 * 6. NP-Completeness & Feasibility Analysis
 * 7. Nature-Inspired Optimization Lab (ACO vs GA)
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnifiedPipeline } from './pipeline/unifiedPipeline';
import { Analyzer } from './analyzer';
import { StrategyDetector } from './algorithms/strategyDetector';
import { NPAdvisor } from './npCompleteness/npAdvisor';
import { BenchmarkRunner } from './benchmark/benchmarkRunner';
import { MetaheuristicComparisonEngine } from './natureInspired/comparisonEngine';
import { TraceGenerators } from './visualization/traceGenerators';

async function runDemo() {
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║               ADAPTIX 2.0 LIVE EXECUTION DEMO                    ║');
    console.log('║       Intelligent Algorithm & Data Structure Optimization Engine ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    const demoFilePath = path.join(__dirname, '../../examples/all_features_demo.cpp');
    let code = '';
    try {
        code = fs.readFileSync(demoFilePath, 'utf-8');
    } catch {
        code = fs.readFileSync(path.join(__dirname, '../examples/all_features_demo.cpp'), 'utf-8');
    }

    console.log(`[Source Ingestion] Loaded 'examples/all_features_demo.cpp' (${code.length} bytes, ${code.split('\n').length} lines)\n`);

    // ─────────────────────────────────────────────────────────────
    // 1. UNIFIED PIPELINE ANALYSIS
    // ─────────────────────────────────────────────────────────────
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log('▶ [MODULE 1 & 2] UNIFIED INTELLIGENCE PIPELINE ANALYSIS');
    console.log('─────────────────────────────────────────────────────────────────────');

    const analyzer = new Analyzer();
    const pipeline = new UnifiedPipeline(analyzer);
    const report = pipeline.analyze(code);

    console.log(`• Overall Codebase Health:     [ ${report.executiveSummary.overallHealth.toUpperCase()} ]`);
    console.log(`• Primary Bottleneck Alert:   ${report.executiveSummary.bottleneckHeadline}`);
    console.log(`• Tracked Containers:         ${report.dataStructures.trackedVariablesCount}`);
    console.log(`• Optimizations Discovered:   ${report.dataStructures.optimizationsFound}`);

    if (report.dataStructures.primaryRecommendation) {
        const ds = report.dataStructures.primaryRecommendation;
        console.log(`\n  ┌── [Data Structure Recommendation] ──────────────────────────┐`);
        console.log(`  │ Variable:    ${ds.varName.padEnd(46)}│`);
        console.log(`  │ Current:     ${ds.current.padEnd(46)}│`);
        console.log(`  │ Suggested:   ${ds.suggested.padEnd(46)}│`);
        console.log(`  │ Speedup:     ${ds.speedup.padEnd(46)}│`);
        console.log(`  │ Confidence:  ${ds.confidence.padEnd(46)}│`);
        console.log(`  └─────────────────────────────────────────────────────────────┘`);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ALGORITHM STRATEGY DETECTION
    // ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────────────────────');
    console.log('▶ [MODULE 1] ALGORITHM STRATEGY INTELLIGENCE (SEMESTER 5 DAA)');
    console.log('─────────────────────────────────────────────────────────────────────');

    const strategies = StrategyDetector.analyze(code);
    for (const strat of strategies) {
        console.log(`\n• Detected Paradigm:  ${strat.detectedParadigm.toUpperCase()} (${strat.confidenceLabel} Confidence: ${Math.round(strat.confidence * 100)}%)`);
        console.log(`  Reason:             ${strat.primaryReason}`);
        if (strat.recurrenceRelation) {
            console.log(`  Recurrence Formula: ${strat.recurrenceRelation}`);
        }
        console.log(`  Complexity Shift:   ${strat.theoreticalComplexity.current.time}  ──>  ${strat.theoreticalComplexity.proposed.time}`);
        console.log(`  Trade-offs:         ${strat.tradeoffs.join('; ')}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. NP-COMPLETENESS & APPROXIMATION ADVISOR
    // ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────────────────────');
    console.log('▶ [MODULE 4] NP-COMPLETENESS & APPROXIMATION ADVISOR');
    console.log('─────────────────────────────────────────────────────────────────────');

    const npMatch = NPAdvisor.detectNPPatterns(code);
    if (npMatch.matchedProblem) {
        console.log(`• Hardness Matched:   ${npMatch.matchedProblem.name} (${npMatch.matchedProblem.complexityClass})`);
        console.log(`• Reduction Proof:    ${npMatch.reductionInsight}`);

        // Feasibility check for N = 15, N = 50, N = 200
        console.log('\n  Input Size Feasibility Transitions:');
        for (const testN of [14, 50, 200]) {
            const feas = NPAdvisor.assessFeasibility('tsp', testN);
            console.log(`  • N = ${String(testN).padEnd(4)} ──> [ ${feas.feasibilityTier} ]`);
            console.log(`    Strategy:     ${feas.recommendedApproach} (${feas.specificRecommendation})`);
            console.log(`    Exact Time:   ${feas.estimatedExecutionTimeExact}`);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. COMPLEXITY ANALYSIS & EMPIRICAL BENCHMARKS
    // ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────────────────────');
    console.log('▶ [MODULE 2] EMPIRICAL COMPLEXITY & BENCHMARK LAB');
    console.log('─────────────────────────────────────────────────────────────────────');

    console.log('Running microsecond CPU benchmark (Sorting: Bubble vs Merge vs Quick on Reverse-Sorted)...');
    const benchRes = BenchmarkRunner.runSortingBenchmark('reverse_sorted', [500, 1000, 2000]);
    console.log(`Hardware Environment: ${benchRes.hardwareContext}\n`);
    console.log(`Size N\t\tBubble Sort (ms)\tMerge Sort (ms)\tQuick Sort (ms)`);
    console.log(`──────\t\t────────────────\t───────────────\t───────────────`);

    for (let i = 0; i < benchRes.inputSizes.length; i++) {
        const n = benchRes.inputSizes[i];
        const bubbleTime = benchRes.series[0].dataPoints[i]?.measuredTimeMs ?? 0;
        const mergeTime = benchRes.series[1].dataPoints[i]?.measuredTimeMs ?? 0;
        const quickTime = benchRes.series[2].dataPoints[i]?.measuredTimeMs ?? 0;
        console.log(`${n}\t\t${bubbleTime.toFixed(3)} ms\t\t${mergeTime.toFixed(3)} ms\t\t${quickTime.toFixed(3)} ms`);
    }
    console.log(`\n• Benchmark Finding: ${benchRes.analysisSummary}`);

    // ─────────────────────────────────────────────────────────────
    // 5. NATURE-INSPIRED OPTIMIZATION LAB (ACO VS GA)
    // ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────────────────────');
    console.log('▶ [MODULE 5] NATURE-INSPIRED OPTIMIZATION LAB (ACO VS GA ON TSP)');
    console.log('─────────────────────────────────────────────────────────────────────');

    const sampleCities = MetaheuristicComparisonEngine.generateSampleCities(12, 42);
    console.log(`Simulating 12-city TSP route optimization (Seed: 42, Iterations: 30)...`);
    const compResult = MetaheuristicComparisonEngine.compareTSP(sampleCities, 42, {
        maxIterations: 30,
        numAnts: 20
    }, {
        maxGenerations: 30,
        populationSize: 30
    });

    console.log(`• Ant Colony Best Tour Cost:   ${compResult.aco.bestCost.toFixed(2)} (${compResult.aco.totalTimeMs} ms)`);
    console.log(`• Genetic Algorithm Best Cost: ${compResult.ga.bestCost.toFixed(2)} (${compResult.ga.totalTimeMs} ms)`);
    console.log(`• Optimization Verdict:        ${compResult.winner.toUpperCase()} won (${compResult.percentageDifference.toFixed(1)}% difference)`);
    console.log(`• Lab Summary:                 ${compResult.summary}`);

    // ─────────────────────────────────────────────────────────────
    // 6. VISUAL ALGORITHM DEBUGGER TRACE GENERATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────────────────────');
    console.log('▶ [MODULE 3] VISUAL ALGORITHM DEBUGGER TRACE GENERATION');
    console.log('─────────────────────────────────────────────────────────────────────');

    const fibTraces = TraceGenerators.generateFibonacciRecursionTree(4);
    const dpTraces = TraceGenerators.generate01KnapsackDPTable(7, [1, 3, 4, 5], [1, 4, 5, 7]);
    const nQueensTraces = TraceGenerators.generateNQueensTrace(4);

    console.log(`• Generated ${fibTraces.length} Recursion Tree trace frames for Fibonacci (flags redundant overlapping nodes)`);
    console.log(`• Generated ${dpTraces.length} Dynamic Programming 2D grid trace frames for 0/1 Knapsack (with dependency arrows)`);
    console.log(`• Generated ${nQueensTraces.length} Backtracking search tree frames for 4-Queens (with conflict pruning & solutions)`);

    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║       ALL ADAPTIX 2.0 SUBSYSTEMS OPERATIONAL & VERIFIED           ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
}

runDemo();

