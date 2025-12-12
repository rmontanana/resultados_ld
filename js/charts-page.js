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
    cuts: 'all',
    discretizers: ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki-sqrt', 'pki-log']
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
    'box-plot': 'Distribución de Accuracy por Discretizador',
    'trend-cuts': 'Tendencia por Puntos de Corte',
    'top-improvements': 'Top 15 Datasets con Mayores Mejoras',
    'size-vs-improvement': 'Relación Tamaño vs Mejora',
    'heatmap': 'Heatmap: Comparación de Discretizadores vs Local'
};

const chartHints = {
    'accuracy-comparison': '',
    'box-plot': 'Muestra mediana con estadísticas detalladas en tooltip',
    'trend-cuts': 'Línea sólida = Local, punteada = MDLP. Sombra = desviación típica',
    'top-improvements': 'Mejora promedio de discretización local vs mejor base',
    'size-vs-improvement': 'Relación logarítmica entre tamaño y mejora',
    'heatmap': 'Verde: mejor que Local, Rojo: peor que Local'
};

const chartInfoDetails = {
    'accuracy-comparison': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Media de accuracy (%) por clasificador base (TAN, KDB, AODE) usando los filtros activos.</li>
                <li>Incluye solo los discretizadores seleccionados y los filtros de iteraciones/cortes.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Agrupa resultados por model_base y promedia accuracy×100 de cada resultado filtrado.</li>
                <li>El eje Y muestra la media porcentual; cada barra representa un clasificador base.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Combina filtros de iteraciones/cortes/discretizadores para comparar escenarios.</li>
                <li>Útil para ver rápidamente quién lidera en el subconjunto filtrado.</li>
            </ul>
        </div>
    `,
    'box-plot': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Distribución de accuracy (%) por discretizador seleccionado.</li>
                <li>Cada caja resume los valores de accuracy de todas las ejecuciones filtradas de ese discretizador.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Aplica filtros de iteraciones/cortes y discretizadores.</li>
                <li>Calcula percentiles (min, Q1, mediana, Q3, max) sobre accuracy×100.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Compara dispersión y mediana entre discretizadores.</li>
                <li>El tooltip del gráfico muestra estadísticas completas por caja.</li>
            </ul>
        </div>
    `,
    'trend-cuts': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Evolución del accuracy medio (%) a través de puntos de corte (3p, 4p, 5p, up).</li>
                <li>Sólo Local y MDLP (tienen datos en todos los cortes); se promedia por clasificador base.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Filtra por iteraciones; no limita por cortes para trazar la curva completa.</li>
                <li>Media de accuracy×100 y desviación típica por corte y clasificador base.</li>
                <li>Banda ±σ sólo para Local; MDLP se dibuja con línea punteada.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Compara cómo varía el rendimiento al cambiar el número de cortes.</li>
                <li>Mantén sólo Local/MDLP seleccionados para ver el gráfico.</li>
            </ul>
        </div>
    `,
    'top-improvements': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Top 15 datasets con mayor mejora media de Local respecto al mejor modelo base.</li>
                <li>Signo positivo = Local supera; negativo = Local pierde.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Requiere Local seleccionado; aplica filtros de iteraciones y cortes.</li>
                <li>Para cada dataset: compara cada resultado Local con el mejor base coincidente (iteraciones/cortes/model_base) dentro de discretizadores seleccionados (excluye Local).</li>
                <li>Promedia mejoras ((acc_local - acc_base)×100) por dataset y ordena el top.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Identifica dónde la discretización local aporta más o menos.</li>
                <li>Ajusta discretizadores para ver cómo cambian las mejoras.</li>
            </ul>
        </div>
    `,
    'size-vs-improvement': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Dispersión de la mejora promedio de Local vs mejor base en función del tamaño (muestras).</li>
                <li>Incluye dos líneas de tendencia: ajuste logarítmico (sobre log10(x)) y lineal.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Filtra por iteraciones/cortes y discretizadores (Local obligatorio).</li>
                <li>Por dataset: mejora media de Local vs mejor base coincidente (iteraciones/cortes/model_base) con discretizadores seleccionados distintos de Local.</li>
                <li>Tendencia log: regresión lineal sobre log10(tamaño); Tendencia lineal: regresión en escala original.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Explora si el beneficio de Local cambia con el tamaño del dataset.</li>
                <li>Activa/desactiva las líneas en la leyenda para comparar ajustes.</li>
            </ul>
        </div>
    `,
    'heatmap': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Diferencia (pp) entre el mejor resultado de cada discretizador seleccionado y el mejor Local, por dataset.</li>
                <li>Verde = discretizador supera a Local; rojo = peor que Local.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Local es referencia: se toma su mejor accuracy por dataset con los filtros vigentes.</li>
                <li>Para cada discretizador seleccionado (no Local) se toma su mejor accuracy por dataset con los mismos filtros.</li>
                <li>Se muestra la diferencia (best_disc - best_local)×100.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Detecta rápidamente dónde Local gana o pierde frente a cada discretizador.</li>
                <li>Combina con filtros de iteraciones/cortes para escenarios concretos.</li>
            </ul>
        </div>
    `
};
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
            <p style="color: var(--danger-color);">Error cargando datos: ${error.message}</p>
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

    // Habilitar/deshabilitar selector de puntos de corte según el gráfico
    const cutsSelect = document.getElementById('filter-cuts');
    if (cutsSelect) {
        cutsSelect.disabled = isTrend;
    }
}

