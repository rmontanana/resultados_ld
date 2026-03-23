/**
 * Página de gráficos comparativos - Un gráfico a la vez
 */

// Función para formatear números con formato local
function formatNum(num, decimals = 2) {
    return i18n.formatLocaleNumber(num, decimals);
}

// Estado de la aplicación
const state = {
    data: null,
    chartType: 'accuracy-comparison',
    iterations: 'all',
    cuts: 'all',
    discretizers: ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki']
};

// Colores para los gráficos
const chartColors = {
    TAN: { bg: 'rgba(124, 58, 237, 0.7)', border: 'rgb(124, 58, 237)', light: 'rgba(124, 58, 237, 0.2)' },
    KDB: { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgb(46, 204, 113)', light: 'rgba(46, 204, 113, 0.2)' },
    AODE: { bg: 'rgba(167, 139, 250, 0.7)', border: 'rgb(167, 139, 250)', light: 'rgba(167, 139, 250, 0.2)' },
    local: { bg: 'rgba(124, 58, 237, 0.7)', border: 'rgb(124, 58, 237)' },
    mdlp: { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgb(46, 204, 113)' },
    equal_freq: { bg: 'rgba(99, 102, 241, 0.7)', border: 'rgb(99, 102, 241)' },
    equal_width: { bg: 'rgba(231, 76, 60, 0.7)', border: 'rgb(231, 76, 60)' },
    pki: { bg: 'rgba(243, 156, 18, 0.7)', border: 'rgb(243, 156, 18)' }
};

function getDiscTypeLabels() {
    return i18n.discTypeLabels();
}

function getChartTitles() {
    return {
        'accuracy-comparison': i18n.t('charts.type.accuracyComparison'),
        'box-plot': i18n.t('charts.type.boxPlot'),
        'trend-cuts': i18n.t('charts.type.trendCuts'),
        'top-improvements': i18n.t('charts.type.topImprovements'),
        'size-vs-improvement': i18n.t('charts.type.sizeVsImprovement'),
        'heatmap': i18n.t('charts.type.heatmap'),
        'config-heatmap': i18n.t('charts.type.configHeatmap'),
        'adversary-bars': i18n.t('charts.type.adversaryBars'),
        'classifier-radar': i18n.t('charts.type.classifierRadar')
    };
}

function getChartHints() {
    return {
        'accuracy-comparison': '',
        'box-plot': i18n.t('charts.hint.boxPlot'),
        'trend-cuts': i18n.t('charts.hint.trendCuts'),
        'top-improvements': i18n.t('charts.hint.topImprovements'),
        'size-vs-improvement': i18n.t('charts.hint.sizeVsImprovement'),
        'heatmap': i18n.t('charts.hint.heatmap'),
        'config-heatmap': i18n.t('charts.hint.configHeatmap'),
        'adversary-bars': i18n.t('charts.hint.adversaryBars'),
        'classifier-radar': i18n.t('charts.hint.classifierRadar')
    };
}

function getChartInfoDetails() {
    return {
        'accuracy-comparison': i18n.t('charts.info.accuracyComparison'),
        'box-plot': i18n.t('charts.info.boxPlot'),
        'trend-cuts': i18n.t('charts.info.trendCuts'),
        'top-improvements': i18n.t('charts.info.topImprovements'),
        'size-vs-improvement': i18n.t('charts.info.sizeVsImprovement'),
        'heatmap': i18n.t('charts.info.heatmap'),
        'config-heatmap': i18n.t('charts.info.configHeatmap'),
        'adversary-bars': i18n.t('charts.info.adversaryBars'),
        'classifier-radar': i18n.t('charts.info.classifierRadar')
    };
}
// Referencia al gráfico actual
let currentChart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        applyTheme(currentTheme);
        await loadData();
        setupEventListeners();
        renderChart();
        hideLoading();
    } catch (error) {
        console.error('Error inicializando:', error);
        document.getElementById('loading').innerHTML = `
            <p style="color: var(--danger-color);">${i18n.t('common.errorLoading')}: ${error.message}</p>
        `;
    }
}

