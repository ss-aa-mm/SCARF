// ─── SCARF Results Dashboard ────────────────────────────────────────────────
// Palette: one hue per tier, device colors reversed from tier palette

const TIER_COLORS  = ['#2563eb','#16a34a','#dc2626','#7c3aed','#0891b2','#d97706'];
const DEVICE_COLORS= ['#0f172a','#374151','#6b7280','#9ca3af','#cbd5e1'];
const BAND_ALPHA   = 0.15;          // opacity for Power-model uncertainty band

let showBand = false;               // uncertainty band toggle state
let currentMetric = 'to';           // 'to' | 'impact'  (interactions)
let currentDevMetric = 'to';        // 'to' | 'impact'  (devices)

// ─── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!window.SCARF_DATA) { console.error('No SCARF_DATA found.'); return; }
    renderInteractionsPlot();
    renderDevicesPlot();
    wireToggle();
});

// ─── Utility ────────────────────────────────────────────────────────────────

/** Return {mean, lo, hi, n} for an array of numbers */
function stats(arr) {
    const n = arr.length;
    if (n === 0) return { mean: 0, lo: 0, hi: 0, n: 0 };
    const mean = arr.reduce((s, v) => s + v, 0) / n;
    if (n === 1) return { mean, lo: mean, hi: mean, n };
    const sd = Math.sqrt(arr.map(v => (v - mean) ** 2).reduce((s, v) => s + v, 0) / (n - 1));
    const se = sd / Math.sqrt(n);
    const t = 2.0;          // ~95 % CI approximation
    return { mean, lo: mean - t * se, hi: mean + t * se, n };
}

/** Pool all per-execution values across replications for key in one interaction entry */
function poolValues(repList, key) {
    return repList.flatMap(rep => rep[key] ?? []);
}

/** Per-replication totals for key */
function repTotals(repList, key) {
    return repList.map(rep => (rep[key] ?? []).reduce((s, v) => s + v, 0));
}

/** Per-replication means for key */
function repMeans(repList, key) {
    return repList.map(rep => {
        const arr = rep[key] ?? [];
        return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    });
}

/** Element-wise mean across replications for a time-series key */
function timeSeriesMean(repList, key) {
    const len = repList[0][key].length;
    return Array.from({ length: len }, (_, i) =>
        repList.reduce((s, rep) => s + (rep[key][i] ?? 0), 0) / repList.length
    );
}

/** Hex color → rgba string */
function rgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Common Plotly config ────────────────────────────────────────────────────
const CFG = { responsive: true, displayModeBar: true,
    modeBarButtonsToRemove: ['select2d','lasso2d','autoScale2d'],
    toImageButtonOptions: { format: 'svg', width: 1400, height: 700, scale: 2 }
};

function baseLayout(xTitle, yTitle, extra = {}) {
    return Object.assign({
        template: 'plotly_white',
        font: { family: "'DM Mono', 'IBM Plex Mono', monospace", size: 11 },
        margin: { t: 24, b: 72, l: 72, r: 24 },
        hovermode: 'closest',
        legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center',
                  bgcolor: 'rgba(255,255,255,0.8)', bordercolor: '#e5e7eb', borderwidth: 1 },
        xaxis: { title: xTitle, gridcolor: '#f3f4f6', zeroline: false },
        yaxis: { title: yTitle, gridcolor: '#f3f4f6', zeroline: false }
    }, extra);
}

// ─── INTERACTIONS ────────────────────────────────────────────────────────────

function renderInteractionsPlot() {
    if (currentMetric === 'to') renderInteractionsTradeoff();
    else                         renderInteractionsImpact();
}

