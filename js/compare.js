/**
 * Vista de comparación por dataset
 */

// Función para formatear números con coma decimal
function formatNum(num, decimals = 2) {
    return i18n.formatLocaleNumber(num, decimals);
}

// Gestión de tema
let currentTheme = localStorage.getItem('theme') || 'light';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('theme', theme);

    // Actualizar iconos
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    if (iconSun && iconMoon) {
        iconSun.style.display = theme === 'dark' ? 'none' : 'block';
        iconMoon.style.display = theme === 'dark' ? 'block' : 'none';
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    // Redibujar gráfico para actualizar colores según tema
    if (chartState.instance) {
        renderCompareChart();
    }
}

// Estado de la aplicación
const compareState = {
    data: null,
    iterations: '10it',
    discretizer: 'mdlp',
    cuts: '3p'
};

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        applyTheme(currentTheme);
        await loadData();
        setupEventListeners();
        renderTable();
        initCharts();  // Inicializar gráficos
        hideLoading();
    } catch (error) {
        console.error('Error inicializando:', error);
        document.getElementById('loading').innerHTML = `
            <p style="color: var(--danger-color);">${i18n.t('common.errorLoading')} ${error.message}</p>
        `;
    }
}

async function loadData() {
    const response = await fetch('data/results.json');
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    compareState.data = await response.json();
    console.log(`Datos cargados: ${compareState.data.results.length} resultados`);
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

    document.getElementById('filter-iterations').addEventListener('change', (e) => {
        compareState.iterations = e.target.value;
        renderTable();
    });

    document.getElementById('filter-discretizer').addEventListener('change', (e) => {
        compareState.discretizer = e.target.value;
        updateCutsOptions();
        renderTable();
    });

    document.getElementById('filter-cuts').addEventListener('change', (e) => {
        compareState.cuts = e.target.value;
        renderTable();
    });

    document.addEventListener('langchange', () => {
        renderTable();
        i18n.applyTranslations();
    });
}

/**
 * Actualiza las opciones de puntos de corte según el discretizador
 */
function updateCutsOptions() {
    const cutsSelect = document.getElementById('filter-cuts');
    const discretizer = compareState.discretizer;

    if (discretizer === 'pki') {
        // PKI solo tiene opción ilimitada
        cutsSelect.innerHTML = `
            <option value="up">${i18n.t('common.unlimited')}</option>
        `;
        compareState.cuts = 'up';
    } else if (discretizer === 'mdlp') {
        // MDLP tiene 3, 4, 5 e ilimitado
        cutsSelect.innerHTML = `
            <option value="3p">${i18n.t('common.3points')}</option>
            <option value="4p">${i18n.t('common.4points')}</option>
            <option value="5p">${i18n.t('common.5points')}</option>
            <option value="up">${i18n.t('common.unlimited')}</option>
        `;
        compareState.cuts = '3p';
    } else {
        // equal_freq y equal_width solo tienen 3, 4, 5 (no ilimitado)
        cutsSelect.innerHTML = `
            <option value="3p">${i18n.t('common.3points')}</option>
            <option value="4p">${i18n.t('common.4points')}</option>
            <option value="5p">${i18n.t('common.5points')}</option>
        `;
        compareState.cuts = '3p';
    }
}

/**
 * Obtiene el nombre del modelo base según la configuración
 * Ejemplos de nombres reales:
 * - MDLP: TAN-mdlp3, TAN-mdlp4, TAN-mdlp5, TAN-mdlp (ilimitado)
 * - Equal freq: TAN-bin3q, TAN-bin4q, TAN-bin5q
 * - Equal width: TAN-bin3u, TAN-bin4u, TAN-bin5u
 * - PKI: TAN-pki
 */
