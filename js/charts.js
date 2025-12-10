/**
 * Módulo de gráficos comparativos
 */

// Función para formatear números con coma decimal
function formatNumChart(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals).replace('.', ',');
}

// Colores para los gráficos
const chartColors = {
    TAN: { bg: 'rgba(52, 152, 219, 0.7)', border: 'rgb(52, 152, 219)' },
    KDB: { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgb(46, 204, 113)' },
    AODE: { bg: 'rgba(155, 89, 182, 0.7)', border: 'rgb(155, 89, 182)' },
    local: { bg: 'rgba(155, 89, 182, 0.7)', border: 'rgb(155, 89, 182)' },
    mdlp: { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgb(46, 204, 113)' },
    equal_freq: { bg: 'rgba(52, 152, 219, 0.7)', border: 'rgb(52, 152, 219)' },
    equal_width: { bg: 'rgba(231, 76, 60, 0.7)', border: 'rgb(231, 76, 60)' },
    pki: { bg: 'rgba(243, 156, 18, 0.7)', border: 'rgb(243, 156, 18)' }
};

const discTypeLabelsChart = {
    'local': 'Local',
    'mdlp': 'MDLP',
    'equal_freq': 'Igual Freq',
    'equal_width': 'Igual Amp',
    'pki': 'PKI'
};

// Referencia al gráfico actual
let currentChart = null;

// Estado de los gráficos
const chartState = {
    type: 'accuracy-comparison',
    dataset: null,
    iterations: 'all',
    cuts: 'all'
};

/**
 * Inicializa el módulo de gráficos
 */
function initCharts() {
    console.log('Inicializando gráficos...');
    if (!window.state || !window.state.data) {
        console.error('No hay datos cargados para los gráficos');
        return;
    }
    setupChartEventListeners();
    updateChartOptions();
    renderChart();
    console.log('Gráficos inicializados correctamente');
}

/**
 * Configura los event listeners para los controles de gráficos
 */
function setupChartEventListeners() {
    // Selector de tipo de gráfico
    const chartTypeSelect = document.getElementById('chart-type');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', (e) => {
            chartState.type = e.target.value;
            updateChartOptions();
            renderChart();
        });
    }

    // Botón descargar PNG
    const downloadBtn = document.getElementById('download-png');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadChartPNG);
    }

    // Botón toggle tabla
    const toggleBtn = document.getElementById('toggle-table');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTable);
    }
}

/**
 * Actualiza las opciones según el tipo de gráfico seleccionado
 */