/** Bubble scatter: avg response time × avg SCI per execution, bubble = call volume */
function renderInteractionsTradeoff() {
    const imap  = window.SCARF_DATA.interactions;
    const keys  = Object.keys(imap);
    const tiers = [...new Set(keys.map(k => k.split('|')[1]))].sort();
    const names = [...new Set(keys.map(k => k.split('|')[0]))].sort();

    const traces = [];

    function filterOutliers(arr) {
        if (!arr || arr.length === 0) return [];
        if (arr.length < 3) return arr; // Not enough data to determine outliers safely

        const sorted = [...arr].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        const absoluteDeviations = sorted.map(v => Math.abs(v - median));
        const sortedDeviations = [...absoluteDeviations].sort((a, b) => a - b);
        const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

        // If data is perfectly flat, MAD is 0. Avoid stripping identical values.
        if (mad === 0) return arr;

        // 3.5 or 5 MAD is standard for stripping extreme, absurd spikes without destroying real variation
        const threshold = 5;
        return arr.filter(v => Math.abs(v - median) <= threshold * mad);
    }

    // One bubble trace per tier
    tiers.forEach((tier, ti) => {
        const color = TIER_COLORS[ti % TIER_COLORS.length];
        const MARKERS = ['circle','square','diamond','triangle-up','star',
            'cross','triangle-down','pentagon','hexagram','bowtie'];
        const xTeads=[], xPower=[], yVals=[], labels=[];
        let symbolMap = {};

        names.forEach((name, index) => {
            const reps = imap[`${name}|${tier}`];
            if (!reps?.length) return;

            symbolMap[name] = MARKERS[index % MARKERS.length];
            const sciTeads = filterOutliers(poolValues(reps, 'teads_sci'));
            const sciPower = filterOutliers(poolValues(reps, 'power_model_sci'));
            const times    = filterOutliers(poolValues(reps, 'service_time'));
            const calls    = reps.reduce((s,r) => s + (r.service_time?.length??0), 0) / reps.length;

            xTeads.push(sciTeads.reduce((s,v)=>s+v,0) / sciTeads.length);
            xPower.push(sciPower.reduce((s,v)=>s+v,0) / sciPower.length);
            yVals.push( times.reduce((s,v)=>s+v,0)    / times.length);
            labels.push(name);
        });

        // Primary Teads bubbles
        traces.push({
            x: xTeads, y: yVals, name: tier,
            text: labels, mode: 'markers',
            marker: { size: 20, color: color, opacity: 0.75,
                      symbol: labels.map(l => symbolMap[l]), line: { width: 1.5, color: '#fff' } },
            hovertemplate:
                `<b>%{text}</b> [${tier}]<br>` +
                `Avg SCI (Teads): %{x:.3e} gCO₂eq<br>` +
                `Avg Response: %{y:.3f} ms<extra></extra>`
        });

        // Power model band — render as error bars on x
        if (showBand) {
            const xErr = xTeads.map((v, i) => Math.abs(xPower[i] - v));
            traces.push({
                x: xTeads, y: yVals, name: `${tier} (±Power)`,
                text: labels, mode: 'markers',
                marker: { size: 2, color: 'transparent' },
                error_x: { type: 'data', array: xErr, visible: true,
                            color: rgba(color, 0.4), thickness: 1.5, width: 4 },
                showlegend: false, hoverinfo: 'skip'
            });
        }
    });

    // Quadrant annotations
    const quad = (x, y, text, color) =>
        ({ x, y, xref:'paper', yref:'paper', text, showarrow:false,
           font:{ color, size:9, family:"'DM Mono', monospace" },
           xanchor: x<0.5?'left':'right', yanchor: y<0.5?'bottom':'top' });

    const layout = baseLayout(
        'Avg SCI per Execution (gCO₂eq)',
        'Avg Response Time (s)',
        {
            annotations: [
                quad(0.01, 0.01, '↙ low carbon · fast',  '#16a34a'),
                quad(0.99, 0.01, '↘ low carbon · slow',  '#d97706'),
                quad(0.01, 0.99, '↖ high carbon · fast', '#d97706'),
                quad(0.99, 0.99, '↗ high carbon · slow', '#dc2626'),
            ]
        }
    );
    Plotly.newPlot('plot-i-area', traces, layout, CFG);
}

/** Grouped bar: total accumulated SCI per interaction, one bar group per tier */
function renderInteractionsImpact() {
    const imap  = window.SCARF_DATA.interactions;
    const keys  = Object.keys(imap);
    const tiers = [...new Set(keys.map(k => k.split('|')[1]))].sort();
    const names = [...new Set(keys.map(k => k.split('|')[0]))].sort();

    const traces = [];

    tiers.forEach((tier, ti) => {
        const color = TIER_COLORS[ti % TIER_COLORS.length];
        const xLabels=[], yMeans=[], yErrPos=[], yErrNeg=[], bandLo=[], bandHi=[], calls=[];

        names.forEach(name => {
            const reps = imap[`${name}|${tier}`];
            if (!reps?.length) return;

            const totTeads = repTotals(reps, 'teads_sci');
            const totPower = repTotals(reps, 'power_model_sci');
            const st       = repTotals(reps, 'service_time');
            const avgCalls = reps.reduce((s,r)=>s+(r.service_time?.length??0),0)/reps.length;

            const sT = stats(totTeads);
            const sP = stats(totPower);

            xLabels.push(name);
            yMeans.push(sT.mean);
            yErrPos.push(sT.hi - sT.mean);
            yErrNeg.push(sT.mean - sT.lo);
            bandLo.push(sP.lo);
            bandHi.push(sP.hi);
            calls.push(avgCalls.toFixed(0));
        });

        traces.push({
            x: xLabels, y: yMeans, name: tier,
            type: 'bar', offsetgroup: tier,
            marker: { color, opacity: 0.8 },
            error_y: { type:'data', arrayminus: yErrNeg, array: yErrPos,
                       visible: true, thickness:1.5, width:3, color },
            text: calls, textposition:'outside',
            textfont:{ size:9, color },
            cliponaxis: false,
            hovertemplate:
                `<b>%{x}</b> [${tier}]<br>` +
                `Total SCI (Teads): %{y:.3e} gCO₂eq<br>` +
                `Avg calls/rep: %{text}<extra></extra>`
        });

        // Power model uncertainty band — scatter traces for fill
        if (showBand) {
            traces.push({
                x: [...xLabels, ...xLabels.slice().reverse()],
                y: [...bandHi,  ...bandLo.slice().reverse()],
                fill: 'toself', fillcolor: rgba(color, BAND_ALPHA),
                line: { width: 0 }, mode: 'lines',
                showlegend: false, hoverinfo: 'skip', type: 'scatter'
            });
        }
    });

    const layout = baseLayout(
        'Interaction',
        'Total Accumulated SCI (gCO₂eq)',
        { barmode: 'group',
          yaxis: { title:'Total Accumulated SCI (gCO₂eq)', gridcolor:'#f3f4f6',
                   zeroline:false, tickformat:'.2e' } }
    );
    Plotly.newPlot('plot-i-area', traces, layout, CFG);
}