function getBaseModelName(classifier) {
    const discretizer = compareState.discretizer;
    const cuts = compareState.cuts;

    if (discretizer === 'pki') {
        // PKI: TAN-pki
        return `${classifier}-pki`;
    } else if (discretizer === 'mdlp') {
        // MDLP: TAN-mdlp3, TAN-mdlp4, TAN-mdlp5, TAN-mdlp (ilimitado)
        if (cuts === 'up') {
            return `${classifier}-mdlp`;  // Sin número para ilimitado
        }
        const cutNum = cuts.replace('p', '');
        return `${classifier}-mdlp${cutNum}`;
    } else if (discretizer === 'equal_freq') {
        // Equal frequency: TAN-bin3q, TAN-bin4q, TAN-bin5q
        const cutNum = cuts.replace('p', '');
        return `${classifier}-bin${cutNum}q`;
    } else if (discretizer === 'equal_width') {
        // Equal width: TAN-bin3u, TAN-bin4u, TAN-bin5u
        const cutNum = cuts.replace('p', '');
        return `${classifier}-bin${cutNum}u`;
    }

    return classifier;
}

/**
 * Obtiene el nombre del modelo local
 */
function getLocalModelName(classifier) {
    return `${classifier}Ld`;
}

/**
 * Busca el resultado para un modelo y dataset específico
 */
function findResult(modelName, dataset) {
    const results = compareState.data.results.filter(r =>
        r.model === modelName &&
        r.dataset === dataset &&
        r.iterations === compareState.iterations &&
        r.cuts === compareState.cuts
    );

    if (results.length > 0) {
        return results[0];
    }
    return null;
}

/**
 * Renderiza la tabla de comparación
 */
function renderTable() {
    if (!compareState.data) return;

    const tbody = document.getElementById('compare-body');

    // También actualizar gráficos cuando cambian los filtros
    if (chartState.instance) {
        renderCompareChart();
    }
    const datasets = [...new Set(compareState.data.results.map(r => r.dataset))].sort();

    const classifiers = ['TAN', 'KDB', 'AODE'];
    const stats = {
        TAN: { localWins: 0, baseWins: 0, ties: 0, diffs: [] },
        KDB: { localWins: 0, baseWins: 0, ties: 0, diffs: [] },
        AODE: { localWins: 0, baseWins: 0, ties: 0, diffs: [] }
    };

    let rows = '';

    datasets.forEach(dataset => {
        let rowHtml = `<tr><td>${dataset}</td>`;
        let rowBest = { value: 0, cells: [] };

        classifiers.forEach((classifier, idx) => {
            const baseModelName = getBaseModelName(classifier);
            const localModelName = getLocalModelName(classifier);

            const baseResult = findResult(baseModelName, dataset);
            const localResult = findResult(localModelName, dataset);

            const baseAcc = baseResult ? baseResult.accuracy * 100 : null;
            const localAcc = localResult ? localResult.accuracy * 100 : null;

            // Actualizar mejor de la fila
            if (baseAcc !== null && baseAcc > rowBest.value) {
                rowBest.value = baseAcc;
                rowBest.cells = [`base-${idx}`];
            } else if (baseAcc !== null && baseAcc === rowBest.value) {
                rowBest.cells.push(`base-${idx}`);
            }

            if (localAcc !== null && localAcc > rowBest.value) {
                rowBest.value = localAcc;
                rowBest.cells = [`local-${idx}`];
            } else if (localAcc !== null && localAcc === rowBest.value) {
                rowBest.cells.push(`local-${idx}`);
            }

            // Calcular diferencia y estadísticas
            let baseCellClass = '';
            let localCellClass = '';
            let diffIndicator = '';

            if (baseAcc !== null && localAcc !== null) {
                const diff = localAcc - baseAcc;
                stats[classifier].diffs.push(diff);

                if (diff > 0.01) {
                    stats[classifier].localWins++;
                    localCellClass = 'local-wins';
                    diffIndicator = `<span class="diff-indicator positive">+${formatNum(diff)}%</span>`;
                } else if (diff < -0.01) {
                    stats[classifier].baseWins++;
                    baseCellClass = 'base-wins';
                    diffIndicator = `<span class="diff-indicator negative">${formatNum(diff)}%</span>`;
                } else {
                    stats[classifier].ties++;
                }
            }

            // Generar celdas
            rowHtml += `<td class="${baseCellClass}" data-cell="base-${idx}">${baseAcc !== null ? formatNum(baseAcc) + '%' : '-'}</td>`;
            rowHtml += `<td class="${localCellClass}" data-cell="local-${idx}">${localAcc !== null ? formatNum(localAcc) + '%' : '-'}${diffIndicator}</td>`;
        });

        rowHtml += '</tr>';

        // Marcar mejor de la fila
        if (rowBest.cells.length > 0) {
            rowBest.cells.forEach(cellId => {
                rowHtml = rowHtml.replace(
                    `data-cell="${cellId}"`,
                    `data-cell="${cellId}" class="best"`
                );
                // Si ya tiene una clase, añadir best
                rowHtml = rowHtml.replace(
                    new RegExp(`class="(local-wins|base-wins)" data-cell="${cellId}"`),
                    `class="$1 best" data-cell="${cellId}"`
                );
            });
        }

        rows += rowHtml;
    });

    tbody.innerHTML = rows;

    // Actualizar estadísticas
    updateStats(stats, datasets.length);
}