function updateChartOptions() {
    const optionsContainer = document.getElementById('chart-options');
    if (!optionsContainer) return;

    const chartType = chartState.type;
    let optionsHTML = '';

    // Opciones comunes: iteraciones
    if (['accuracy-comparison', 'box-plot', 'dataset-comparison', 'trend-cuts', 'top-improvements', 'size-vs-improvement'].includes(chartType)) {
        optionsHTML += `
            <div class="chart-option">
                <label for="chart-iterations">Iteraciones:</label>
                <select id="chart-iterations">
                    <option value="all">Todas</option>
                    <option value="10it">10 iteraciones</option>
                    <option value="100it">100 iteraciones</option>
                </select>
            </div>
        `;
    }

    // Opciones de puntos de corte
    if (['accuracy-comparison', 'box-plot', 'dataset-comparison', 'top-improvements', 'size-vs-improvement'].includes(chartType)) {
        optionsHTML += `
            <div class="chart-option">
                <label for="chart-cuts">Puntos de Corte:</label>
                <select id="chart-cuts">
                    <option value="all">Todos</option>
                    <option value="3p">3 puntos</option>
                    <option value="4p">4 puntos</option>
                    <option value="5p">5 puntos</option>
                    <option value="up">Ilimitado</option>
                </select>
            </div>
        `;
    }

    // Selector de dataset para comparación por dataset
    if (chartType === 'dataset-comparison') {
        const datasetList = getUniqueDatasets();
        if (!chartState.dataset && datasetList.length > 0) {
            chartState.dataset = datasetList[0];
        }
        optionsHTML += `
            <div class="chart-option">
                <label for="chart-dataset">Dataset:</label>
                <select id="chart-dataset">
                    ${datasetList.map(d => `<option value="${d}" ${d === chartState.dataset ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
            </div>
        `;
    }

    optionsContainer.innerHTML = optionsHTML;

    // Añadir listeners a las nuevas opciones
    const iterationsSelect = document.getElementById('chart-iterations');
    if (iterationsSelect) {
        iterationsSelect.value = chartState.iterations;
        iterationsSelect.addEventListener('change', (e) => {
            chartState.iterations = e.target.value;
            renderChart();
        });
    }

    const cutsSelect = document.getElementById('chart-cuts');
    if (cutsSelect) {
        cutsSelect.value = chartState.cuts;
        cutsSelect.addEventListener('change', (e) => {
            chartState.cuts = e.target.value;
            renderChart();
        });
    }

    const datasetSelect = document.getElementById('chart-dataset');
    if (datasetSelect) {
        datasetSelect.addEventListener('change', (e) => {
            chartState.dataset = e.target.value;
            renderChart();
        });
    }
}

/**
 * Obtiene datasets únicos de los datos
 */
function getUniqueDatasets() {
    if (!window.state || !window.state.data) return [];
    return [...new Set(window.state.data.results.map(r => r.dataset))].sort();
}

/**
 * Renderiza el gráfico según el tipo seleccionado
 */
function renderChart() {
    if (!window.state || !window.state.data) {
        console.error('No hay datos para renderizar');
        return;
    }

    // Destruir gráfico anterior
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    const canvas = document.getElementById('main-chart');
    if (!canvas) {
        console.error('No se encontró el canvas');
        return;
    }

    const ctx = canvas.getContext('2d');

    try {
        switch (chartState.type) {
            case 'accuracy-comparison':
                renderAccuracyComparisonChart(ctx);
                break;
            case 'box-plot':
                renderBoxPlotChart(ctx);
                break;
            case 'heatmap':
                renderHeatmapChart(ctx);
                break;
            case 'dataset-comparison':
                renderDatasetComparisonChart(ctx);
                break;
            case 'trend-cuts':
                renderTrendCutsChart(ctx);
                break;
            case 'top-improvements':
                renderTopImprovementsChart(ctx);
                break;
            case 'size-vs-improvement':
                renderSizeVsImprovementChart(ctx);
                break;
        }
    } catch (error) {
        console.error('Error renderizando gráfico:', error);
    }
}

/**
 * Filtra datos según las opciones seleccionadas
 */
function getFilteredChartData() {
    let data = window.state.data.results;

    if (chartState.iterations !== 'all') {
        data = data.filter(r => r.iterations === chartState.iterations);
    }

    if (chartState.cuts !== 'all') {
        data = data.filter(r => r.cuts === chartState.cuts);
    }

    return data;
}

/**
 * 1. Gráfico de barras: Comparación de Accuracy por Clasificador
 */
function renderAccuracyComparisonChart(ctx) {
    const data = getFilteredChartData();
    const discTypes = ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki'];
    const modelBases = ['TAN', 'KDB', 'AODE'];

    // Calcular accuracy promedio por modelo base y tipo de discretización
    const datasets = discTypes.map(discType => {
        const accuracies = modelBases.map(modelBase => {
            const filtered = data.filter(r =>
                r.model_base === modelBase &&
                r.discretization_type === discType
            );
            if (filtered.length === 0) return null;
            const avg = filtered.reduce((sum, r) => sum + r.accuracy, 0) / filtered.length;
            return avg * 100;
        });

        return {
            label: discTypeLabelsChart[discType] || discType,
            data: accuracies,
            backgroundColor: chartColors[discType]?.bg || 'rgba(128, 128, 128, 0.7)',
            borderColor: chartColors[discType]?.border || 'rgb(128, 128, 128)',
            borderWidth: 1
        };
    });

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: modelBases,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Accuracy Promedio por Clasificador y Tipo de Discretización',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatNumChart(context.raw)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 70,
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    },
                    ticks: {
                        callback: (value) => formatNumChart(value) + '%'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Clasificador Base'
                    }
                }
            }
        }
    });
}

/**
 * 2. Box Plot: Distribución de Accuracy
 */
function renderBoxPlotChart(ctx) {
    const data = getFilteredChartData();
    const modelBases = ['TAN', 'KDB', 'AODE'];

    // Preparar datos para box plot
    const boxData = modelBases.map(modelBase => {
        const accuracies = data
            .filter(r => r.model_base === modelBase)
            .map(r => r.accuracy * 100);
        return accuracies.sort((a, b) => a - b);
    });

    // Calcular estadísticas para cada grupo
    const stats = modelBases.map((modelBase, idx) => {
        const values = boxData[idx];
        if (values.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0 };

        const q1 = percentile(values, 25);
        const median = percentile(values, 50);
        const q3 = percentile(values, 75);
        const min = values[0];
        const max = values[values.length - 1];
        const mean = values.reduce((a, b) => a + b, 0) / values.length;

        return { min, q1, median, q3, max, mean };
    });

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: modelBases,
            datasets: [{
                label: 'Accuracy Mediana',
                data: stats.map(d => d.median),
                backgroundColor: modelBases.map(m => chartColors[m].bg),
                borderColor: modelBases.map(m => chartColors[m].border),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Accuracy por Clasificador',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: (context) => {
                            const d = stats[context.dataIndex];
                            return [
                                `Min: ${formatNumChart(d.min)}%`,
                                `Q1: ${formatNumChart(d.q1)}%`,
                                `Mediana: ${formatNumChart(d.median)}%`,
                                `Q3: ${formatNumChart(d.q3)}%`,
                                `Max: ${formatNumChart(d.max)}%`,
                                `Media: ${formatNumChart(d.mean)}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 60,
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    },
                    ticks: {
                        callback: (value) => formatNumChart(value) + '%'
                    }
                }
            }
        }
    });
}