// ─── DEVICES ─────────────────────────────────────────────────────────────────

function renderDevicesPlot() {
    if (currentDevMetric === 'to') renderDeviceAllocation();
    else                            renderDeviceImpact();
}

/**
 * Primary device view: horizontal stacked bar per device.
 * Each segment = one VM (colored by mean utilization).
 * Unallocated cores shown in grey with hatch-like low opacity.
 * Companion panel: SCI ribbon over time (mean ± model band).
 */
function renderDeviceAllocation() {
    const devices = window.SCARF_DATA.devices;
    const deviceNames = Object.keys(devices);

    // ── sub-figure layout: [allocation bar | SCI over time] side by side ──
    const traces = [];
    const annotations = [];

    const utilizationColorScale = (u) => {
        // grey(0) → green(0.3) → amber(0.6) → red(1.0)
        if (u <= 0)   return '#e5e7eb';
        if (u < 0.3)  return `hsl(${140 - u/0.3*20},60%,45%)`;
        if (u < 0.6)  return `hsl(${120 - (u-0.3)/0.3*80},65%,42%)`;
        return             `hsl(${40 - (u-0.6)/0.4*40},75%,42%)`;
    };

    deviceNames.forEach((devName, di) => {
        const repList = devices[devName];
        if (!repList?.length) return;
        const rep0    = repList[0];
        const vms     = rep0.vms ?? {};
        const total   = rep0.total_cores ?? 1;
        const vmNames = Object.keys(vms);

        const allocatedCores = vmNames.reduce((s, n) => s + (vms[n].allocated_cores ?? 0), 0);
        const unallocated    = Math.max(0, total - allocatedCores);

        // ── Allocation bar (x-axis = device label, y = core count, colored by util) ──
        vmNames.forEach((vmName, vi) => {
            const vmInfo = vms[vmName];
            const cores  = vmInfo.allocated_cores ?? 0;

            // Mean utilization for this VM across all replications
            const utilSeries = repList.flatMap(rep =>
                (rep.vms?.[vmName]?.average_utilization ?? []));
            const meanUtil = utilSeries.length
                ? utilSeries.reduce((s,v)=>s+v,0) / utilSeries.length : 0;

            const color = utilizationColorScale(meanUtil);
            const pct   = (meanUtil * 100).toFixed(1);

            traces.push({
                x: [cores], y: [devName],
                name: vmName,
                type: 'bar', orientation: 'h',
                marker: { color, line:{ color:'#fff', width:1 } },
                legendgroup: vmName,
                showlegend: di === 0,
                hovertemplate:
                    `<b>${vmName}</b> on ${devName}<br>` +
                    `Allocated: ${cores} cores<br>` +
                    `Mean util: ${pct}%<extra></extra>`
            });
        });

        // Unallocated segment
        if (unallocated > 0) {
            traces.push({
                x: [unallocated], y: [devName],
                name: 'Unallocated',
                type: 'bar', orientation: 'h',
                marker: { color: rgba('#6b7280', 0.25),
                          line:{ color:'#9ca3af', width:1, dash:'dot' } },
                legendgroup: 'Unallocated',
                showlegend: di === 0,
                hovertemplate:
                    `<b>Unallocated</b> on ${devName}<br>` +
                    `${unallocated} cores idle / external<extra></extra>`
            });
        }
    });

    const layout = {
        template: 'plotly_white',
        font: { family: "'DM Mono', 'IBM Plex Mono', monospace", size: 11 },
        margin: { t: 24, b: 72, l: 110, r: 24 },
        barmode: 'stack',
        xaxis: { title: 'CPU Cores', gridcolor: '#f3f4f6', zeroline: false },
        yaxis: { title: '', automargin: true },
        legend: { orientation:'h', y:-0.22, x:0.5, xanchor:'center',
                  bgcolor:'rgba(255,255,255,0.8)', bordercolor:'#e5e7eb', borderwidth:1 },
        annotations: [
            { x:0.5, y:1.04, xref:'paper', yref:'paper',
              text:'Core allocation per device — color encodes mean CPU utilisation',
              showarrow:false, font:{ size:10, color:'#6b7280' }, xanchor:'center' }
        ]
    };

    Plotly.newPlot('plot-d-area', traces, layout, CFG);
}