// Gestión de tema
let currentTheme = localStorage.getItem('theme') || 'light';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('theme', theme);

    // Actualizar colores de Chart.js para el tema
    const textColor = theme === 'dark' ? '#eaeaea' : '#2c3e50';
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    // Actualizar iconos
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    if (iconSun && iconMoon) {
        iconSun.style.display = theme === 'dark' ? 'none' : 'block';
        iconMoon.style.display = theme === 'dark' ? 'block' : 'none';
    }

    // Re-renderizar el gráfico con los nuevos colores
    if (currentChart) {
        renderChart();
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
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
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    document.getElementById('chart-type').addEventListener('change', (e) => {
        state.chartType = e.target.value;
        updateChartInfo();
        updateDiscretizerFiltersVisibility();
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

    // Discretizer checkboxes
    document.querySelectorAll('input[name="discretizer"]').forEach(cb => {
        cb.addEventListener('change', () => {
            state.discretizers = getCheckedDiscretizers();
            renderChart();
        });
    });

    document.getElementById('download-png').addEventListener('click', downloadChart);

    document.addEventListener('langchange', () => {
        renderChart();
        i18n.applyTranslations();
    });
}

function getCheckedDiscretizers() {
    return Array.from(document.querySelectorAll('input[name="discretizer"]'))
        .filter(cb => !cb.disabled && cb.checked)
        .map(cb => cb.value);
}

function updateDiscretizerFiltersVisibility() {
    const filtersDiv = document.getElementById('discretizer-filters');
    // Mostrar filtros para box-plot, top-improvements, size-vs-improvement, heatmap y trend-cuts
    const showFilters = ['box-plot', 'top-improvements', 'size-vs-improvement', 'heatmap', 'trend-cuts'].includes(state.chartType);
    filtersDiv.style.display = showFilters ? 'block' : 'none';

    // Ajustar disponibilidad de discretizadores según el gráfico
    const isTrend = state.chartType === 'trend-cuts';
    const allowedForTrend = ['local', 'mdlp'];
    document.querySelectorAll('input[name="discretizer"]').forEach(cb => {
        const wrapper = cb.closest('.checkbox-label');
        if (isTrend && !allowedForTrend.includes(cb.value)) {
            cb.disabled = true;
            if (wrapper) wrapper.style.display = 'none';
        } else {
            cb.disabled = false;
            if (wrapper) wrapper.style.display = '';
        }
    });

    // Actualizar estado tras cambios de disponibilidad
    state.discretizers = getCheckedDiscretizers();

    // Habilitar/deshabilitar selectores según el gráfico
    const cutsSelect = document.getElementById('filter-cuts');
    const iterationsSelect = document.getElementById('filter-iterations');
    const isConfigHeatmap = state.chartType === 'config-heatmap';

    if (cutsSelect) {
        cutsSelect.disabled = isTrend || isConfigHeatmap;
        if (isConfigHeatmap) {
            cutsSelect.value = 'all';
            state.cuts = 'all';
        }
    }

    if (iterationsSelect) {
        iterationsSelect.disabled = isConfigHeatmap;
        if (isConfigHeatmap) {
            iterationsSelect.value = 'all';
            state.iterations = 'all';
        }
    }
}

function updateChartInfo() {
    document.getElementById('chart-title').textContent = getChartTitles()[state.chartType] || '';
    document.getElementById('chart-hint').textContent = getChartHints()[state.chartType] || '';
    const infoText = document.getElementById('chart-info-text');
    if (infoText) {
        infoText.innerHTML = getChartInfoDetails()[state.chartType] || '';
    }
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
        case 'config-heatmap':
            renderConfigHeatmapChart();
            break;
        case 'adversary-bars':
            renderAdversaryBarsChart();
            break;
        case 'classifier-radar':
            renderClassifierRadarChart();
            break;
    }
}

/**
 * 1. Comparación de Accuracy por Clasificador
 */
function renderAccuracyChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    // Mapeo de discretizadores
    const discMapping = {
        'local': 'local',
        'mdlp': 'mdlp',
        'equal_freq': 'equal_freq',
        'equal_width': 'equal_width',
        'pki': 'pki'
    };

    // Filtrar tipos de discretización según selección
    const discTypes = [...new Set(state.discretizers.map(d => discMapping[d]))].filter(Boolean);
    const modelBases = ['TAN', 'KDB', 'AODE'];

    const datasets = discTypes.map(discType => {
        const accuracies = modelBases.map(modelBase => {
            let filtered;

            // Para PKI, incluir ambas variantes si están seleccionadas
            if (discType === 'pki') {
                filtered = data.filter(r =>
                    r.model_base === modelBase &&
                    r.discretization_type === 'pki'
                );
            } else {
                filtered = data.filter(r =>
                    r.model_base === modelBase &&
                    r.discretization_type === discType
                );
            }

            if (filtered.length === 0) return null;
            return filtered.reduce((sum, r) => sum + r.accuracy, 0) / filtered.length * 100;
        });
        return {
            label: getDiscTypeLabels()[discType],
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
 * 2. Box Plot (Distribución por Discretizador)
 */
function renderBoxPlotChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    // Mapeo de nombres de discretizadores a sus variantes en los datos
    const discMapping = {
        'local': { type: 'local', label: i18n.t('common.local') },
        'mdlp': { type: 'mdlp', label: i18n.t('common.mdlp') },
        'equal_freq': { type: 'equal_freq', label: i18n.t('common.equalFreq') },
        'equal_width': { type: 'equal_width', label: i18n.t('common.equalWidth') },
        'pki': { type: 'pki', label: i18n.t('common.pki') }
    };

    // Filtrar solo los discretizadores seleccionados
    const selectedDiscs = state.discretizers
        .filter(d => discMapping[d])
        .map(d => ({ key: d, ...discMapping[d] }));

    const stats = selectedDiscs.map(disc => {
        let values;
        values = data.filter(r => r.discretization_type === disc.type)
            .map(r => r.accuracy * 100)
            .sort((a, b) => a - b);

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

    const labels = selectedDiscs.map(d => d.label);
    const colors = selectedDiscs.map(d => {
        const colorKey = d.type === 'pki' ? 'pki' : d.type;
        return chartColors[colorKey] || chartColors.local;
    });

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: i18n.t('common.median'),
                data: stats.map(s => s.median),
                backgroundColor: colors.map(c => c.bg),
                borderColor: colors.map(c => c.border),
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
                                `${i18n.t('common.min')}: ${formatNum(s.min)}%`,
                                `Q1: ${formatNum(s.q1)}%`,
                                `${i18n.t('common.median')}: ${formatNum(s.median)}%`,
                                `Q3: ${formatNum(s.q3)}%`,
                                `Max: ${formatNum(s.max)}%`,
                                `${i18n.t('common.mean')}: ${formatNum(s.mean)}%`
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

    // Usar datos filtrados solo por iteraciones; para este gráfico queremos todas las
    // combinaciones de puntos de corte para dibujar la tendencia entre 3p/4p/5p/up.
    let data = state.data.results;
    if (state.iterations !== 'all') {
        data = data.filter(r => r.iterations === state.iterations);
    }

    // Este gráfico muestra tendencias a través de diferentes puntos de corte
    // Solo tiene sentido para Local y MDLP (que tienen datos en todos los puntos de corte)
    const hasLocal = state.discretizers.includes('local');
    const hasMdlp = state.discretizers.includes('mdlp');

    if (!hasLocal && !hasMdlp) {
        // Mostrar mensaje si no hay discretizadores compatibles seleccionados
        currentChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: i18n.t('charts.selectLocalOrMdlp'),
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    const cuts = ['3p', '4p', '5p', 'up'];
    const cutsLabels = [i18n.t('common.3points'), i18n.t('common.4points'), i18n.t('common.5points'), i18n.t('common.unlimited')];

    // Construir lista de clasificadores según discretizadores seleccionados
    const classifiers = [];
    const modelBases = ['TAN', 'KDB', 'AODE'];

    if (hasLocal) {
        modelBases.forEach(base => {
            classifiers.push({ name: `${base}Ld`, isLocal: true, base });
        });
    }

    if (hasMdlp) {
        modelBases.forEach(base => {
            classifiers.push({ name: `${base}-mdlp`, isLocal: false, base });
        });
    }

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
                    title: { display: true, text: i18n.t('charts.cutPointsAxis') }
                }
            }
        }
    });
}

/**
 * 4. Top 15 Datasets con Mejoras (filtrado por discretizadores)
 */
function renderTop15Chart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    // Mapeo para identificar discretizadores
    const discMapping = {
        'local': { type: 'local' },
        'mdlp': { type: 'mdlp' },
        'equal_freq': { type: 'equal_freq' },
        'equal_width': { type: 'equal_width' },
        'pki': { type: 'pki' }
    };

    // Verificar si local está seleccionado
    const hasLocal = state.discretizers.includes('local');
    if (!hasLocal) {
        // Si no hay local seleccionado, no podemos calcular mejoras
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: i18n.t('charts.selectLocalForImp')
                    }
                }
            }
        });
        return;
    }

    // Obtener todos los datasets únicos
    const datasets = [...new Set(data.map(r => r.dataset))];

    const datasetImprovements = [];

    datasets.forEach(dataset => {
        // Obtener resultados locales para este dataset
        const localResults = data.filter(r =>
            r.dataset === dataset && r.discretization_type === 'local'
        );

        if (localResults.length === 0) return;

        // Obtener resultados de otros discretizadores seleccionados (excluyendo local)
        const baseResults = data.filter(r => {
            if (r.dataset !== dataset) return false;

            return state.discretizers
                .filter(d => d !== 'local')  // Excluir local
                .some(disc => {
                    const mapping = discMapping[disc];
                    if (!mapping) return false;
                    return r.discretization_type === mapping.type;
                });
        });

        if (baseResults.length === 0) return;

        // Calcular mejora promedio de local vs mejor base
        const improvements = [];
        localResults.forEach(localResult => {
            // Encontrar el mejor resultado base con las mismas características (iteraciones, puntos de corte, modelo base)
            const matchingBases = baseResults.filter(b =>
                b.iterations === localResult.iterations &&
                b.cuts === localResult.cuts &&
                b.model_base === localResult.model_base
            );

            if (matchingBases.length > 0) {
                const bestBase = Math.max(...matchingBases.map(b => b.accuracy));
                const improvement = (localResult.accuracy - bestBase) * 100;
                improvements.push(improvement);
            }
        });

        if (improvements.length > 0) {
            const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
            datasetImprovements.push({ dataset, avg: avgImprovement });
        }
    });

    // Ordenar y tomar top 15
    datasetImprovements.sort((a, b) => b.avg - a.avg);
    const top15 = datasetImprovements.slice(0, 15).reverse();

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
                        label: (c) => `${i18n.t('charts.improvementLabel')}: ${c.raw >= 0 ? '+' : ''}${formatNum(c.raw)}%`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: i18n.t('charts.avgImprovementAxis') },
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

    // Verificar que Local esté seleccionado
    const hasLocal = state.discretizers.includes('local');
    if (!hasLocal) {
        currentChart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: i18n.t('charts.requiresLocal'),
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    // Mapping de discretizadores
    const discMapping = {
        'local': { type: 'local', label: i18n.t('common.local') },
        'mdlp': { type: 'mdlp', label: i18n.t('common.mdlp') },
        'equal_freq': { type: 'equal_freq', label: i18n.t('common.equalFreq') },
        'equal_width': { type: 'equal_width', label: i18n.t('common.equalWidth') },
        'pki': { type: 'pki', label: i18n.t('common.pki') }
    };

    const localResults = data.filter(r => r.discretization_type === 'local' && r.samples);

    // Calcular mejoras dinámicamente
    const datasetStats = {};
    const datasets = [...new Set(localResults.map(r => r.dataset))];

    datasets.forEach(dataset => {
        const localForDataset = localResults.filter(r => r.dataset === dataset);
        if (localForDataset.length === 0) return;

        const samples = localForDataset[0].samples;

        // Obtener resultados base para comparación
        const baseResults = data.filter(r => {
            if (r.dataset !== dataset) return false;

            return state.discretizers
                .filter(d => d !== 'local')  // Excluir local
                .some(disc => {
                    const mapping = discMapping[disc];
                    if (!mapping) return false;
                    return r.discretization_type === mapping.type;
                });
        });

        if (baseResults.length === 0) return;

        // Calcular mejoras
        const improvements = [];
        localForDataset.forEach(localResult => {
            const matchingBases = baseResults.filter(b =>
                b.iterations === localResult.iterations &&
                b.cuts === localResult.cuts &&
                b.model_base === localResult.model_base
            );

            if (matchingBases.length > 0) {
                const bestBase = Math.max(...matchingBases.map(b => b.accuracy));
                const improvement = (localResult.accuracy - bestBase) * 100;
                improvements.push(improvement);
            }
        });

        if (improvements.length > 0) {
            const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
            datasetStats[dataset] = { samples, imps: [avgImprovement] };
        }
    });

    const scatterData = Object.entries(datasetStats).map(([dataset, s]) => ({
        x: s.samples,
        y: s.imps.reduce((a, b) => a + b, 0) / s.imps.length,
        dataset
    }));

    // Regresión logarítmica (ajuste sobre log10(x))
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

    // Regresión lineal simple en escala original (x sin log) para comparar
    const xs = scatterData.map(d => d.x);
    const sumXlin = xs.reduce((a, b) => a + b, 0);
    const sumYlin = sumY; // ya calculado
    const sumXYlin = xs.reduce((sum, x, i) => sum + x * y[i], 0);
    const sumX2lin = xs.reduce((sum, x) => sum + x * x, 0);
    const slopeLin = (n * sumXYlin - sumXlin * sumYlin) / (n * sumX2lin - sumXlin * sumXlin);
    const interceptLin = (sumYlin - slopeLin * sumXlin) / n;
    const trendPointsLinear = [];
    for (let x = minX; x <= maxX; x += (maxX - minX) / 50) {
        trendPointsLinear.push({ x, y: slopeLin * x + interceptLin });
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
                    label: i18n.t('charts.logTrend'),
                    data: trendPoints,
                    type: 'line',
                    borderColor: 'rgba(231, 76, 60, 0.8)',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: i18n.t('charts.linearTrend'),
                    data: trendPointsLinear,
                    type: 'line',
                    borderColor: 'rgba(52, 152, 219, 0.8)',
                    borderWidth: 2,
                    borderDash: [6, 3],
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
                            `${i18n.t('charts.tooltipDataset')}: ${c.raw.dataset}`,
                            `${i18n.t('charts.tooltipSamples')}: ${i18n.localeInt(c.raw.x)}`,
                            `${i18n.t('charts.tooltipImprovement')}: ${c.raw.y >= 0 ? '+' : ''}${formatNum(c.raw.y)}%`
                        ]
                    }
                },
                legend: {
                    labels: { filter: (item) => item.datasetIndex > 0 }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    title: { display: true, text: i18n.t('charts.datasetSizeAxis') },
                    ticks: { callback: (v) => i18n.localeInt(v) }
                },
                y: {
                    title: { display: true, text: i18n.t('charts.avgImprovementYAxis') },
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
                    // Usar el color del tema actual (Chart.defaults.color)
                    ctx.fillStyle = Chart.defaults.color;
                    ctx.font = '10px sans-serif';
                    ctx.fillText(d.dataset, pt.x + 8, pt.y - 8);
                    ctx.restore();
                });
            }
        }]
    });
}