/**
 * Calcula el percentil de un array ordenado
 */
function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return arr[lower];
    return arr[lower] + (arr[upper] - arr[lower]) * (index - lower);
}

/**
 * 3. Heatmap: Mejoras de Discretización Local
 */
function renderHeatmapChart(ctx) {
    const data = window.state.data.results.filter(r =>
        r.discretization_type === 'local' &&
        r.improvement_vs_base !== undefined
    );

    const datasetList = getUniqueDatasets();
    const classifiers = ['TANLd', 'KDBLd', 'AODELd'];

    // Crear matriz de mejoras (promedio por dataset y clasificador)
    const improvements = {};

    datasetList.forEach(dataset => {
        improvements[dataset] = {};
        classifiers.forEach(classifier => {
            const filtered = data.filter(r =>
                r.dataset === dataset &&
                r.model === classifier
            );
            if (filtered.length > 0) {
                const avgImprovement = filtered.reduce((sum, r) => sum + (r.improvement_vs_base || 0), 0) / filtered.length;
                improvements[dataset][classifier] = avgImprovement;
            } else {
                improvements[dataset][classifier] = 0;
            }
        });
    });

    // Preparar datos para gráfico de burbujas
    const bubbleData = datasetList.flatMap((dataset, yIdx) =>
        classifiers.map((classifier, xIdx) => {
            const value = improvements[dataset]?.[classifier] || 0;
            return {
                x: xIdx,
                y: yIdx,
                r: Math.min(Math.abs(value) * 8 + 4, 20),
                value: value,
                dataset: dataset,
                classifier: classifier
            };
        })
    );

    currentChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Mejora Local',
                data: bubbleData,
                backgroundColor: bubbleData.map(d =>
                    d.value > 0.1 ? 'rgba(46, 204, 113, 0.7)' :
                    d.value < -0.1 ? 'rgba(231, 76, 60, 0.7)' :
                    'rgba(149, 165, 166, 0.7)'
                ),
                borderColor: bubbleData.map(d =>
                    d.value > 0.1 ? 'rgb(46, 204, 113)' :
                    d.value < -0.1 ? 'rgb(231, 76, 60)' :
                    'rgb(149, 165, 166)'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Mejoras de Discretización Local por Dataset (verde=mejora, rojo=pérdida)',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const d = context.raw;
                            const sign = d.value > 0 ? '+' : '';
                            return `${d.dataset} - ${d.classifier}: ${sign}${formatNumChart(d.value)}%`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: -0.5,
                    max: 2.5,
                    ticks: {
                        stepSize: 1,
                        callback: (value) => classifiers[Math.round(value)] || ''
                    },
                    title: {
                        display: true,
                        text: 'Clasificador'
                    }
                },
                y: {
                    type: 'linear',
                    min: -0.5,
                    max: datasetList.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (value) => {
                            const idx = Math.round(value);
                            return datasetList[idx] || '';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Dataset'
                    }
                }
            }
        }
    });
}