/**
 * Actualiza las estadísticas de la página
 */
function updateStats(stats, totalDatasets) {
    // Mini stats en header
    document.getElementById('stat-tan-wins').textContent = stats.TAN.localWins;
    document.getElementById('stat-kdb-wins').textContent = stats.KDB.localWins;
    document.getElementById('stat-aode-wins').textContent = stats.AODE.localWins;

    // Summary cards
    ['TAN', 'KDB', 'AODE'].forEach(classifier => {
        const prefix = classifier.toLowerCase();
        const s = stats[classifier];

        document.getElementById(`${prefix}-local-wins`).textContent = s.localWins;
        document.getElementById(`${prefix}-base-wins`).textContent = s.baseWins;
        document.getElementById(`${prefix}-ties`).textContent = s.ties;

        if (s.diffs.length > 0) {
            const avgDiff = s.diffs.reduce((a, b) => a + b, 0) / s.diffs.length;
            const avgDiffEl = document.getElementById(`${prefix}-avg-diff`);
            avgDiffEl.textContent = (avgDiff > 0 ? '+' : '') + formatNum(avgDiff, 3) + '%';
            avgDiffEl.className = avgDiff > 0 ? 'positive' : avgDiff < 0 ? 'negative' : '';
        }
    });

    // Dataset count
    document.getElementById('dataset-count').textContent = `(${totalDatasets} datasets)`;
}

// ============================================
// SECCIÓN DE GRÁFICOS
// ============================================

// Colores para los gráficos
const chartColors = {
    TAN: { bg: 'rgba(124, 58, 237, 0.7)', border: 'rgb(124, 58, 237)', light: 'rgba(124, 58, 237, 0.3)' },
    KDB: { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgb(46, 204, 113)', light: 'rgba(46, 204, 113, 0.3)' },
    AODE: { bg: 'rgba(167, 139, 250, 0.7)', border: 'rgb(167, 139, 250)', light: 'rgba(167, 139, 250, 0.3)' },
    positive: { bg: 'rgba(46, 204, 113, 0.8)', border: 'rgb(39, 174, 96)' },
    negative: { bg: 'rgba(231, 76, 60, 0.8)', border: 'rgb(192, 57, 43)' },
    neutral: { bg: 'rgba(149, 165, 166, 0.7)', border: 'rgb(127, 140, 141)' }
};

// Estado del gráfico
const chartState = {
    instance: null,
    type: 'differences'
};

/**
 * Inicializa la sección de gráficos
 */
function initCharts() {
    const chartTypeSelect = document.getElementById('chart-type-compare');
    const downloadBtn = document.getElementById('download-chart-png');

    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', (e) => {
            chartState.type = e.target.value;
            renderCompareChart();
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadCompareChartPNG);
    }

    renderCompareChart();
}

/**
 * Renderiza el gráfico según el tipo seleccionado
 */