/** Impact view: cumulative SCI over time, Teads as area, Power as shaded band */
function renderDeviceImpact() {
    const devices     = window.SCARF_DATA.devices;
    const deviceNames = Object.keys(devices);
    const traces      = [];

    deviceNames.forEach((devName, di) => {
        const repList = devices[devName];
        if (!repList?.length) return;

        const color   = DEVICE_COLORS[di % DEVICE_COLORS.length];
        const tss     = repList[0].timestamps.map(ms => ms / 1000);

        // Mean time-series across replications
        const meanTeads = timeSeriesMean(repList, 'average_teads_sci');
        const meanPower = timeSeriesMean(repList, 'average_power_model_sci');
        const meanEmb   = repList[0].embodied_sci_per_interval; // constant

        // Cumulative sums
        let rT=0, rP=0, rE=0;
        const cumTeads = meanTeads.map(v => (rT += v));
        const cumPower = meanPower.map(v => (rP += v));
        const cumEmb   = meanTeads.map(()  => (rE += meanEmb));

        // Operational = Teads total − embodied
        const cumOp  = cumTeads.map((v,i) => v - cumEmb[i]);

        // Embodied area (darker shade)
        traces.push({
            x: tss, y: cumEmb,
            name: `${devName} — embodied`,
            type:'scatter', mode:'lines',
            stackgroup: devName,
            fillcolor: rgba(color, 0.55),
            line:{ width:0, color },
            hovertemplate:`<b>${devName}</b> embodied<br>%{y:.4f} gCO₂eq<extra></extra>`
        });

        // Operational area (lighter shade)
        traces.push({
            x: tss, y: cumOp,
            name: `${devName} — operational`,
            type:'scatter', mode:'lines',
            stackgroup: devName,
            fillcolor: rgba(color, 0.25),
            line:{ width:1.5, color },
            hovertemplate:`<b>${devName}</b> operational<br>%{y:.4f} gCO₂eq<extra></extra>`
        });

        // Power model band
        if (showBand) {
            traces.push({
                x: [...tss, ...tss.slice().reverse()],
                y: [...cumPower, ...cumTeads.slice().reverse()],
                fill:'toself', fillcolor: rgba(color, BAND_ALPHA),
                line:{ width:0 }, mode:'lines',
                showlegend:false, hoverinfo:'skip', type:'scatter'
            });
        }
    });

    const layout = baseLayout(
        'Simulation Time (s)',
        'Cumulative SCI (gCO₂eq)',
        { hovermode:'x unified',
          yaxis:{ title:'Cumulative SCI (gCO₂eq)', gridcolor:'#f3f4f6',
                  zeroline:false, tickformat:'.3f' } }
    );
    Plotly.newPlot('plot-d-area', traces, layout, CFG);
}

// ─── Controls wiring ─────────────────────────────────────────────────────────

function wireToggle() {
    const cb = document.getElementById('band-toggle');
    if (cb) cb.addEventListener('change', e => {
        showBand = e.target.checked;
        renderInteractionsPlot();
        renderDevicesPlot();
    });
}

window.changeMetric = function(metric, graph) {
    if (graph === 'i') { currentMetric    = metric; renderInteractionsPlot(); }
    else               { currentDevMetric = metric; renderDevicesPlot();      }

    // button styling
    ['to','impact'].forEach(m => {
        const btn = document.getElementById(`btn-${graph}-${m}`);
        if (!btn) return;
        const active = m === metric;
        btn.className = active
            ? 'px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md transition-all bg-white shadow-sm '
              + (graph==='i' ? 'text-green-600' : 'text-blue-600')
            : 'px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md transition-all text-gray-500 hover:text-gray-700';
    });
};

window.downloadPlot = function(plotType) {
    const el = document.getElementById(plotType === 'interactions' ? 'plot-i-area' : 'plot-d-area');
    Plotly.downloadImage(el, {
        format: 'svg',
        width: 1400, height: 700, scale: 2,
        filename: plotType === 'interactions' ? 'scarf_interactions' : 'scarf_devices'
    });
};
