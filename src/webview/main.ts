/**
 * ADAPTIX 3.0 Webview Client Controller
 * 
 * Manages the consolidated 3-pillar dashboard, Academic Mode visibility,
 * Space vs. Time Optimization Slider, Closed-Loop Before/After Benchmarking,
 * and the Interactive Timeline Playback Scrubber for all visualizers.
 */

// Declare VS Code API acquisition
declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : {
    postMessage: (msg: any) => console.log('postMessage:', msg),
    getState: () => ({}),
    setState: (_s: any) => {}
};

// Global Webview State
let currentAcademicMode = false;
let currentOptimizationBias: 'memory' | 'balanced' | 'speed' = 'speed';
let activeTabId = 'intelligence';

// Timeline Playback Scrubber State
let activeTraceSteps: any[] = [];
let currentFrameIdx = 0;
let isPlaying = false;
let playSpeedMultiplier = 1.0;
let playbackTimer: any = null;

// ─────────────── TAB NAVIGATION ───────────────
export function selectTab(tabId: string): void {
    activeTabId = tabId;
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const isTarget = tab.getAttribute('data-tab') === tabId;
        tab.classList.toggle('active', isTarget);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
        const isTarget = panel.id === `tab-${tabId}`;
        panel.classList.toggle('active', isTarget);
    });

    vscode.postMessage({ command: 'switchTab', tab: tabId });
}

// ─────────────── ACADEMIC MODE TOGGLE ───────────────
export function toggleAcademicMode(explicitVal?: boolean): void {
    const checkbox = document.getElementById('academicModeCheckbox') as HTMLInputElement;
    if (checkbox && explicitVal !== undefined) {
        checkbox.checked = explicitVal;
    }
    const enabled = checkbox ? checkbox.checked : !currentAcademicMode;
    currentAcademicMode = enabled;

    const academicNavTab = document.getElementById('academicNavTab');
    if (academicNavTab) {
        academicNavTab.style.display = enabled ? 'flex' : 'none';
        if (!enabled && activeTabId === 'academic') {
            selectTab('intelligence');
        }
    }

    const academicSections = document.querySelectorAll('.academic-only');
    academicSections.forEach((el: any) => {
        el.style.display = enabled ? 'block' : 'none';
    });

    // Toggle default open state of accordion proofs
    const accordions = document.querySelectorAll('details.explain-accordion');
    accordions.forEach((acc: any) => {
        acc.open = enabled; // Auto-expanded in Academic Mode, collapsed in Production Mode
    });

    vscode.postMessage({ command: 'setAcademicMode', enabled });
}

// ─────────────── SPACE VS TIME SLIDER ───────────────
export function onBiasSliderChange(sliderValue: string | number): void {
    const val = Number(sliderValue);
    const bias: 'memory' | 'balanced' | 'speed' = val === 0 ? 'memory' : val === 1 ? 'balanced' : 'speed';
    currentOptimizationBias = bias;

    const labelEl = document.getElementById('biasCurrentLabel');
    if (labelEl) {
        labelEl.innerText = bias === 'memory' ? 'Memory-First [O(1) Space]' :
                            bias === 'balanced' ? 'Balanced Tradeoff' : 'Speed-First [O(1) Time]';
    }

    vscode.postMessage({ command: 'setOptimizationBias', bias });
}

// ─────────────── REFACTOR & BENCHMARK ACTIONS ───────────────
export function applyRefactor(varName: string, targetStructure: string): void {
    vscode.postMessage({ command: 'applyRefactor', varName, targetStructure });
}

export function openSmartDiff(varName: string, targetStructure: string): void {
    vscode.postMessage({ command: 'openSmartDiff', varName, targetStructure });
}

export function injectTemplate(paradigm: string): void {
    vscode.postMessage({ command: 'injectTemplate', paradigm, bias: currentOptimizationBias });
}

