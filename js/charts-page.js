/**
 * Página de gráficos comparativos - Un gráfico a la vez
 */

// Función para formatear números con coma decimal
function formatNum(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals).replace('.', ',');
}

// Estado de la aplicación
const state = {
    data: null,
    chartType: 'accuracy-comparison',
    iterations: 'all',
    cuts: 'all'
};

// Colores para los gráficos
const chartColors = {
    TAN: { bg: 'rgba(52, 152, 219, 0.7)', border: 'rgb(52, 152, 219)', light: 'rgba(52, 152, 219, 0.2)' },
    KDB: { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgb(46, 204, 113)', light: 'rgba(46, 204, 113, 0.2)' },
    AODE: { bg: 'rgba(155, 89, 182, 0.7)', border: 'rgb(155, 89, 182)', light: 'rgba(155, 89, 182, 0.2)' },
    local: { bg: 'rgba(155, 89, 182, 0.7)', border: 'rgb(155, 89, 182)' },
    mdlp: { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgb(46, 204, 113)' },
    equal_freq: { bg: 'rgba(52, 152, 219, 0.7)', border: 'rgb(52, 152, 219)' },
    equal_width: { bg: 'rgba(231, 76, 60, 0.7)', border: 'rgb(231, 76, 60)' },
    pki: { bg: 'rgba(243, 156, 18, 0.7)', border: 'rgb(243, 156, 18)' }
};

const discTypeLabels = {
    'local': 'Local',
    'mdlp': 'MDLP',
    'equal_freq': 'Igual Freq',
    'equal_width': 'Igual Amp',
    'pki': 'PKI'
};

const chartTitles = {
    'accuracy-comparison': 'Comparación de Accuracy por Clasificador',
    'box-plot': 'Distribución de Accuracy (Box Plot)',
    'trend-cuts': 'Tendencia por Puntos de Corte',
    'top-improvements': 'Top 15 Datasets con Mayores Mejoras',
    'size-vs-improvement': 'Relación Tamaño vs Mejora',
    'heatmap': 'Heatmap de Mejoras por Dataset'
};

const chartHints = {
    'accuracy-comparison': '',
    'box-plot': 'Muestra mediana con estadísticas detalladas en tooltip',
    'trend-cuts': 'Línea sólida = Local, punteada = MDLP. Sombra = desviación típica',
    'top-improvements': 'Mejora promedio de discretización local vs mejor base',
    'size-vs-improvement': 'Relación logarítmica entre tamaño y mejora',
    'heatmap': 'Verde = mejora, Rojo = pérdida. Tamaño = magnitud del cambio'
};

// Referencia al gráfico actual
let currentChart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        await loadData();
        setupEventListeners();
        renderChart();
        hideLoading();
    } catch (error) {
        console.error('Error inicializando:', error);
        document.getElementById('loading').innerHTML = `
            <p style="color: var(--danger-color);">Error cargando datos: ${error.message}</p>
        `;
    }
}