function renderCompareChart() {
    if (!compareState.data) return;

    // Destruir gráfico anterior
    if (chartState.instance) {
        chartState.instance.destroy();
        chartState.instance = null;
    }

    const canvas = document.getElementById('compare-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Obtener datos para el gráfico
    const chartData = getChartComparisonData();

    switch (chartState.type) {
        case 'differences':
            renderDifferencesChart(ctx, chartData);
            break;
        case 'scatter':
            renderScatterChart(ctx, chartData);
            break;
        case 'grouped-bars':
            renderGroupedBarsChart(ctx, chartData);
            break;
        case 'victories-donut':
            renderVictoriesDonutChart(ctx, chartData);
            break;
    }

    updateChartLegend();
}

/**
 * Obtiene los datos de comparación para los gráficos
 */
function getChartComparisonData() {
    const datasets = [...new Set(compareState.data.results.map(r => r.dataset))].sort();
    const classifiers = ['TAN', 'KDB', 'AODE'];
    const result = {
        datasets: [],
        comparisons: []
    };

    datasets.forEach(dataset => {
        const datasetComparisons = [];

        classifiers.forEach(classifier => {
            const baseModelName = getBaseModelName(classifier);
            const localModelName = getLocalModelName(classifier);

            const baseResult = findResult(baseModelName, dataset);
            const localResult = findResult(localModelName, dataset);

            const baseAcc = baseResult ? baseResult.accuracy * 100 : null;
            const localAcc = localResult ? localResult.accuracy * 100 : null;

            if (baseAcc !== null && localAcc !== null) {
                datasetComparisons.push({
                    classifier,
                    dataset,
                    base: baseAcc,
                    local: localAcc,
                    diff: localAcc - baseAcc
                });
            }
        });

        if (datasetComparisons.length > 0) {
            result.datasets.push(dataset);
            result.comparisons.push(...datasetComparisons);
        }
    });

    return result;
}

/**
 * 1. Gráfico de diferencias (barras horizontales divergentes)
 */
function renderDifferencesChart(ctx, data) {
    // Calcular diferencia promedio por dataset
    const datasetDiffs = {};
    data.comparisons.forEach(c => {
        if (!datasetDiffs[c.dataset]) {
            datasetDiffs[c.dataset] = [];
        }
        datasetDiffs[c.dataset].push(c.diff);
    });

    const avgDiffs = Object.entries(datasetDiffs).map(([dataset, diffs]) => ({
        dataset,
        avgDiff: diffs.reduce((a, b) => a + b, 0) / diffs.length
    }));

    // Ordenar por diferencia
    avgDiffs.sort((a, b) => b.avgDiff - a.avgDiff);

    const labels = avgDiffs.map(d => d.dataset);
    const values = avgDiffs.map(d => d.avgDiff);
    const colors = values.map(v => v >= 0 ? chartColors.positive.bg : chartColors.negative.bg);
    const borderColors = values.map(v => v >= 0 ? chartColors.positive.border : chartColors.negative.border);

    chartState.instance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: i18n.t('compare.chart.diffLabel'),
                data: values,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: i18n.t('compare.chart.diffTitle'),
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const val = context.raw;
                            const sign = val >= 0 ? '+' : '';
                            return `${sign}${formatNum(val, 2)}% ${val >= 0 ? i18n.t('compare.chart.localWins') : i18n.t('compare.chart.baseWins')}`;
                        }
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: {
                    title: { display: true, text: i18n.t('compare.chart.diffAxis') },
                    ticks: {
                        callback: (value) => (value >= 0 ? '+' : '') + formatNum(value) + '%'
                    },
                    grid: {
                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'
                    }
                },
                y: {
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * 2. Gráfico scatter: Base vs Local
 */
function renderScatterChart(ctx, data) {
    const classifiers = ['TAN', 'KDB', 'AODE'];

    const datasets = classifiers.map(classifier => {
        const points = data.comparisons
            .filter(c => c.classifier === classifier)
            .map(c => ({
                x: c.base,
                y: c.local,
                dataset: c.dataset,
                diff: c.diff
            }));

        return {
            label: classifier,
            data: points,
            backgroundColor: chartColors[classifier].bg,
            borderColor: chartColors[classifier].border,
            pointRadius: 6,
            pointHoverRadius: 8
        };
    });

    // Calcular límites para la línea diagonal
    const allValues = data.comparisons.flatMap(c => [c.base, c.local]);
    const minVal = Math.min(...allValues) - 2;
    const maxVal = Math.max(...allValues) + 2;

    // Añadir línea diagonal (y = x) - color según tema
    const diagonalColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
    datasets.push({
        label: i18n.t('compare.chart.equalityLine'),
        data: [{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }],
        type: 'line',
        borderColor: diagonalColor,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
    });

    chartState.instance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: i18n.t('compare.chart.scatterTitle'),
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.dataset.label === i18n.t('compare.chart.equalityLine')) return null;
                            const d = context.raw;
                            const sign = d.diff >= 0 ? '+' : '';
                            return `${d.dataset}: Base=${formatNum(d.x)}%, Local=${formatNum(d.y)}% (${sign}${formatNum(d.diff)}%)`;
                        }
                    },
                    filter: (item) => item.dataset.label !== i18n.t('compare.chart.equalityLine')
                },
                legend: {
                    position: 'top',
                    labels: {
                        filter: (item) => item.text !== i18n.t('compare.chart.equalityLine')
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: i18n.t('compare.chart.baseAxis') },
                    min: minVal,
                    max: maxVal,
                    ticks: { callback: (v) => formatNum(v) + '%' }
                },
                y: {
                    title: { display: true, text: i18n.t('compare.chart.localAxis') },
                    min: minVal,
                    max: maxVal,
                    ticks: { callback: (v) => formatNum(v) + '%' }
                }
            }
        }
    });
}