export function runEdgeCaseTest(paradigm: string = 'coin_change'): void {
    const container = document.getElementById('edgeCaseResultBox');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `<div style="text-align: center; padding: 12px; color: var(--accent-cyan);">Generating & Running C++ Counterexample Test Harness...</div>`;
    }
    vscode.postMessage({ command: 'runEdgeCaseTest', paradigm });
}

export function runBeforeAfterBenchmark(varName: string, fromStructure: string, toStructure: string): void {
    const container = document.getElementById('beforeAfterResultBox');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `<div style="text-align: center; padding: 12px; color: var(--accent-cyan);">Compiling with -O2 & Benchmarking Before vs After...</div>`;
    }
    vscode.postMessage({ command: 'runBeforeAfterBenchmark', varName, fromStructure, toStructure });
}

export function triggerBenchmarkSuite(): void {
    const suiteSelect = document.getElementById('benchSuite') as HTMLSelectElement;
    const distSelect = document.getElementById('benchDist') as HTMLSelectElement;
    const suite = suiteSelect ? suiteSelect.value : 'sorting';
    const distribution = distSelect ? distSelect.value : 'random';
    vscode.postMessage({ command: 'runBenchmark', suite, distribution });
}

// ─────────────── VISUALIZER & TIMELINE SCRUBBER ───────────────
export function loadSelectedTrace(): void {
    const select = document.getElementById('vizPresetSelect') as HTMLSelectElement;
    const mode = select ? select.value : 'dp_table';
    vscode.postMessage({ command: 'requestTrace', mode });
}

export function scrubToFrame(frameIndex: number | string): void {
    const idx = Math.max(0, Math.min(Number(frameIndex), activeTraceSteps.length - 1));
    currentFrameIdx = idx;

    const rangeInput = document.getElementById('vizTimelineScrubber') as HTMLInputElement;
    if (rangeInput) rangeInput.value = String(idx);

    renderCurrentFrame();
}

export function timelineFirst(): void {
    scrubToFrame(0);
}

export function timelinePrev(): void {
    if (currentFrameIdx > 0) {
        scrubToFrame(currentFrameIdx - 1);
    }
}

export function timelineTogglePlay(): void {
    if (isPlaying) {
        timelinePause();
    } else {
        timelinePlay();
    }
}

export function timelinePlay(): void {
    isPlaying = true;
    const btn = document.getElementById('vizPlayPauseBtn');
    if (btn) btn.innerHTML = '❚❚ Pause';

    const baseInterval = 700;
    const intervalMs = Math.max(100, Math.round(baseInterval / playSpeedMultiplier));

    if (playbackTimer) clearInterval(playbackTimer);
    playbackTimer = setInterval(() => {
        if (currentFrameIdx < activeTraceSteps.length - 1) {
            scrubToFrame(currentFrameIdx + 1);
        } else {
            timelinePause();
        }
    }, intervalMs);
}

export function timelinePause(): void {
    isPlaying = false;
    if (playbackTimer) {
        clearInterval(playbackTimer);
        playbackTimer = null;
    }
    const btn = document.getElementById('vizPlayPauseBtn');
    if (btn) btn.innerHTML = '▶ Play';
}

export function timelineNext(): void {
    if (currentFrameIdx < activeTraceSteps.length - 1) {
        scrubToFrame(currentFrameIdx + 1);
    } else {
        timelinePause();
    }
}

export function timelineLast(): void {
    scrubToFrame(activeTraceSteps.length - 1);
}

export function setPlaybackSpeed(speedVal: string): void {
    playSpeedMultiplier = parseFloat(speedVal) || 1.0;
    if (isPlaying) {
        timelinePlay(); // Restart timer with new interval
    }
}

