let currentModel_i = ['teads', 'to'];
let currentModel_d = ['teads', 'to'];
const colors = [
    '#1f77b4',  // muted blue
    '#ff7f0e',  // safety orange
    '#2ca02c',  // cooked asparagus green
    '#d62728',  // brick red
    '#9467bd',  // muted purple
    '#8c564b',  // chestnut brown
    '#e377c2',  // raspberry yogurt pink
    '#7f7f7f',  // middle gray
    '#bcbd22',  // curry yellow-green
    '#17becf'   // blue-teal
];

document.addEventListener('DOMContentLoaded', () => {
    if (!window.SCARF_DATA) {
        console.error("No simulation data found.");
        return;
    }
    renderInteractionsPlot('to', 'teads');
    renderDevicesPlot('to', 'teads');
});

function renderEcoPerformanceROI(modelType) {
    const interactionsMap = window.SCARF_DATA.interactions;
    const keys = Object.keys(interactionsMap);
    const tiers = [...new Set(keys.map(k => k.split('|')[1]))];
    const interactionNames = [...new Set(keys.map(k => k.split('|')[0]))];

    const traces = [];
    const connectors = {};

    tiers.forEach((tier, index) => {
        const xLatency = [];
        const yCarbonReq = [];
        const sizes = [];
        const labels = [];

        interactionNames.forEach(name => {
            const key = `${name}|${tier}`;
            const repetitions = interactionsMap[key];

            if (repetitions && repetitions.length > 0) {
                let totalCarbon = 0;
                let totalTime = 0;
                let totalCalls = 0;

                repetitions.forEach(rep => {
                    const modelKey = modelType === 'teads' ? 'teads_sci' : 'power_model_sci';
                    totalCarbon += rep[modelKey].reduce((a, b) => a + b, 0);

                    totalTime += rep['service_time'].reduce((a, b) => a + b, 0);
                    totalCalls += rep['service_time'].length;
                });

                const avgLatency = totalTime / totalCalls;
                const avgCarbonPerReq = totalCarbon / totalCalls;
                const avgTrafficPerRep = totalCalls / repetitions.length;

                xLatency.push(avgLatency);
                yCarbonReq.push(avgCarbonPerReq);
                sizes.push(Math.cbrt(avgTrafficPerRep));
                labels.push(name);
                if (!connectors[name]) connectors[name] = { x: [], y: [] };
                connectors[name].x.push(avgLatency);
                connectors[name].y.push(avgCarbonPerReq);
            }
        });

        traces.push({
            x: xLatency,
            y: yCarbonReq,
            name: tier.toUpperCase(),
            text: labels,
            mode: 'markers',
            marker: {
                size: sizes,
                color: colors[index % colors.length],
                opacity: 0.6,
                line: { width: 1, color: 'rgb(255, 255, 255)' }
            },
            hovertemplate:
                `<b>%{text} (${tier})</b><br>` +
                `Average Response Time: %{x:.4f}<br>` +
                `Carbon/Interaction: %{y:.6f}<br>` +
                `Average Simulation Traffic: %{marker.size:.2f}<extra></extra>`
        });
    });

    Object.entries(connectors).forEach(([_, traceInfo]) => {
        traces.push({
            x: traceInfo.x,
            y: traceInfo.y,
            mode: 'lines',
            line: { color: '#000000', width: 1, dash: 'dot'},
            showlegend: false,
            hoverinfo: 'skip'
        });
    });

    const layout = {
        title: 'Interaction ROI: Latency vs. Carbon Cost',
        template: 'plotly_white',
        xaxis: {
            title: 'Average Response Time (s)',
            gridcolor: '#f3f4f6',
            ticksuffix: ' ms'
        },
        yaxis: {
            title: 'Carbon Intensity (gCO2eq / Interaction)',
            gridcolor: '#f3f4f6',
            ticksuffix: ' g'
        },
        margin: { t: 20, b: 60, l: 60, r: 20 },
        hovermode: 'closest',
        showlegend: true,
        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
        annotations: [
            {
                x: 0, y: 0, xref: 'paper', yref: 'paper',
                text: 'Lower emissions, lower res. time',
                showarrow: false, font: { color: '#059669', size: 10 },
                xanchor: 'left', yanchor: 'bottom'
            },
            {
                x: 1, y: 0, xref: 'paper', yref: 'paper',
                text: 'Lower emissions, higher res. time',
                showarrow: false, font: { color: '#ffa500', size: 10 },
                xanchor: 'right', yanchor: 'bottom'
            },
            {
                x: 0, y: 1, xref: 'paper', yref: 'paper',
                text: 'Higher emissions, lower res. time',
                showarrow: false, font: { color: '#ffa500', size: 10 },
                xanchor: 'left', yanchor: 'bottom'
            },
            {
                x: 1, y: 1, xref: 'paper', yref: 'paper',
                text: 'Higher emissions, higher res. time',
                showarrow: false, font: { color: '#9b111e', size: 10 },
                xanchor: 'right', yanchor: 'bottom'
            }
        ]
    };
    const config = { responsive: true, displayModeBar: false };

    Plotly.newPlot('plot-i-area', traces, layout, config);
}

