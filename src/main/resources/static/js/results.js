let currentModel_i = 'teads_sci';
let currentModel_d = 'teads_sci';

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

    const traces = tiers.map(tier => {
        const trace = {
            x: [],
            y: [],
            name: tier.toUpperCase(),
            type: 'box',
            boxpoints: 'all',
            jitter: 0.3,
            pointpos: -1.8,
            marker: { size: 3, opacity: 0.6 }
        };

        keys.forEach(key => {
            const [name, t] = key.split('|');
            if (t === tier) {
                interactions[key][modelType].forEach(val => {
                    trace.x.push(name);
                    trace.y.push(val);
                });
            }
        });
        return trace;
    });

    const layout = {
        template: 'plotly_white',
        boxmode: 'group',
        font: { family: 'Inter, sans-serif' },
        margin: { t: 20, b: 60, l: 60, r: 20 },
        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
        xaxis: { tickfont: { size: 11, color: '#4b5563' } },
        yaxis: {
            title: 'SCI (gCO2eq / instruction)',
            gridcolor: '#f3f4f6',
            zeroline: false
        }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('plot-i-area', traces, layout, config);
}

function renderDevicesPlot(modelType) {
    const devices = window.SCARF_DATA.devices;
    const traces = [];

    const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

    Object.entries(devices).forEach(([hostName, seriesList], hostIndex) => {
        const hostColor = colors[hostIndex % colors.length];
        const yValues = modelType === 'teads_sci' ? 'average_teads_sci' : 'average_power_model_sci';

        seriesList.forEach((series, repIndex) => {

            traces.push({
                x: series.timestamps,
                y: series[yValues],
                mode: 'lines',
                name: `${hostName} (Rep ${repIndex + 1})`,
                legendgroup: hostName,
                showlegend: repIndex === 0,
                line: {
                    width: 1.5,
                    color: hostColor,
                    shape: 'linear'
                },
                opacity: seriesList.length > 1 ? 0.4 : 1,
                hovertemplate: `<b>${hostName}</b><br>Time: %{x}s<br>SCI: %{y:.4f}<extra></extra>`
            });
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
            linecolor: '#e5e7eb',
            tickfont: { size: 11, color: '#4b5563' }
        },
        yaxis: {
            title: modelType === 'teads' ? 'SCI (Teads gCO2eq/s)' : 'SCI (PowerModel gCO2eq/s)',
            gridcolor: '#f3f4f6',
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