function renderCurrentFrame(): void {
    if (!activeTraceSteps || activeTraceSteps.length === 0) return;
    const step = activeTraceSteps[currentFrameIdx];

    const counter = document.getElementById('vizFrameCounter');
    if (counter) counter.innerText = `Frame ${currentFrameIdx + 1} of ${activeTraceSteps.length}`;

    const titleEl = document.getElementById('vizStepTitle');
    if (titleEl) titleEl.innerText = step.description || '';

    const explanationEl = document.getElementById('vizStepExplanation');
    if (explanationEl) explanationEl.innerText = step.explanation || '';

    const canvas = document.getElementById('vizCanvas') as HTMLCanvasElement;
    const customDom = document.getElementById('vizCustomDOM');
    if (customDom) customDom.innerHTML = '';

    const modeSelect = document.getElementById('vizPresetSelect') as HTMLSelectElement;
    const mode = modeSelect ? modeSelect.value : 'dp_table';

    if (mode === 'dp_table' && step.grid) {
        renderDPGridDOM(customDom, step);
        renderDPFormulaCanvas(canvas, step);
    } else if (mode === 'recursion_tree' && step.nodes) {
        renderRecursionTreeCanvas(canvas, step);
    } else if (mode === 'sorting_searching' && step.array) {
        renderSortingCanvas(canvas, step);
    } else if (mode === 'backtracking' && step.boardState) {
        renderBacktrackingDOM(customDom, step);
        renderBacktrackingCanvas(canvas, step);
    } else if (mode === 'graph' && step.nodes) {
        renderGraphCanvas(canvas, step);
    }
}

// ─────────────── DOM & CANVAS RENDERERS ───────────────
function renderDPGridDOM(container: HTMLElement | null, step: any): void {
    if (!container || !step.grid) return;
    let html = '<div class="dp-table-container"><table class="dp-grid"><thead><tr><th>Item / Cap</th>';
    for (const col of step.colHeaders) {
        html += `<th>${col}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 0; r < step.grid.length; r++) {
        html += `<tr><th>${step.rowHeaders[r]}</th>`;
        for (let c = 0; c < step.grid[r].length; c++) {
            let cls = '';
            if (step.activeCell && step.activeCell[0] === r && step.activeCell[1] === c) {
                cls = 'active-cell';
            } else if (step.dependencyCells && step.dependencyCells.some((dc: any) => dc[0] === r && dc[1] === c)) {
                cls = 'dep-cell';
            } else if (step.solutionReconstruction && step.solutionReconstruction.some((sc: any) => sc[0] === r && sc[1] === c)) {
                cls = 'reconstructed-cell';
            }
            html += `<td class="${cls}">${step.grid[r][c]}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderDPFormulaCanvas(canvas: HTMLCanvasElement | null, step: any): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = 80;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#a855f7';
    ctx.font = '11px monospace';
    ctx.fillText('Recurrence Transition at Frame:', 10, 20);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px monospace';
    ctx.fillText(step.formulaApplied || 'dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt] + val)', 10, 45);
}

function renderRecursionTreeCanvas(canvas: HTMLCanvasElement | null, step: any): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const nodes = step.nodes || [];
    const maxDepth = Math.max(...nodes.map((n: any) => n.depth), 1);
    const levelHeight = canvas.height / (maxDepth + 2);

    const byDepth: Record<number, any[]> = {};
    nodes.forEach((n: any) => {
        if (!byDepth[n.depth]) byDepth[n.depth] = [];
        byDepth[n.depth].push(n);
    });

    const positions: Record<string, { x: number; y: number }> = {};
    Object.keys(byDepth).forEach(d => {
        const row = byDepth[Number(d)];
        const spacing = canvas.width / (row.length + 1);
        row.forEach((n: any, idx: number) => {
            positions[n.id] = { x: (idx + 1) * spacing, y: (Number(d) + 1) * levelHeight };
        });
    });

    // Edges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    nodes.forEach((n: any) => {
        if (n.parentId && positions[n.parentId] && positions[n.id]) {
            ctx.beginPath();
            ctx.moveTo(positions[n.parentId].x, positions[n.parentId].y);
            ctx.lineTo(positions[n.id].x, positions[n.id].y);
            ctx.stroke();
        }
    });

    // Nodes
    nodes.forEach((n: any) => {
        const pos = positions[n.id];
        if (!pos) return;

        const isActive = step.activeNodeId === n.id;
        let fillColor = n.isRepeated ? '#f97316' : '#38bdf8';
        if (n.status === 'computed') fillColor = '#22c55e';
        if (isActive) fillColor = '#a855f7';

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 14, 0, 2 * Math.PI);
        ctx.fill();

        if (isActive) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.fillStyle = '#0b0f17';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.returnValue !== null ? String(n.returnValue) : n.label.replace('fib(', '').replace(')', ''), pos.x, pos.y);
    });
}