/**
 * 4. Comparación por Dataset específico
 */
function renderDatasetComparisonChart(ctx) {
    if (!chartState.dataset) {
        const datasetList = getUniqueDatasets();
        if (datasetList.length > 0) {
            chartState.dataset = datasetList[0];
        } else {
            return;
        }
    }

    const data = getFilteredChartData().filter(r => r.dataset === chartState.dataset);

    if (data.length === 0) {
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Sin datos'], datasets: [{ data: [0] }] },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `No hay datos para: ${chartState.dataset}`,
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    // Agrupar por modelo
    const modelData = {};
    data.forEach(r => {
        if (!modelData[r.model]) {
            modelData[r.model] = [];
        }
        modelData[r.model].push(r.accuracy * 100);
    });

    // Calcular promedio por modelo y ordenar
    const models = Object.keys(modelData).sort((a, b) => {
        const avgA = modelData[a].reduce((x, y) => x + y, 0) / modelData[a].length;
        const avgB = modelData[b].reduce((x, y) => x + y, 0) / modelData[b].length;
        return avgB - avgA;
    });

    const accuracies = models.map(m => {
        const values = modelData[m];
        return values.reduce((a, b) => a + b, 0) / values.length;
    });

    // Determinar colores según tipo de discretización
    const colors = models.map(m => {
        if (m.endsWith('Ld')) return chartColors.local;
        if (m.includes('mdlp')) return chartColors.mdlp;
        if (m.includes('q') && m.includes('bin')) return chartColors.equal_freq;
        if (m.includes('u') && m.includes('bin')) return chartColors.equal_width;
        if (m.includes('pki')) return chartColors.pki;
        return { bg: 'rgba(149, 165, 166, 0.7)', border: 'rgb(149, 165, 166)' };
    });

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: models,
            datasets: [{
                label: 'Accuracy',
                data: accuracies,
                backgroundColor: colors.map(c => c.bg),
                borderColor: colors.map(c => c.border),
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
                    text: `Comparación de Modelos - Dataset: ${chartState.dataset}`,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Accuracy: ${formatNumChart(context.raw)}%`
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    },
                    ticks: {
                        callback: (value) => formatNumChart(value) + '%'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Modelo'
                    }
                }
            }
        }
    });
}

/**
 * 5. Tendencia por Puntos de Corte
 */
function renderTrendCutsChart(ctx) {
    let data = window.state.data.results;

    if (chartState.iterations !== 'all') {
        data = data.filter(r => r.iterations === chartState.iterations);
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

    // Calcular accuracy promedio por configuración de cortes y clasificador
    const datasets = classifiers.map(classifier => {
        const accuracies = cuts.map(cut => {
            let filtered;
            if (classifier.isLocal) {
                filtered = data.filter(r => r.model === classifier.name && r.cuts === cut);
            } else {
                filtered = data.filter(r =>
                    r.model_base === classifier.base &&
                    r.discretization_type === 'mdlp' &&
                    r.cuts === cut
                );
            }
            if (filtered.length === 0) return null;
            return filtered.reduce((sum, r) => sum + r.accuracy, 0) / filtered.length * 100;
        });

        const baseColor = chartColors[classifier.base] || chartColors.local;

        return {
            label: classifier.name,
            data: accuracies,
            borderColor: baseColor.border,
            backgroundColor: 'transparent',
            borderWidth: classifier.isLocal ? 3 : 2,
            borderDash: classifier.isLocal ? [] : [5, 5],
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7
        };
    });

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: cutsLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Tendencia de Accuracy por Puntos de Corte (línea sólida=Local, punteada=MDLP)',
                    font: { size: 14 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatNumChart(context.raw)}%`
                    }
                },
                legend: {
                    position: 'right'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    },
                    ticks: {
                        callback: (value) => formatNumChart(value) + '%'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Configuración de Puntos de Corte'
                    }
                }
            }
        }
    });
}

