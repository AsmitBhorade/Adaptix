/**
 * Master Test Suite Runner for ADAPTIX 3.0
 */

import { runDataStructureTests } from './dataStructures.test';
import { runAlgorithmStrategyTests } from './algorithms.test';
import { runNatureInspiredTests } from './natureInspired.test';
import { runComplexityBenchmarkTests } from './complexityBenchmark.test';
import { runNPAdvisorTests } from './npAdvisor.test';
import { runVisualizerTests } from './visualizer.test';
import { runPipelineTests } from './pipeline.test';
import { runAdaptix3Tests } from './adaptix3.test';

async function main() {
    console.log('===============================================================');
    console.log('  ADAPTIX 3.0 MASTER TEST SUITE EXECUTION');
    console.log('  Frictionless Algorithm & Data Structure Optimization Engine');
    console.log('===============================================================\n');

    const startTime = Date.now();
    let totalFailed = 0;

    const suites: { name: string; runner: () => void | Promise<void> }[] = [
        { name: 'Data Structure Intelligence (Semester 4 Preserved)', runner: runDataStructureTests },
        { name: 'Algorithm Strategy Intelligence Engine (Module 1)', runner: runAlgorithmStrategyTests },
        { name: 'Complexity Analysis and Benchmark Lab (Module 2)', runner: runComplexityBenchmarkTests },
        { name: 'Visual Algorithm Debugger Trace Generators (Module 3)', runner: runVisualizerTests },
        { name: 'NP-Completeness and Approximation Advisor (Module 4)', runner: runNPAdvisorTests },
        { name: 'Nature-Inspired Optimization Lab (Module 5)', runner: runNatureInspiredTests },
        { name: 'Unified Intelligence Pipeline (Module 6)', runner: runPipelineTests },
        { name: 'ADAPTIX 3.0 Architecture & Upgrade Pillars (Module 7)', runner: runAdaptix3Tests }
    ];

    for (const suite of suites) {
        try {
            await suite.runner();
            console.log(`\n>>> [PASS] ${suite.name}\n`);
        } catch (err: any) {
            totalFailed++;
            console.error(`\n>>> [FAIL] ${suite.name}:`, err.message);
            console.error(err.stack);
            console.log('\n');
        }
    }

    const elapsed = Date.now() - startTime;
    console.log('===============================================================');
    if (totalFailed === 0) {
        console.log(`  ALL TEST SUITES PASSED! (${suites.length}/${suites.length} suites passed in ${elapsed}ms)`);
        console.log('  Semester 4 functionality preserved. Semester 5 DAA verified. ADAPTIX 3.0 Upgrades Operational.');
    } else {
        console.error(`  TEST FAILURES: ${totalFailed} suite(s) failed.`);
        process.exit(1);
    }
    console.log('===============================================================\n');
}

main();