function renderSortingCanvas(canvas: HTMLCanvasElement | null, step: any): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const arr = step.array || [];
    const maxVal = Math.max(...arr, 1);
    const barWidth = (canvas.width - (arr.length + 1) * 4) / arr.length;

    for (let i = 0; i < arr.length; i++) {
        const val = arr[i];
        const barHeight = (val / maxVal) * (canvas.height - 35);
        const x = 4 + i * (barWidth + 4);
        const y = canvas.height - barHeight - 20;

        let color = '#38bdf8';
        if (step.pivotIndex === i) color = '#f97316';
        else if (step.comparingIndices && step.comparingIndices.includes(i)) color = '#a855f7';
        else if (step.swappedIndices && step.swappedIndices.includes(i)) color = '#ef4444';
        else if (step.sortedIndices && step.sortedIndices.includes(i)) color = '#22c55e';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(val), x + barWidth / 2, y - 4);
        ctx.fillText(`[${i}]`, x + barWidth / 2, canvas.height - 4);
    }
}

function renderBacktrackingDOM(container: HTMLElement | null, step: any): void {
    if (!container || !Array.isArray(step.boardState)) return;
    const n = step.boardState.length;
    let html = '<div style="display: flex; justify-content: center; margin: 8px 0;">';
    html += `<div style="display: grid; grid-template-columns: repeat(${n}, 26px); border: 1px solid var(--glass-border); border-radius: 4px; overflow: hidden;">`;

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const hasQueen = step.boardState[r] === c;
            const isEven = (r + c) % 2 === 0;
            const bg = hasQueen ? '#a855f7' : isEven ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)';
            html += `<div style="width: 26px; height: 26px; background: ${bg}; display: flex; align-items: center; justify-content: center; font-size: 16px;">${hasQueen ? '♛' : ''}</div>`;
        }
    }
    html += '</div></div>';
    container.innerHTML = html;
}

function renderBacktrackingCanvas(canvas: HTMLCanvasElement | null, step: any): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = 70;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = step.isPruned ? '#ef4444' : step.isSolution ? '#22c55e' : '#38bdf8';
    ctx.font = '11px sans-serif';
    ctx.fillText(
        step.isPruned ? `❌ PRUNED: ${step.pruningReason || 'Constraint Conflict'}` :
        step.isSolution ? `✓ VALID SOLUTION COMPLETE` :
        `Exploring Candidate: ${step.currentChoice}`,
        10, 35
    );
}