/**
 * 6. Top 15 Datasets con Mayores Mejoras
 */
function renderTopImprovementsChart(ctx) {
    const data = getFilteredChartData();

    // Filtrar solo resultados de discretización local con mejora definida
    const localResults = data.filter(r =>
        r.discretization_type === 'local' &&
        r.improvement_vs_base !== undefined
    );

    // Agrupar por dataset y calcular mejora promedio
    const datasetImprovements = {};
    localResults.forEach(r => {
        if (!datasetImprovements[r.dataset]) {
            datasetImprovements[r.dataset] = [];
        }
        datasetImprovements[r.dataset].push(r.improvement_vs_base);
    });

    // Calcular promedio por dataset
    const datasetAvg = Object.entries(datasetImprovements).map(([dataset, improvements]) => ({
        dataset,
        avgImprovement: improvements.reduce((a, b) => a + b, 0) / improvements.length
    }));

    // Ordenar por mejora (de mayor a menor) y tomar top 15
    datasetAvg.sort((a, b) => b.avgImprovement - a.avgImprovement);
    const top15 = datasetAvg.slice(0, 15);

    // Invertir para que el mejor quede abajo (como en la imagen)
    top15.reverse();

    const labels = top15.map(d => d.dataset);
    const values = top15.map(d => d.avgImprovement);
    const colors = values.map(v => v >= 0 ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)');
    const borderColors = values.map(v => v >= 0 ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)');

    // Construir título dinámico
    let titleSuffix = '';
    if (chartState.iterations !== 'all') {
        titleSuffix += ` - ${chartState.iterations}`;
    }
    if (chartState.cuts !== 'all') {
        titleSuffix += ` - ${chartState.cuts}`;
    }

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Mejora Promedio',
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
                    text: `Top 15 Datasets con Mayores Mejoras${titleSuffix}`,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const val = context.raw;
                            const sign = val >= 0 ? '+' : '';
                            return `Mejora: ${sign}${formatNumChart(val)}%`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Mejora Promedio (%)'
                    },
                    ticks: {
                        callback: (value) => formatNumChart(value) + '%'
                    },
                    grid: {
                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    title: {
                        display: false
                    }
                }
            }
        },
        plugins: [{
            // Plugin para mostrar valores en las barras
            id: 'barLabels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const value = dataset.data[index];
                        const sign = value >= 0 ? '+' : '';
                        const text = `${sign}${formatNumChart(value)}%`;

                        ctx.save();
                        ctx.fillStyle = value >= 0 ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = value >= 0 ? 'left' : 'right';
                        ctx.textBaseline = 'middle';

                        const x = value >= 0 ? bar.x + 5 : bar.x - 5;
                        ctx.fillText(text, x, bar.y);
                        ctx.restore();
                    });
                });
            }
        }]
    });
}

/**
 * 7. Relación Tamaño del Dataset vs Mejora
 */