async function loadData() {
    const response = await fetch('data/results.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    console.log(`Datos cargados: ${state.data.results.length} resultados`);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
    setTimeout(() => loading.style.display = 'none', 300);
}

function setupEventListeners() {
    document.getElementById('chart-type').addEventListener('change', (e) => {
        state.chartType = e.target.value;
        updateChartInfo();
        renderChart();
    });

    document.getElementById('filter-iterations').addEventListener('change', (e) => {
        state.iterations = e.target.value;
        renderChart();
    });

    document.getElementById('filter-cuts').addEventListener('change', (e) => {
        state.cuts = e.target.value;
        renderChart();
    });

    document.getElementById('download-png').addEventListener('click', downloadChart);
}

function updateChartInfo() {
    document.getElementById('chart-title').textContent = chartTitles[state.chartType] || '';
    document.getElementById('chart-hint').textContent = chartHints[state.chartType] || '';
}

function downloadChart() {
    const canvas = document.getElementById('main-chart');
    const link = document.createElement('a');
    link.download = `grafico-${state.chartType}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function getFilteredData() {
    let data = state.data.results;
    if (state.iterations !== 'all') {
        data = data.filter(r => r.iterations === state.iterations);
    }
    if (state.cuts !== 'all') {
        data = data.filter(r => r.cuts === state.cuts);
    }
    return data;
}

function getUniqueDatasets() {
    return [...new Set(state.data.results.map(r => r.dataset))].sort();
}

function destroyChart() {
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
}

function renderChart() {
    destroyChart();
    updateChartInfo();

    switch (state.chartType) {
        case 'accuracy-comparison':
            renderAccuracyChart();
            break;
        case 'box-plot':
            renderBoxPlotChart();
            break;
        case 'trend-cuts':
            renderTrendChart();
            break;
        case 'top-improvements':
            renderTop15Chart();
            break;
        case 'size-vs-improvement':
            renderSizeChart();
            break;
        case 'heatmap':
            renderHeatmapChart();
            break;
    }
}

/**
 * 1. Comparación de Accuracy por Clasificador
 */
function renderAccuracyChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();
    const discTypes = ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki'];
    const modelBases = ['TAN', 'KDB', 'AODE'];

    const datasets = discTypes.map(discType => {
        const accuracies = modelBases.map(modelBase => {
            const filtered = data.filter(r => r.model_base === modelBase && r.discretization_type === discType);
            if (filtered.length === 0) return null;
            return filtered.reduce((sum, r) => sum + r.accuracy, 0) / filtered.length * 100;
        });
        return {
            label: discTypeLabels[discType],
            data: accuracies,
            backgroundColor: chartColors[discType]?.bg,
            borderColor: chartColors[discType]?.border,
            borderWidth: 1
        };
    });

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: modelBases, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                tooltip: {
                    callbacks: {
                        label: (c) => `${c.dataset.label}: ${formatNum(c.raw)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 70,
                    ticks: { callback: (v) => formatNum(v) + '%' }
                }
            }
        }
    });
}

/**
 * 2. Box Plot (Distribución)
 */
function renderBoxPlotChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();
    const modelBases = ['TAN', 'KDB', 'AODE'];

    const stats = modelBases.map(modelBase => {
        const values = data.filter(r => r.model_base === modelBase).map(r => r.accuracy * 100).sort((a, b) => a - b);
        if (values.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0 };
        const percentile = (arr, p) => {
            const idx = (p / 100) * (arr.length - 1);
            const lo = Math.floor(idx), hi = Math.ceil(idx);
            return lo === hi ? arr[lo] : arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
        };
        return {
            min: values[0],
            q1: percentile(values, 25),
            median: percentile(values, 50),
            q3: percentile(values, 75),
            max: values[values.length - 1],
            mean: values.reduce((a, b) => a + b, 0) / values.length
        };
    });

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: modelBases,
            datasets: [{
                label: 'Mediana',
                data: stats.map(s => s.median),
                backgroundColor: modelBases.map(m => chartColors[m].bg),
                borderColor: modelBases.map(m => chartColors[m].border),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        afterLabel: (c) => {
                            const s = stats[c.dataIndex];
                            return [
                                `Min: ${formatNum(s.min)}%`,
                                `Q1: ${formatNum(s.q1)}%`,
                                `Mediana: ${formatNum(s.median)}%`,
                                `Q3: ${formatNum(s.q3)}%`,
                                `Max: ${formatNum(s.max)}%`,
                                `Media: ${formatNum(s.mean)}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: false, min: 60, ticks: { callback: (v) => formatNum(v) + '%' } }
            }
        }
    });
}

/**
 * 3. Tendencia por Puntos de Corte (con bandas de desviación típica)
 */
function renderTrendChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    let data = state.data.results;
    if (state.iterations !== 'all') {
        data = data.filter(r => r.iterations === state.iterations);
    }

    const cuts = ['3p', '4p', '5p', 'up'];
    const cutsLabels = ['3 puntos', '4 puntos', '5 puntos', 'Ilimitado'];

    const classifiers = [
        { name: 'TANLd', isLocal: true, base: 'TAN' },
        { name: 'KDBLd', isLocal: true, base: 'KDB' },
        { name: 'AODELd', isLocal: true, base: 'AODE' },
        { name: 'TAN-mdlp', isLocal: false, base: 'TAN' },
        { name: 'KDB-mdlp', isLocal: false, base: 'KDB' },
        { name: 'AODE-mdlp', isLocal: false, base: 'AODE' }
    ];

    const datasets = [];

    classifiers.forEach(classifier => {
        const stats = cuts.map(cut => {
            let filtered;
            if (classifier.isLocal) {
                filtered = data.filter(r => r.model === classifier.name && r.cuts === cut);
            } else {
                filtered = data.filter(r => r.model_base === classifier.base && r.discretization_type === 'mdlp' && r.cuts === cut);
            }
            if (filtered.length === 0) return { mean: null, std: 0 };
            const mean = filtered.reduce((sum, r) => sum + r.accuracy, 0) / filtered.length * 100;
            const variance = filtered.reduce((sum, r) => sum + Math.pow(r.accuracy * 100 - mean, 2), 0) / filtered.length;
            return { mean, std: Math.sqrt(variance) };
        });

        const baseColor = chartColors[classifier.base];

        // Banda de desviación típica (solo para modelos locales) - debe ir primero
        if (classifier.isLocal) {
            datasets.push({
                label: `${classifier.name} + σ`,
                data: stats.map(s => s.mean !== null ? s.mean + s.std : null),
                borderColor: 'transparent',
                backgroundColor: baseColor.light,
                borderWidth: 0,
                pointRadius: 0,
                fill: '+1',
                tension: 0.3,
                order: 2
            });
            datasets.push({
                label: `${classifier.name} - σ`,
                data: stats.map(s => s.mean !== null ? s.mean - s.std : null),
                borderColor: 'transparent',
                backgroundColor: 'transparent',
                borderWidth: 0,
                pointRadius: 0,
                fill: false,
                tension: 0.3,
                order: 2
            });
        }

        // Línea principal
        datasets.push({
            label: classifier.name,
            data: stats.map(s => s.mean),
            borderColor: baseColor.border,
            backgroundColor: 'transparent',
            borderWidth: classifier.isLocal ? 3 : 2,
            borderDash: classifier.isLocal ? [] : [5, 5],
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: false,
            order: 1
        });
    });

    currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels: cutsLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    filter: (item) => !item.dataset.label.includes('σ'),
                    callbacks: {
                        label: (c) => `${c.dataset.label}: ${formatNum(c.raw)}%`
                    }
                },
                legend: {
                    position: 'right',
                    labels: {
                        filter: (item) => !item.text.includes('σ')
                    }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Accuracy (%)' },
                    ticks: { callback: (v) => formatNum(v) + '%' }
                },
                x: {
                    title: { display: true, text: 'Puntos de Corte' }
                }
            }
        }
    });
}

/**
 * 4. Top 15 Datasets con Mejoras
 */
function renderTop15Chart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    const localResults = data.filter(r => r.discretization_type === 'local' && r.improvement_vs_base !== undefined);

    const datasetImprovements = {};
    localResults.forEach(r => {
        if (!datasetImprovements[r.dataset]) datasetImprovements[r.dataset] = [];
        datasetImprovements[r.dataset].push(r.improvement_vs_base);
    });

    const datasetAvg = Object.entries(datasetImprovements).map(([dataset, imps]) => ({
        dataset,
        avg: imps.reduce((a, b) => a + b, 0) / imps.length
    }));

    datasetAvg.sort((a, b) => b.avg - a.avg);
    const top15 = datasetAvg.slice(0, 15).reverse();

    const labels = top15.map(d => d.dataset);
    const values = top15.map(d => d.avg);

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: values.map(v => v >= 0 ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)'),
                borderColor: values.map(v => v >= 0 ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (c) => `Mejora: ${c.raw >= 0 ? '+' : ''}${formatNum(c.raw)}%`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Mejora Promedio (%)' },
                    ticks: { callback: (v) => formatNum(v) + '%' },
                    grid: { color: (c) => c.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)' }
                }
            }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((bar, i) => {
                    const val = chart.data.datasets[0].data[i];
                    ctx.save();
                    ctx.fillStyle = val >= 0 ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = val >= 0 ? 'left' : 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${val >= 0 ? '+' : ''}${formatNum(val)}%`, val >= 0 ? bar.x + 5 : bar.x - 5, bar.y);
                    ctx.restore();
                });
            }
        }]
    });
}

/**
 * 5. Relación Tamaño vs Mejora
 */
function renderSizeChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    const localResults = data.filter(r => r.discretization_type === 'local' && r.improvement_vs_base !== undefined && r.samples);

    const datasetStats = {};
    localResults.forEach(r => {
        if (!datasetStats[r.dataset]) datasetStats[r.dataset] = { samples: r.samples, imps: [] };
        datasetStats[r.dataset].imps.push(r.improvement_vs_base);
    });

    const scatterData = Object.entries(datasetStats).map(([dataset, s]) => ({
        x: s.samples,
        y: s.imps.reduce((a, b) => a + b, 0) / s.imps.length,
        dataset
    }));

    // Regresión logarítmica
    const xLog = scatterData.map(d => Math.log10(d.x));
    const y = scatterData.map(d => d.y);
    const n = xLog.length;
    const sumX = xLog.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = xLog.reduce((sum, x, i) => sum + x * y[i], 0);
    const sumX2 = xLog.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...scatterData.map(d => d.x));
    const maxX = Math.max(...scatterData.map(d => d.x));
    const trendPoints = [];
    for (let x = minX; x <= maxX; x += (maxX - minX) / 50) {
        trendPoints.push({ x, y: slope * Math.log10(x) + intercept });
    }

    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Datasets',
                    data: scatterData,
                    backgroundColor: scatterData.map(d => d.y >= 0 ? 'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
                    borderColor: scatterData.map(d => d.y >= 0 ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)'),
                    pointRadius: 10,
                    pointHoverRadius: 12
                },
                {
                    label: 'Tendencia logarítmica',
                    data: trendPoints,
                    type: 'line',
                    borderColor: 'rgba(231, 76, 60, 0.8)',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    filter: (item) => item.datasetIndex === 0,
                    callbacks: {
                        label: (c) => [
                            `Dataset: ${c.raw.dataset}`,
                            `Muestras: ${c.raw.x.toLocaleString('es-ES')}`,
                            `Mejora: ${c.raw.y >= 0 ? '+' : ''}${formatNum(c.raw.y)}%`
                        ]
                    }
                },
                legend: {
                    labels: { filter: (item) => item.text === 'Tendencia logarítmica' }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    title: { display: true, text: 'Tamaño del dataset (muestras)' },
                    ticks: { callback: (v) => v.toLocaleString('es-ES') }
                },
                y: {
                    title: { display: true, text: 'Mejora promedio (%)' },
                    ticks: { callback: (v) => formatNum(v) + '%' },
                    grid: { color: (c) => c.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)' }
                }
            }
        },
        plugins: [{
            id: 'labels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((pt, i) => {
                    const d = chart.data.datasets[0].data[i];
                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(d.dataset, pt.x + 8, pt.y - 8);
                    ctx.restore();
                });
            }
        }]
    });
}

/**
 * 6. Heatmap de Mejoras
 */
function renderHeatmapChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    const data = state.data.results.filter(r => r.discretization_type === 'local' && r.improvement_vs_base !== undefined);
    const datasetList = getUniqueDatasets();
    const classifiers = ['TANLd', 'KDBLd', 'AODELd'];

    const improvements = {};
    datasetList.forEach(dataset => {
        improvements[dataset] = {};
        classifiers.forEach(clf => {
            const filtered = data.filter(r => r.dataset === dataset && r.model === clf);
            improvements[dataset][clf] = filtered.length > 0
                ? filtered.reduce((sum, r) => sum + (r.improvement_vs_base || 0), 0) / filtered.length
                : 0;
        });
    });

    const bubbleData = datasetList.flatMap((dataset, yIdx) =>
        classifiers.map((clf, xIdx) => ({
            x: xIdx,
            y: yIdx,
            r: Math.min(Math.abs(improvements[dataset][clf]) * 6 + 4, 20),
            value: improvements[dataset][clf],
            dataset,
            classifier: clf
        }))
    );

    currentChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: bubbleData,
                backgroundColor: bubbleData.map(d => d.value > 0.1 ? 'rgba(46, 204, 113, 0.7)' : d.value < -0.1 ? 'rgba(231, 76, 60, 0.7)' : 'rgba(149, 165, 166, 0.7)'),
                borderColor: bubbleData.map(d => d.value > 0.1 ? 'rgb(39, 174, 96)' : d.value < -0.1 ? 'rgb(192, 57, 43)' : 'rgb(127, 140, 141)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (c) => [
                            `Dataset: ${c.raw.dataset}`,
                            `Clasificador: ${c.raw.classifier}`,
                            `Mejora: ${c.raw.value >= 0 ? '+' : ''}${formatNum(c.raw.value)}%`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    min: -0.5,
                    max: 2.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => classifiers[Math.round(v)] || '',
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: { display: false }
                },
                y: {
                    min: -0.5,
                    max: datasetList.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => datasetList[Math.round(v)] || '',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}
