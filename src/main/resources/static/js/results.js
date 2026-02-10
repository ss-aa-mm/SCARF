let currentModel_i = 'teads_sci';
let currentModel_d = 'teads_sci';
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
    renderInteractionsPlot('teads_sci');
    renderDevicesPlot('teads_sci');
});

function renderInteractionsPlot(modelType) {
    const interactions = window.SCARF_DATA.interactions;
    const keys = Object.keys(interactions);
    const tiers = [...new Set(keys.map(k => k.split('|')[1]))];
    const interactionNames = [...new Set(keys.map(k => k.split('|')[0]))];

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
                    const values = rep[modelType];
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

function renderDevicesPlot(modelType) {
    const devices = window.SCARF_DATA.devices;
    const deviceNames = Object.keys(devices);
    const traces = [];
    const yValues = modelType === 'teads_sci' ? 'average_teads_sci' : 'average_power_model_sci';

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
            x: tss,
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
            hovertemplate: `<b>${deviceName}</b><br>Time: %{x}s<br>Total SCI: %{y:.4f}<extra></extra>`
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

window.changeModel = function(type, graph) {
    graph === 'i' ? currentModel_i = type : currentModel_d = type;
    const isTeads = type === 'teads_sci';

    const tBtn = document.getElementById(graph === 'i' ? 'btn-i-teads' : 'btn-d-teads');
    const pBtn = document.getElementById(graph === 'i' ? 'btn-i-power' : 'btn-d-power');

    if (isTeads) {
        tBtn.className = "px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md bg-white text-blue-600 shadow-sm";
        pBtn.className = "px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md text-gray-500 hover:text-gray-700";
    } else {
        pBtn.className = "px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md bg-white text-blue-600 shadow-sm";
        tBtn.className = "px-5 py-2 text-xs font-bold uppercase tracking-tight rounded-md text-gray-500 hover:text-gray-700";
    }

    graph === 'i' ? renderInteractionsPlot(type) : renderDevicesPlot(type);
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