function renderSizeVsImprovementChart(ctx) {
    const data = getFilteredChartData();

    // Filtrar solo resultados de discretización local con mejora definida
    const localResults = data.filter(r =>
        r.discretization_type === 'local' &&
        r.improvement_vs_base !== undefined &&
        r.samples !== undefined
    );

    // Agrupar por dataset y calcular mejora promedio
    const datasetStats = {};
    localResults.forEach(r => {
        if (!datasetStats[r.dataset]) {
            datasetStats[r.dataset] = {
                samples: r.samples,
                improvements: []
            };
        }
        datasetStats[r.dataset].improvements.push(r.improvement_vs_base);
    });

    // Calcular puntos para el scatter
    const scatterData = Object.entries(datasetStats).map(([dataset, stats]) => ({
        x: stats.samples,
        y: stats.improvements.reduce((a, b) => a + b, 0) / stats.improvements.length,
        dataset: dataset
    }));

    // Calcular línea de tendencia (regresión logarítmica simple)
    const xLog = scatterData.map(d => Math.log10(d.x));
    const y = scatterData.map(d => d.y);
    const n = xLog.length;
    const sumX = xLog.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = xLog.reduce((sum, x, i) => sum + x * y[i], 0);
    const sumX2 = xLog.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generar puntos para la línea de tendencia
    const minX = Math.min(...scatterData.map(d => d.x));
    const maxX = Math.max(...scatterData.map(d => d.x));
    const trendPoints = [];
    for (let x = minX; x <= maxX; x += (maxX - minX) / 50) {
        trendPoints.push({
            x: x,
            y: slope * Math.log10(x) + intercept
        });
    }

    // Construir título dinámico
    let titleSuffix = '';
    if (chartState.iterations !== 'all') {
        titleSuffix += ` - ${chartState.iterations}`;
    }
    if (chartState.cuts !== 'all') {
        titleSuffix += ` - ${chartState.cuts}`;
    }

    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Datasets',
                    data: scatterData,
                    backgroundColor: scatterData.map(d =>
                        d.y >= 0 ? 'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)'
                    ),
                    borderColor: scatterData.map(d =>
                        d.y >= 0 ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)'
                    ),
                    borderWidth: 1,
                    pointRadius: 8,
                    pointHoverRadius: 10
                },
                {
                    label: 'Tendencia',
                    data: trendPoints,
                    type: 'line',
                    borderColor: 'rgba(231, 76, 60, 0.8)',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Relación entre Tamaño del Dataset y Mejora${titleSuffix}`,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.datasetIndex === 1) return null; // No tooltip para línea de tendencia
                            const d = context.raw;
                            const sign = d.y >= 0 ? '+' : '';
                            return `${d.dataset}: ${sign}${formatNumChart(d.y)}% (${d.x.toLocaleString('es-ES')} muestras)`;
                        }
                    },
                    filter: (tooltipItem) => tooltipItem.datasetIndex === 0
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        filter: (item) => item.text === 'Tendencia'
                    }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Tamaño del Dataset (muestras)'
                    },
                    ticks: {
                        callback: (value) => value.toLocaleString('es-ES')
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Mejora Promedio (%)'
                    },
                    ticks: {
                        callback: (value) => formatNumChart(value) + '%'
                    },
                    grid: {
                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
                    }
                }
            }
        },
        plugins: [{
            // Plugin para mostrar etiquetas de datasets
            id: 'datasetLabels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);

                meta.data.forEach((point, index) => {
                    const data = chart.data.datasets[0].data[index];

                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(data.dataset, point.x + 5, point.y - 5);
                    ctx.restore();
                });
            }
        }]
    });
}

/**
 * Descarga el gráfico como PNG
 */
function downloadChartPNG() {
    if (!currentChart) {
        alert('No hay gráfico para descargar');
        return;
    }

    const link = document.createElement('a');
    link.download = `grafico_${chartState.type}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = currentChart.toBase64Image();
    link.click();
}

/**
 * Toggle visibilidad de la tabla
 */
function toggleTable() {
    const table = document.getElementById('results-section');
    const btnText = document.getElementById('toggle-table-text');

    if (table && btnText) {
        table.classList.toggle('hidden');
        btnText.textContent = table.classList.contains('hidden') ? 'Mostrar Tabla' : 'Ocultar Tabla';
    }
}

// Exportar para uso global
window.initCharts = initCharts;
window.renderChart = renderChart;