/**
 * 6. Heatmap: Comparación de Discretizadores vs Local
 */
function renderHeatmapChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    // Verificar que Local esté seleccionado
    const hasLocal = state.discretizers.includes('local');
    if (!hasLocal) {
        currentChart = new Chart(ctx, {
            type: 'bubble',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: i18n.t('charts.requiresLocalBase'),
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    // Mapeo para identificar discretizadores
    const discMapping = {
        'mdlp': { type: 'mdlp', label: i18n.t('common.mdlp') },
        'equal_freq': { type: 'equal_freq', label: i18n.t('common.equalFreq') },
        'equal_width': { type: 'equal_width', label: i18n.t('common.equalWidth') },
        'pki': { type: 'pki', label: i18n.t('common.pki') }
    };

    // Obtener discretizadores seleccionados (excluyendo local)
    const selectedDiscs = state.discretizers
        .filter(d => d !== 'local' && discMapping[d])
        .map(d => ({ key: d, ...discMapping[d] }));

    if (selectedDiscs.length === 0) {
        currentChart = new Chart(ctx, {
            type: 'bubble',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: i18n.t('charts.selectDiscretizer'),
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    const datasetList = getUniqueDatasets();
    const discretizerLabels = selectedDiscs.map(d => d.label);

    // Calcular el MÁXIMO accuracy de Local para cada dataset
    const localBest = {};
    datasetList.forEach(dataset => {
        const localResults = data.filter(r =>
            r.dataset === dataset &&
            r.discretization_type === 'local'
        );

        if (localResults.length > 0) {
            // Encontrar el resultado con mayor accuracy
            const best = localResults.reduce((max, r) =>
                r.accuracy > max.accuracy ? r : max
            );
            localBest[dataset] = {
                accuracy: best.accuracy,
                model: best.model
            };
        } else {
            localBest[dataset] = null;
        }
    });

    // Calcular diferencias vs Local para cada combinación dataset-discretizador
    const differences = {};
    datasetList.forEach(dataset => {
        differences[dataset] = {};

        selectedDiscs.forEach(disc => {
            let results;

            // Para todos los discretizadores
            results = data.filter(r =>
                r.dataset === dataset &&
                r.discretization_type === disc.type
            );

            if (results.length > 0 && localBest[dataset] !== null) {
                // Encontrar el MÁXIMO accuracy para este discretizador
                const best = results.reduce((max, r) =>
                    r.accuracy > max.accuracy ? r : max
                );

                // Diferencia en puntos porcentuales
                const diff = (best.accuracy - localBest[dataset].accuracy) * 100;
                differences[dataset][disc.label] = {
                    diff: diff,
                    model: best.model,
                    accuracy: best.accuracy * 100,
                    localModel: localBest[dataset].model,
                    localAccuracy: localBest[dataset].accuracy * 100
                };
            } else {
                differences[dataset][disc.label] = null;
            }
        });
    });

    // Crear datos de burbujas
    const bubbleData = datasetList.flatMap((dataset, yIdx) =>
        discretizerLabels.map((discLabel, xIdx) => {
            const diffData = differences[dataset][discLabel];
            if (diffData === null) return null;

            return {
                x: xIdx,
                y: yIdx,
                r: 8,
                value: diffData.diff,
                dataset,
                discretizer: discLabel,
                model: diffData.model,
                accuracy: diffData.accuracy,
                localModel: diffData.localModel,
                localAccuracy: diffData.localAccuracy
            };
        }).filter(d => d !== null)
    );

    if (bubbleData.length === 0) {
        currentChart = new Chart(ctx, {
            type: 'bubble',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: i18n.t('charts.noDataAvailable'),
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    currentChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: bubbleData,
                backgroundColor: bubbleData.map(d => {
                    // Verde si es mejor que Local (valor positivo)
                    // Rojo si es peor que Local (valor negativo)
                    if (d.value > 0) {
                        // Verde con intensidad según la magnitud
                        const intensity = Math.min(Math.abs(d.value) / 5, 1); // Normalizar a máx 5%
                        const g = Math.round(204 * (0.5 + intensity * 0.5));
                        return `rgba(46, ${g}, 113, 0.7)`;
                    } else {
                        // Rojo con intensidad según la magnitud
                        const intensity = Math.min(Math.abs(d.value) / 5, 1); // Normalizar a máx 5%
                        const r = Math.round(231 * (0.5 + intensity * 0.5));
                        return `rgba(${r}, 76, 60, 0.7)`;
                    }
                }),
                borderColor: bubbleData.map(d => {
                    if (d.value > 0) {
                        return 'rgb(39, 174, 96)';
                    } else {
                        return 'rgb(192, 57, 43)';
                    }
                }),
                borderWidth: 2
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
                            ``,
                            `${c.raw.discretizer}: ${c.raw.model}`,
                            `Accuracy: ${formatNum(c.raw.accuracy)}%`,
                            ``,
                            `Local: ${c.raw.localModel}`,
                            `Accuracy: ${formatNum(c.raw.localAccuracy)}%`,
                            ``,
                            `${i18n.t('charts.tooltipDiff')}: ${c.raw.value >= 0 ? '+' : ''}${formatNum(c.raw.value)} pp`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: -0.5,
                    max: discretizerLabels.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value, index, ticks) {
                            const idx = Math.round(value);
                            return discretizerLabels[idx] || '';
                        },
                        font: { size: 12, weight: 'bold' },
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: false,
                        drawTicks: true,
                        tickLength: 8
                    },
                    title: {
                        display: true,
                        text: i18n.t('charts.discretizers'),
                        font: { size: 13, weight: 'bold' }
                    },
                    afterBuildTicks: function(axis) {
                        axis.ticks = [];
                        for (let i = 0; i < discretizerLabels.length; i++) {
                            axis.ticks.push({ value: i });
                        }
                    }
                },
                y: {
                    min: -0.5,
                    max: datasetList.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => datasetList[Math.round(v)] || '',
                        font: { size: 10 },
                        align: 'end'
                    },
                    title: {
                        display: true,
                        text: 'Datasets',
                        font: { size: 13, weight: 'bold' }
                    }
                }
            }
        }
    });
}