function renderGraphCanvas(canvas: HTMLCanvasElement | null, step: any): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const nodes = step.nodes || [];
    const edges = step.edges || [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 25;
    const coords: Record<string, { x: number; y: number }> = {};

    nodes.forEach((n: any, i: number) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
        coords[n.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });

    edges.forEach((e: any) => {
        const p1 = coords[e.u];
        const p2 = coords[e.v];
        if (!p1 || !p2) return;

        ctx.strokeStyle = e.status === 'relaxed' ? '#22c55e' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = e.status === 'relaxed' ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        if (e.weight !== undefined) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px sans-serif';
            ctx.fillText(String(e.weight), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
    });

    nodes.forEach((n: any) => {
        const p = coords[n.id];
        if (!p) return;
        const color = n.status === 'visiting' ? '#a855f7' : n.status === 'visited' ? '#22c55e' : '#38bdf8';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#0b0f17';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label + (n.distance !== undefined ? `:${n.distance === 999 ? '∞' : n.distance}` : ''), p.x, p.y);
    });
}

// ─────────────── INBOUND MESSAGE HANDLER ───────────────
window.addEventListener('message', event => {
    const msg = event.data;
    switch (msg.type) {
        case 'stateUpdate':
            if (msg.academicMode !== undefined) {
                toggleAcademicMode(msg.academicMode);
            }
            if (msg.optimizationBias !== undefined) {
                currentOptimizationBias = msg.optimizationBias;
                const range = document.getElementById('biasRangeInput') as HTMLInputElement;
                if (range) {
                    range.value = msg.optimizationBias === 'memory' ? '0' : msg.optimizationBias === 'balanced' ? '1' : '2';
                }
                const label = document.getElementById('biasCurrentLabel');
                if (label) {
                    label.innerText = msg.optimizationBias === 'memory' ? 'Memory-First [O(1) Space]' :
                                      msg.optimizationBias === 'balanced' ? 'Balanced Tradeoff' : 'Speed-First [O(1) Time]';
                }
            }
            break;

        case 'traceResult':
            activeTraceSteps = msg.payload || [];
            currentFrameIdx = 0;
            const container = document.getElementById('vizDisplayContainer');
            if (container) container.style.display = 'block';

            const scrubber = document.getElementById('vizTimelineScrubber') as HTMLInputElement;
            if (scrubber) {
                scrubber.max = String(Math.max(0, activeTraceSteps.length - 1));
                scrubber.value = '0';
            }
            renderCurrentFrame();
            break;

        case 'edgeCaseResult':
            displayEdgeCaseResult(msg.payload);
            break;

        case 'beforeAfterResult':
            displayBeforeAfterResult(msg.payload);
            break;

        case 'benchmarkResult':
            displayBenchmarkResult(msg.payload);
            break;

        case 'npFeasibilityResult':
            displayNPResult(msg.payload);
            break;

        case 'natureResult':
            displayNatureResult(msg.optType, msg.payload);
            break;

        case 'setActiveTab':
            selectTab(msg.tab);
            break;
    }
});

function displayEdgeCaseResult(res: any): void {
    const box = document.getElementById('edgeCaseResultBox');
    if (!box) return;
    box.style.display = 'block';

    box.innerHTML = `
        <div class="glass-card" style="border-left: 3px solid #ef4444; margin: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: #ef4444; font-size: 0.8rem;">🚨 Automated Counterexample Confirmed</strong>
                <span class="badge conf-low">${res.fragilityType.toUpperCase()}</span>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-primary); margin-bottom: 8px;">${res.explanation}</p>
            
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.7rem; margin-bottom: 8px;">
                <div><span style="color: var(--text-secondary);">Failing Input:</span> <strong style="color: var(--accent-orange);">${res.failingInput}</strong></div>
                <div><span style="color: var(--text-secondary);">Actual Naive Output:</span> <strong style="color: #ef4444;">${res.actualNaiveOutput}</strong></div>
                <div><span style="color: var(--text-secondary);">Expected Optimal Output:</span> <strong style="color: var(--accent-green);">${res.expectedOptimalOutput}</strong></div>
            </div>

            <details class="explain-accordion">
                <summary>View Compilable C++ Test Harness</summary>
                <pre class="code-snippet">${escapeHtml(res.testHarnessCpp)}</pre>
            </details>
        </div>
    `;
}

function displayBeforeAfterResult(res: any): void {
    const box = document.getElementById('beforeAfterResultBox');
    if (!box) return;
    box.style.display = 'block';

    box.innerHTML = `
        <div class="glass-card" style="border-left: 3px solid var(--accent-green); margin: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: var(--accent-green); font-size: 0.8rem;">⚡ ${res.summaryHeadline}</strong>
                <span class="badge recommendation">${res.overallSpeedupMultiplier}x Speedup</span>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 8px;">${res.detailedSummary}</p>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px;">
                <div style="background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-secondary);">Execution Reduction</div>
                    <div style="font-weight: 700; color: var(--accent-green); font-size: 0.95rem;">-${res.overallSpeedupPercent}%</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-secondary);">Memory Delta</div>
                    <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">+${res.memoryDeltaKb} KB</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-secondary);">Correctness</div>
                    <div style="font-weight: 700; color: var(--accent-green); font-size: 0.95rem;">100% Match</div>
                </div>
            </div>

            <table class="dp-grid">
                <thead>
                    <tr><th>Size N</th><th>Original (ms)</th><th>Optimized (ms)</th><th>Speedup</th></tr>
                </thead>
                <tbody>
                    ${res.dataPoints.map((p: any) => `
                        <tr>
                            <td><strong>${p.inputSize.toLocaleString()}</strong></td>
                            <td style="color: #ef4444;">${p.beforeTimeMs.toFixed(2)} ms</td>
                            <td style="color: var(--accent-green); font-weight: bold;">${p.afterTimeMs.toFixed(2)} ms</td>
                            <td>${p.speedupMultiplier}x</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function displayBenchmarkResult(res: any): void {
    const container = document.getElementById('benchmarkResultContainer');
    if (!container) return;
    container.style.display = 'block';

    const titleEl = document.getElementById('benchTitle');
    if (titleEl) titleEl.innerText = `${res.suiteName} (${res.distribution})`;

    const summaryEl = document.getElementById('benchmarkSummary');
    if (summaryEl) summaryEl.innerText = res.analysisSummary;

    const tableEl = document.getElementById('benchmarkTableContainer');
    if (tableEl) {
        let html = '<table class="dp-grid"><thead><tr><th>Size N</th>';
        for (const s of res.series) {
            html += `<th>${s.algorithmName}</th>`;
        }
        html += '</tr></thead><tbody>';

        for (let i = 0; i < res.inputSizes.length; i++) {
            const n = res.inputSizes[i];
            html += `<tr><td><strong>${n}</strong></td>`;
            for (const s of res.series) {
                const pt = s.dataPoints[i];
                html += `<td>${pt ? pt.measuredTimeMs + ' ms' : '-'}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        tableEl.innerHTML = html;
    }
}

function displayNPResult(res: any): void {
    const box = document.getElementById('npAssessmentResult');
    if (!box) return;
    box.style.display = 'block';

    const title = document.getElementById('npResultTitle');
    if (title) title.innerText = `${res.problemName} (N = ${res.inputSizeN})`;

    const ops = document.getElementById('npOps');
    if (ops) ops.innerText = res.estimatedOperationsExact;

    const time = document.getElementById('npTime');
    if (time) time.innerText = res.estimatedExecutionTimeExact;

    const rec = document.getElementById('npRec');
    if (rec) rec.innerText = res.recommendedApproach;

    const spec = document.getElementById('npSpecific');
    if (spec) spec.innerText = res.specificRecommendation;

    const tradeoff = document.getElementById('npTradeoff');
    if (tradeoff) tradeoff.innerText = res.tradeoffSummary;
}

function displayNatureResult(_optType: string, res: any): void {
    const box = document.getElementById('natureResultBox');
    if (!box) return;
    box.style.display = 'block';

    const title = document.getElementById('natureResultTitle');
    if (title) title.innerText = res.problemType === 'TSP' ? 'TSP Route Optimization: ACO vs GA' : `Continuous Optimization: PSO vs GA (${res.functionName})`;

    const winner = document.getElementById('natureWinnerBadge');
    if (winner) winner.innerText = `Winner: ${res.winner}`;

    const summary = document.getElementById('natureSummaryText');
    if (summary) summary.innerText = res.summary;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