/**
 * 3. Gráfico de barras agrupadas por clasificador
 */
function renderGroupedBarsChart(ctx, data) {
    const classifiers = ['TAN', 'KDB', 'AODE'];

    // Calcular promedios por clasificador
    const avgByClassifier = classifiers.map(classifier => {
        const classifierData = data.comparisons.filter(c => c.classifier === classifier);
        const avgBase = classifierData.reduce((sum, c) => sum + c.base, 0) / classifierData.length;
        const avgLocal = classifierData.reduce((sum, c) => sum + c.local, 0) / classifierData.length;
        return { classifier, avgBase, avgLocal, diff: avgLocal - avgBase };
    });

    chartState.instance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: classifiers,
            datasets: [
                {
                    label: 'Base',
                    data: avgByClassifier.map(d => d.avgBase),
                    backgroundColor: classifiers.map(c => chartColors[c].light),
                    borderColor: classifiers.map(c => chartColors[c].border),
                    borderWidth: 2
                },
                {
                    label: 'Local',
                    data: avgByClassifier.map(d => d.avgLocal),
                    backgroundColor: classifiers.map(c => chartColors[c].bg),
                    borderColor: classifiers.map(c => chartColors[c].border),
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: i18n.t('compare.chart.groupedTitle'),
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: (context) => {
                            const idx = context.dataIndex;
                            const diff = avgByClassifier[idx].diff;
                            const sign = diff >= 0 ? '+' : '';
                            return `${i18n.t('compare.chart.difference')} ${sign}${formatNum(diff, 2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 70,
                    title: { display: true, text: i18n.t('compare.chart.accuracyAxis') },
                    ticks: { callback: (v) => formatNum(v) + '%' }
                }
            }
        }
    });
}

/**
 * 4. Gráfico donut de victorias
 */
function renderVictoriesDonutChart(ctx, data) {
    const classifiers = ['TAN', 'KDB', 'AODE'];

    // Contar victorias por clasificador
    const stats = classifiers.map(classifier => {
        const classifierData = data.comparisons.filter(c => c.classifier === classifier);
        let localWins = 0, baseWins = 0, ties = 0;

        classifierData.forEach(c => {
            if (c.diff > 0.01) localWins++;
            else if (c.diff < -0.01) baseWins++;
            else ties++;
        });

        return { classifier, localWins, baseWins, ties, total: classifierData.length };
    });

    // Total general
    const totalLocalWins = stats.reduce((sum, s) => sum + s.localWins, 0);
    const totalBaseWins = stats.reduce((sum, s) => sum + s.baseWins, 0);
    const totalTies = stats.reduce((sum, s) => sum + s.ties, 0);

    chartState.instance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [i18n.t('compare.chart.localWinsDonut'), i18n.t('compare.chart.baseWinsDonut'), i18n.t('compare.chart.tieDonut')],
            datasets: [{
                data: [totalLocalWins, totalBaseWins, totalTies],
                backgroundColor: [
                    chartColors.positive.bg,
                    chartColors.negative.bg,
                    chartColors.neutral.bg
                ],
                borderColor: [
                    chartColors.positive.border,
                    chartColors.negative.border,
                    chartColors.neutral.border
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: i18n.t('compare.chart.victoriesTitle'),
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const total = totalLocalWins + totalBaseWins + totalTies;
                            const pct = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${pct}%)`;
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            }
        },
        plugins: [
            {
                id: 'centerText',
                afterDraw: (chart) => {
                    const { ctx, width, height } = chart;
                    ctx.save();

                    const total = totalLocalWins + totalBaseWins + totalTies;
                    const pctLocalWins = ((totalLocalWins / total) * 100).toFixed(0);

                    ctx.font = 'bold 24px sans-serif';
                    ctx.fillStyle = chartColors.positive.border;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${pctLocalWins}%`, width / 2, height / 2 - 10);

                    ctx.font = '12px sans-serif';
                    ctx.fillStyle = '#666';
                    ctx.fillText(i18n.t('compare.chart.localWinsCenter'), width / 2, height / 2 + 15);

                    ctx.restore();
                }
            },
            {
                id: 'segmentLabels',
                afterDatasetsDraw: (chart) => {
                    const { ctx } = chart;
                    const meta = chart.getDatasetMeta(0);
                    const dataset = chart.data.datasets[0];

                    meta.data.forEach((arc, index) => {
                        const value = dataset.data[index];
                        if (value === 0) return; // No dibujar si no hay datos

                        // Calcular posición en el centro del arco
                        const centerAngle = (arc.startAngle + arc.endAngle) / 2;
                        const radius = (arc.innerRadius + arc.outerRadius) / 2;
                        const x = arc.x + Math.cos(centerAngle) * radius;
                        const y = arc.y + Math.sin(centerAngle) * radius;

                        ctx.save();
                        ctx.font = 'bold 14px sans-serif';
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        // Sombra para mejor legibilidad
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = 3;
                        ctx.shadowOffsetX = 1;
                        ctx.shadowOffsetY = 1;

                        ctx.fillText(value.toString(), x, y);
                        ctx.restore();
                    });
                }
            }
        ]
    });
}

/**
 * Actualiza la leyenda personalizada del gráfico
 */
function updateChartLegend() {
    const container = document.getElementById('chart-legend-container');
    if (!container) return;

    let legendHTML = '';

    if (chartState.type === 'differences') {
        legendHTML = `
            <div class="chart-legend-item">
                <div class="chart-legend-color" style="background: ${chartColors.positive.bg}"></div>
                <span>${i18n.t('compare.chart.legendLocalImproves')}</span>
            </div>
            <div class="chart-legend-item">
                <div class="chart-legend-color" style="background: ${chartColors.negative.bg}"></div>
                <span>${i18n.t('compare.chart.legendBaseBetter')}</span>
            </div>
        `;
    } else if (chartState.type === 'scatter') {
        legendHTML = `
            <div class="chart-legend-item">
                <span style="color: #666; font-style: italic;">${i18n.t('compare.chart.legendScatterHint')}</span>
            </div>
        `;
    } else if (chartState.type === 'grouped-bars') {
        legendHTML = `
            <div class="chart-legend-item">
                <span style="color: #666; font-style: italic;">${i18n.t('compare.chart.legendBarsHint')}</span>
            </div>
        `;
    }

    container.innerHTML = legendHTML;
}

/**
 * Descarga el gráfico como PNG
 */
function downloadCompareChartPNG() {
    if (!chartState.instance) {
        alert(i18n.t('compare.chart.noChartDownload'));
        return;
    }

    const link = document.createElement('a');
    const chartNames = {
        'differences': 'diferencias',
        'scatter': 'scatter_base_vs_local',
        'grouped-bars': 'barras_por_clasificador',
        'victories-donut': 'victorias'
    };
    link.download = `comparativa_${chartNames[chartState.type]}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = chartState.instance.toBase64Image();
    link.click();
}