/**
 * 7. Heatmap: Configuración vs Adversario
 * Muestra el % de victorias de Local por cada combinación de configuración y adversario
 */
function renderConfigHeatmapChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = state.data.results;

    // Definir configuraciones y adversarios
    const configs = ['10it/3p', '10it/4p', '10it/5p', '10it/up', '100it/3p', '100it/4p', '100it/5p', '100it/up'];
    const adversaries = [
        { key: 'mdlp', label: i18n.t('common.mdlp') },
        { key: 'equal_freq', label: i18n.t('common.equalFreq') },
        { key: 'equal_width', label: i18n.t('common.equalWidth') },
        { key: 'pki', label: i18n.t('common.pki') }
    ];

    // Calcular victorias para cada celda
    const heatmapData = [];
    const modelBases = ['TAN', 'KDB', 'AODE'];

    configs.forEach((config, yIdx) => {
        const [iterations, cuts] = config.split('/');

        adversaries.forEach((adv, xIdx) => {
            let wins = 0;
            let total = 0;

            // Para cada dataset y modelo base
            const datasets = [...new Set(data.map(r => r.dataset))];

            datasets.forEach(dataset => {
                modelBases.forEach(modelBase => {
                    // Obtener resultado Local
                    const localResult = data.find(r =>
                        r.dataset === dataset &&
                        r.model_base === modelBase &&
                        r.discretization_type === 'local' &&
                        r.iterations === iterations &&
                        r.cuts === cuts
                    );

                    // Obtener resultado del adversario
                    const advResult = data.find(r => {
                        if (r.dataset !== dataset || r.model_base !== modelBase ||
                            r.iterations !== iterations || r.cuts !== cuts) {
                            return false;
                        }
                        return r.discretization_type === adv.key;
                    });

                    if (localResult && advResult) {
                        total++;
                        if (localResult.accuracy > advResult.accuracy) {
                            wins++;
                        }
                    }
                });
            });

            // Solo añadir si hay datos para esta combinación
            if (total > 0) {
                const winRate = (wins / total) * 100;
                heatmapData.push({
                    x: xIdx,
                    y: yIdx,
                    r: 12,
                    value: winRate,
                    wins: wins,
                    total: total,
                    config: config,
                    adversary: adv.label
                });
            }
        });
    });

    // Crear gráfico de burbujas como heatmap
    // Escala de colores suave: 0% = rojo suave, 30% = neutro, 60% = verde suave
    const minRange = 0;
    const maxRange = 60;
    const midPoint = 30;

    currentChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: heatmapData,
                backgroundColor: heatmapData.map(d => {
                    // Normalizar valor al rango 0-60
                    const clampedValue = Math.max(minRange, Math.min(maxRange, d.value));

                    if (clampedValue >= midPoint) {
                        // De neutro a verde: 30-60% -> intensidad 0-1
                        const intensity = (clampedValue - midPoint) / (maxRange - midPoint);
                        // Verde suave: de gris-verde a verde
                        const r = Math.round(120 - 70 * intensity);  // 120 -> 50
                        const g = Math.round(160 + 60 * intensity);  // 160 -> 220
                        const b = Math.round(120 - 20 * intensity);  // 120 -> 100
                        return `rgba(${r}, ${g}, ${b}, 0.85)`;
                    } else {
                        // De rojo a neutro: 0-30% -> intensidad 1-0
                        const intensity = (midPoint - clampedValue) / midPoint;
                        // Rojo suave: de gris-rojo a rojo
                        const r = Math.round(160 + 70 * intensity);  // 160 -> 230
                        const g = Math.round(130 - 50 * intensity);  // 130 -> 80
                        const b = Math.round(130 - 40 * intensity);  // 130 -> 90
                        return `rgba(${r}, ${g}, ${b}, 0.85)`;
                    }
                }),
                borderColor: heatmapData.map(d => {
                    const clampedValue = Math.max(minRange, Math.min(maxRange, d.value));
                    if (clampedValue >= midPoint) {
                        const intensity = (clampedValue - midPoint) / (maxRange - midPoint);
                        return `rgb(${Math.round(80 - 40 * intensity)}, ${Math.round(140 + 40 * intensity)}, ${Math.round(80 - 10 * intensity)})`;
                    } else {
                        const intensity = (midPoint - clampedValue) / midPoint;
                        return `rgb(${Math.round(140 + 50 * intensity)}, ${Math.round(100 - 30 * intensity)}, ${Math.round(100 - 30 * intensity)})`;
                    }
                }),
                borderWidth: 2
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
                            `${i18n.t('charts.tooltipConfig')}: ${c.raw.config}`,
                            `${i18n.t('charts.tooltipAdversary')}: ${c.raw.adversary}`,
                            `${i18n.t('charts.localWins')}: ${c.raw.wins}/${c.raw.total}`,
                            `${i18n.t('charts.ratio')}: ${formatNum(c.raw.value)}%`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    min: -0.5,
                    max: adversaries.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => adversaries[Math.round(v)]?.label || '',
                        font: { size: 12, weight: 'bold' }
                    },
                    title: { display: true, text: i18n.t('charts.adversary'), font: { weight: 'bold' } },
                    afterBuildTicks: function(axis) {
                        axis.ticks = adversaries.map((_, i) => ({ value: i }));
                    }
                },
                y: {
                    min: -0.5,
                    max: configs.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => configs[Math.round(v)] || '',
                        font: { size: 11 }
                    },
                    title: { display: true, text: i18n.t('charts.configuration'), font: { weight: 'bold' } },
                    afterBuildTicks: function(axis) {
                        axis.ticks = configs.map((_, i) => ({ value: i }));
                    }
                }
            }
        },
        plugins: [{
            id: 'heatmapLabels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((bubble, i) => {
                    const d = chart.data.datasets[0].data[i];
                    ctx.save();
                    // Texto oscuro para mejor legibilidad con colores suaves
                    ctx.fillStyle = '#333';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${formatNum(d.value, 0)}%`, bubble.x, bubble.y);
                    ctx.restore();
                });
            }
        }]
    });
}

/**
 * 8. Barras por Adversario
 * Muestra el % de victorias de TANLd, KDBLd y AODELd contra cada adversario
 */
function renderAdversaryBarsChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    const adversaries = [
        { key: 'mdlp', label: i18n.t('common.mdlp') },
        { key: 'equal_freq', label: i18n.t('common.equalFreq') },
        { key: 'equal_width', label: i18n.t('common.equalWidth') },
        { key: 'pki', label: i18n.t('common.pki') }
    ];

    const classifiers = [
        { base: 'TAN', local: 'TANLd', color: chartColors.TAN },
        { base: 'KDB', local: 'KDBLd', color: chartColors.KDB },
        { base: 'AODE', local: 'AODELd', color: chartColors.AODE }
    ];

    // Calcular victorias por clasificador y adversario
    const datasets = classifiers.map(clf => {
        const winRates = adversaries.map(adv => {
            let wins = 0;
            let total = 0;

            const uniqueDatasets = [...new Set(data.map(r => r.dataset))];
            uniqueDatasets.forEach(dataset => {
                // Obtener resultado Local
                const localResult = data.find(r =>
                    r.dataset === dataset &&
                    r.model_base === clf.base &&
                    r.discretization_type === 'local'
                );

                // Obtener resultado del adversario
                const advResult = data.find(r =>
                    r.dataset === dataset &&
                    r.model_base === clf.base &&
                    r.discretization_type === adv.key
                );

                if (localResult && advResult) {
                    total++;
                    if (localResult.accuracy > advResult.accuracy) {
                        wins++;
                    }
                }
            });

            return total > 0 ? (wins / total) * 100 : 0;
        });

        return {
            label: clf.local,
            data: winRates,
            backgroundColor: clf.color.bg,
            borderColor: clf.color.border,
            borderWidth: 2
        };
    });

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: adversaries.map(a => a.label),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (c) => `${c.dataset.label}: ${formatNum(c.raw)}% ${i18n.t('charts.victories')}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: i18n.t('charts.localWinPct') },
                    ticks: { callback: (v) => formatNum(v) + '%' }
                },
                x: {
                    title: { display: true, text: i18n.t('charts.adversary') }
                }
            }
        },
        plugins: [{
            id: 'referenceLine',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const yScale = chart.scales.y;
                const y50 = yScale.getPixelForValue(50);

                ctx.save();
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left, y50);
                ctx.lineTo(chart.chartArea.right, y50);
                ctx.stroke();
                ctx.restore();
            }
        }]
    });
}