function renderInteractionsPlot(metric, modelType) {
    if (metric === 'to') { renderEcoPerformanceROI(modelType); return; }
    const interactions = window.SCARF_DATA.interactions;
    const keys = Object.keys(interactions);
    const tiers = [...new Set(keys.map(k => k.split('|')[1]))];
    const interactionNames = [...new Set(keys.map(k => k.split('|')[0]))];
    const yValues = modelType === 'teads' ? 'teads_sci' : 'power_model_sci';

    const traces = [];

    tiers.forEach((tier, idx) => {
        const color = colors[idx % tiers.length]
        const xLabels = [];
        const yMeans = [];
        const yErrors = [];
        const callCounts = [];

        interactionNames.forEach(name => {
            const key = `${name}|${tier}`;
            const repetitions = interactions[key];

            if (repetitions && repetitions.length > 0) {
                const repTotals = repetitions.map(rep => {
                    const values = rep[yValues];
                    return values.reduce((sum, val) => sum + val, 0);
                });

                const totalCallsAcrossReps = repetitions.reduce((acc, rep) =>
                    acc + rep['service_time'].length, 0
                );
                const avgCalls = totalCallsAcrossReps / repetitions.length;

                const n = repTotals.length;
                const mean = repTotals.reduce((a, b) => a + b, 0) / n;
                const stdDev = Math.sqrt(repTotals.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n);

                xLabels.push(name);
                yMeans.push(mean);
                yErrors.push(stdDev);
                callCounts.push(avgCalls.toFixed(0));
            }
        });
        traces.push({
            x: xLabels,
            y: yMeans,
            name: tier.toUpperCase(),
            type: 'bar',
            offsetgroup: tier,
            legendgroup: tier,
            text: callCounts,
            textposition: 'outside',
            textfont: { size : 10, color: color },
            cliponaxis: false,
            marker: { opacity: 0.7 , color: color },
            error_y: {
                type: 'data',
                array: yErrors,
                visible: true,
                thickness: 1.5,
                width: 3
            }
        });
    });

    const layout = {
        template: 'plotly_white',
        barmode: 'group',
        font: { family: 'Inter, sans-serif' },
        margin: { t: 20, b: 60, l: 60, r: 20 },
        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
        xaxis: { tickfont: { size: 11, color: '#4b5563' } },
        yaxis: {
            title: ' Total Accumulated SCI (gCO2eq)',
            ticksuffix: ' g',
            gridcolor: '#f3f4f6',
            zeroline: false
        }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('plot-i-area', traces, layout, config);
}

function renderDeviceTradeoff(modelType) {
    const devices = window.SCARF_DATA.devices;
    const deviceNames = Object.keys(devices);
    const traces = [];

    const yKey = modelType === 'teads' ? 'average_teads_sci' : 'average_power_model_sci';
    const xKey = 'average_utilization';

    deviceNames.forEach((deviceName, deviceIndex) => {
        const seriesList = devices[deviceName];
        if (!seriesList || seriesList.length === 0) return;

        const hostColor = colors[colors.length - 1 - (deviceIndex % colors.length)];

        // 1. Combine all samples across all repetitions into a Map for averaging
        // Map: Utilization -> { sumCarbon: x, count: y }
        const utilizationMap = new Map();

        seriesList.forEach(rep => {
            const utils = rep[xKey];
            const scis = rep[yKey];

            utils.forEach((u, i) => {
                // Rounding utilization slightly (e.g., to 4 decimals) can help group
                // near-identical samples caused by floating point noise
                const roundedU = Math.round(u * 10000) / 10000;
                const c = scis[i];

                if (!utilizationMap.has(roundedU)) {
                    utilizationMap.set(roundedU, { sum: 0, count: 0 });
                }
                const entry = utilizationMap.get(roundedU);
                entry.sum += c;
                entry.count += 1;
            });
        });

        // 2. Extract and Sort the keys (Utilization)
        const sortedUtils = Array.from(utilizationMap.keys()).sort((a, b) => a - b);

        // 3. Create the final arrays for plotting
        const finalX = [];
        const finalY = [];

        sortedUtils.forEach(u => {
            const entry = utilizationMap.get(u);
            finalX.push(u * 100); // Scale to % for X-axis
            finalY.push(entry.sum / entry.count); // Average Carbon for this Util
        });

        traces.push({
            x: finalX,
            y: finalY,
            name: deviceName,
            mode: 'lines+markers',
            type: 'scatter',
            line: {
                color: hostColor,
                width: 2,
                shape: 'spline'
            },
            marker: { size: 4 },
            hovertemplate: `<b>${deviceName}</b><br>Util: %{x:.2f}<br>Avg SCI: %{y:.6f}/interval<extra></extra>`
        });
    });

    const layout = {
        template: 'plotly_white',
        font: { family: 'Inter, sans-serif' },
        xaxis: {
            title: 'CPU Utilization (%)',
            gridcolor: '#f3f4f6',
            zeroline: false,
            ticksuffix: '%'
        },
        yaxis: {
            title: modelType === 'teads' ? 'SCI (gCO2eq/s)' : 'SCI (PowerModel gCO2eq/s)',
            gridcolor: '#f3f4f6',
            zeroline: false,
            ticksuffix: ' g'
        },
        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
        hovermode: 'x unified',
        margin: { t: 40, b: 60, l: 80, r: 20 },
        showlegend: true
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('plot-d-area', traces, layout, config);
}

function renderDevicesPlot(metric, modelType) {
    if (metric === 'to') { renderDeviceTradeoff(modelType); return; }
    const devices = window.SCARF_DATA.devices;
    const deviceNames = Object.keys(devices);
    const traces = [];
    const yValues = modelType === 'teads' ? 'average_teads_sci' : 'average_power_model_sci';

    deviceNames.forEach((deviceName, deviceIndex) => {
        const seriesList = devices[deviceName];
        if(!seriesList || seriesList.length === 0) return;
        const hostColor = colors[colors.length - 1 - (deviceIndex % colors.length)];

        const tss = seriesList[0]['timestamps'];
        const numReps = seriesList.length;
        const avgValues = tss.map((_, timeIdx) => {
            const sum = seriesList.reduce((acc, rep) => acc + (rep[yValues][timeIdx] || 0), 0);
            return sum / numReps;
        });

        let runningTot = 0;
        const cumulativeAvgValues = avgValues.map(val => {
            runningTot += val;
            return runningTot;
        });

        traces.push({
            x: tss.map(ms => ms / 1000), // Milliseconds are converted to seconds
            y: cumulativeAvgValues,
            mode: 'lines',
            type: 'scatter',
            stackgroup: 'one',
            name: deviceName,
            line: {
                width: 2,
                color: hostColor,
                shape: 'linear'
            },
            hovertemplate: `<b>${deviceName}</b><br>Total SCI: %{y:.4f}<extra></extra>`
        });
    });

    const layout = {
        template: 'plotly_white',
        font: { family: 'Inter, sans-serif' },
        margin: { t: 20, b: 60, l: 60, r: 20 },
        hovermode: 'x unified',
        showlegend: true,
        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
        xaxis: {
            title: 'Simulation Time (s)',
            gridcolor: '#f3f4f6',
            ticksuffix: ' s'
        },
        yaxis: {
            title: modelType === 'teads' ? 'SCI (Teads gCO2eq)' : 'SCI (PowerModel gCO2eq)',
            gridcolor: '#f3f4f6',
            ticksuffix: ' g',
            zeroline: false
        }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('plot-d-area', traces, layout, config);
}

window.changeModel = function(target, graph) {
    const models = ['teads', 'power'];
    const metrics = ['to', 'impact'];
    const graphInfo = graph === 'i' ? currentModel_i : currentModel_d;
    let targetModel = '', targetMetric = '', transitionColor = '', other = '';
    if (models.includes(target)) {
        targetModel = target;
        targetMetric = graphInfo[1];
        transitionColor = 'blue';
        other = models[0] === target ? models[1] : models[0];
    } else if (metrics.includes(target)) {
        targetModel = graphInfo[0];
        targetMetric = target;
        transitionColor = 'green';
        other = metrics[0] === target ? metrics[1] : metrics[0];
    }

    const buttonToTurnOff = document.getElementById('btn-' + graph + '-' + other);
    const buttonToTurnOn = document.getElementById('btn-' + graph + '-' + target);

    buttonToTurnOn.className = "px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md bg-white text-" + transitionColor + "-600 shadow-sm";
    buttonToTurnOff.className = "px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md text-gray-500 hover:text-gray-700";

    graph === 'i' ? renderInteractionsPlot(targetMetric, targetModel) : renderDevicesPlot(targetMetric, targetModel);
    graph === 'i' ? currentModel_i = [targetModel, targetMetric] : currentModel_d = [targetModel, targetMetric];
};

window.downloadPlot = function(plotType) {
    const plotElement = document.getElementById(plotType === 'interactions' ? 'plot-i-area' : 'plot-d-area');
    const options = {
        format: 'png',
        width: 525,
        height: 350,
        scale: 4,
        filename: plotType === 'interactions' ? 'carbonPerInteraction' : 'carbonPerDevice'
    };
    Plotly.downloadImage(plotElement, options);
}