function updateChartInfo() {
    document.getElementById('chart-title').textContent = chartTitles[state.chartType] || '';
    document.getElementById('chart-hint').textContent = chartHints[state.chartType] || '';
    const infoText = document.getElementById('chart-info-text');
    if (infoText) {
        infoText.innerHTML = chartInfoDetails[state.chartType] || '';
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
        'pki-sqrt': 'pki',
        'pki-log': 'pki'
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
 * 2. Box Plot (Distribución por Discretizador)
 */
function renderBoxPlotChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const data = getFilteredData();

    // Mapeo de nombres de discretizadores a sus variantes en los datos
    const discMapping = {
        'local': { type: 'local', label: 'Local' },
        'mdlp': { type: 'mdlp', label: 'MDLP' },
        'equal_freq': { type: 'equal_freq', label: 'Igual Freq' },
        'equal_width': { type: 'equal_width', label: 'Igual Amp' },
        'pki-sqrt': { type: 'pki', variant: 'sqrt', label: 'PKI-sqrt' },
        'pki-log': { type: 'pki', variant: 'log', label: 'PKI-log' }
    };

    // Filtrar solo los discretizadores seleccionados
    const selectedDiscs = state.discretizers
        .filter(d => discMapping[d])
        .map(d => ({ key: d, ...discMapping[d] }));

    const stats = selectedDiscs.map(disc => {
        let values;
        if (disc.variant) {
            // Para PKI con variantes
            values = data.filter(r => {
                const isPKI = r.discretization_type === 'pki';
                const matchesVariant = r.model?.includes(`pki${disc.variant}`);
                return isPKI && matchesVariant;
            }).map(r => r.accuracy * 100).sort((a, b) => a - b);
        } else {
            values = data.filter(r => r.discretization_type === disc.type)
                .map(r => r.accuracy * 100)
                .sort((a, b) => a - b);
        }

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
                label: 'Mediana',
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
                        text: 'Selecciona Local o MDLP para ver este gráfico',
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    const cuts = ['3p', '4p', '5p', 'up'];
    const cutsLabels = ['3 puntos', '4 puntos', '5 puntos', 'Ilimitado'];

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
                    title: { display: true, text: 'Puntos de Corte' }
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
        'pki-sqrt': { type: 'pki', variant: 'sqrt' },
        'pki-log': { type: 'pki', variant: 'log' }
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
                        text: 'Selecciona "Local" para ver las mejoras'
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

                    if (mapping.variant) {
                        return r.discretization_type === 'pki' && r.model?.includes(`pki${mapping.variant}`);
                    } else {
                        return r.discretization_type === mapping.type;
                    }
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
                        text: 'Este gráfico requiere que Local esté seleccionado',
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    // Mapping de discretizadores
    const discMapping = {
        'local': { type: 'local', label: 'Local' },
        'mdlp': { type: 'mdlp', label: 'MDLP' },
        'equal_freq': { type: 'equal_freq', label: 'Igual Freq' },
        'equal_width': { type: 'equal_width', label: 'Igual Amp' },
        'pki-sqrt': { type: 'pki', variant: 'sqrt', label: 'PKI-sqrt' },
        'pki-log': { type: 'pki', variant: 'log', label: 'PKI-log' }
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

                    if (mapping.variant) {
                        return r.discretization_type === 'pki' && r.model?.includes(`pki${mapping.variant}`);
                    } else {
                        return r.discretization_type === mapping.type;
                    }
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
                    label: 'Tendencia logarítmica',
                    data: trendPoints,
                    type: 'line',
                    borderColor: 'rgba(231, 76, 60, 0.8)',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Tendencia lineal',
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
                            `Dataset: ${c.raw.dataset}`,
                            `Muestras: ${c.raw.x.toLocaleString('es-ES')}`,
                            `Mejora: ${c.raw.y >= 0 ? '+' : ''}${formatNum(c.raw.y)}%`
                        ]
                    }
                },
                legend: {
                    labels: { filter: (item) => item.text.includes('Tendencia') }
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
                        text: 'Este gráfico requiere que Local esté seleccionado como base de comparación',
                        font: { size: 16 }
                    }
                }
            }
        });
        return;
    }

    // Mapeo para identificar discretizadores
    const discMapping = {
        'mdlp': { type: 'mdlp', label: 'MDLP' },
        'equal_freq': { type: 'equal_freq', label: 'Igual Freq' },
        'equal_width': { type: 'equal_width', label: 'Igual Amp' },
        'pki-sqrt': { type: 'pki', variant: 'sqrt', label: 'PKI-sqrt' },
        'pki-log': { type: 'pki', variant: 'log', label: 'PKI-log' }
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
                        text: 'Selecciona al menos un discretizador además de Local para comparar',
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

            if (disc.variant) {
                // Para PKI con variantes
                results = data.filter(r =>
                    r.dataset === dataset &&
                    r.discretization_type === 'pki' &&
                    r.model?.includes(`pki${disc.variant}`)
                );
            } else {
                // Para otros discretizadores
                results = data.filter(r =>
                    r.dataset === dataset &&
                    r.discretization_type === disc.type
                );
            }

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
                        text: 'No hay datos disponibles para la comparación',
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
                            `Diferencia: ${c.raw.value >= 0 ? '+' : ''}${formatNum(c.raw.value)} pp`
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
                        text: 'Discretizadores',
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