/**
 * 9. Radar de Clasificadores
 * Muestra el perfil de cada clasificador local contra todos los adversarios
 */
function renderClassifierRadarChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    const adversaries = [
        { key: 'mdlp', label: i18n.t('common.mdlp') },
        { key: 'equal_freq', label: i18n.t('charts.equalFrequency') },
        { key: 'equal_width', label: i18n.t('charts.equalAmplitude') },
        { key: 'pki', label: i18n.t('common.pki') }
    ];

    const classifiers = [
        { base: 'TAN', local: 'TANLd', color: chartColors.TAN },
        { base: 'KDB', local: 'KDBLd', color: chartColors.KDB },
        { base: 'AODE', local: 'AODELd', color: chartColors.AODE }
    ];

    // Calcular victorias por clasificador y adversario
    const datasets = classifiers.map(clf => {
        const winRates = adversaries.map(adv => {
            let wins = 0;
            let total = 0;

            const uniqueDatasets = [...new Set(data.map(r => r.dataset))];
            uniqueDatasets.forEach(dataset => {
                const localResult = data.find(r =>
                    r.dataset === dataset &&
                    r.model_base === clf.base &&
                    r.discretization_type === 'local'
                );

                const advResult = data.find(r =>
                    r.dataset === dataset &&
                    r.model_base === clf.base &&
                    r.discretization_type === adv.key
                );

                if (localResult && advResult) {
                    total++;
                    if (localResult.accuracy > advResult.accuracy) {
                        wins++;
                    }
                }
            });

            return total > 0 ? (wins / total) * 100 : 0;
        });

        return {
            label: clf.local,
            data: winRates,
            backgroundColor: clf.color.light || clf.color.bg.replace('0.7', '0.2'),
            borderColor: clf.color.border,
            borderWidth: 3,
            pointBackgroundColor: clf.color.border,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: clf.color.border,
            pointRadius: 5,
            pointHoverRadius: 7
        };
    });

    currentChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: adversaries.map(a => a.label),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (c) => `${c.dataset.label} vs ${c.label}: ${formatNum(c.raw)}% ${i18n.t('charts.victories')}`
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    min: 0,
                    ticks: {
                        stepSize: 20,
                        callback: (v) => v + '%',
                        backdropColor: 'transparent'
                    },
                    pointLabels: {
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}
