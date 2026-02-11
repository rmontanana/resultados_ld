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
    adversaries: null,
    chartType: 'accuracy-comparison',
    iterations: 'all',
    cuts: 'all',
    discretizers: ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki']
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
    'top-improvements': 'Top 15 Datasets: Mejora Pareada Media',
    'size-vs-improvement': 'Relación Tamaño vs Mejora Pareada',
    'heatmap': 'Heatmap: Mejora Pareada por Dataset y Método',
    'config-heatmap': 'Heatmap: Configuración vs Adversario',
    'adversary-bars': 'Rendimiento Local vs Adversarios',
    'classifier-radar': 'Perfil de Clasificadores Locales',
    'effect-forest': 'Forest Plot: Tamaños de Efecto con IC 95%',
    'pvalue-grid': 'Grid de P-valores Ajustados (3 Clf × 4 Métodos)',
    'scenarios-global': 'Mejora Pareada por Dataset (27 Datasets)'
};

const chartHints = {
    'accuracy-comparison': '',
    'box-plot': 'Muestra mediana con estadísticas detalladas en tooltip',
    'trend-cuts': 'Línea sólida = Local, punteada = MDLP. Sombra = desviación típica',
    'top-improvements': 'Mejora pareada media (promedio sobre 12 adversarios) por dataset',
    'size-vs-improvement': 'Relación entre tamaño y mejora pareada (datos de aggregated_by_dataset)',
    'heatmap': 'Mejora pareada (%) por dataset y método de discretización',
    'config-heatmap': '% victorias de Local por configuración y adversario',
    'adversary-bars': 'Compara clasificadores locales contra cada método tradicional',
    'classifier-radar': 'Perfil de victorias por clasificador y adversario',
    'effect-forest': 'Tamaño de efecto (rank-biserial/Cohen d) con intervalo de confianza 95%',
    'pvalue-grid': 'P-valores ajustados (Holm-Bonferroni). Verde: significativo (p<0,05)',
    'scenarios-global': 'Mejora media sobre todos los adversarios, ordenada por dataset'
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
                <li>Top 15 datasets ordenados por mejora pareada media de Local vs todos los adversarios.</li>
                <li>Datos de global_patterns.dataset_patterns (pipeline adversaries_final).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Usa mejora pareada: cada resultado Local se compara contra cada adversario individualmente.</li>
                <li>Media sobre 3 clasificadores × 4 métodos = 12 comparaciones por dataset.</li>
                <li>NO usa "vs mejor base" (cherry-picking).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Identifica dónde la discretización local aporta más o menos.</li>
                <li>Compare con el gráfico de escenarios globales para ver los 27 datasets.</li>
            </ul>
        </div>
    `,
    'size-vs-improvement': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Dispersión de la mejora pareada media en función del tamaño (muestras).</li>
                <li>Datos de aggregated_by_dataset (pipeline adversaries_final).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Por dataset: promedia improvement_pct sobre todas las combinaciones clf×método.</li>
                <li>Incluye línea de tendencia logarítmica sobre log10(tamaño).</li>
                <li>El tamaño (muestras) se obtiene de results.json.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Explora si el beneficio de Local cambia con el tamaño del dataset.</li>
                <li>Cada punto representa un dataset con su mejora media pareada.</li>
            </ul>
        </div>
    `,
    'heatmap': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Mejora pareada (%) de Local vs cada método de discretización, por dataset.</li>
                <li>Datos de aggregated_by_dataset (pipeline adversaries_final).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Promedia improvement_pct sobre los 3 clasificadores para cada par dataset-método.</li>
                <li>Verde = Local mejora; rojo = Local empeora; intensidad proporcional a la magnitud.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Detecta rápidamente dónde Local gana o pierde frente a cada método.</li>
                <li>Identifica patrones por tipo de discretización.</li>
            </ul>
        </div>
    `,
    'config-heatmap': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Porcentaje de victorias de discretización local (TANLd+KDBLd+AODELd) contra cada adversario.</li>
                <li>Matriz de configuraciones (10it/3p, 10it/4p, etc.) vs adversarios (MDLP, Igual Freq, etc.).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Para cada celda: compara todos los resultados Local vs el adversario correspondiente.</li>
                <li>Cuenta victorias cuando Local supera al adversario en el mismo dataset/modelo base.</li>
                <li>Color más intenso = mayor % de victorias.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Identifica qué configuraciones y adversarios son más/menos favorables para Local.</li>
                <li>Compara rendimiento global entre configuraciones.</li>
            </ul>
        </div>
    `,
    'adversary-bars': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Barras agrupadas: TANLd, KDBLd y AODELd contra cada adversario.</li>
                <li>Altura = porcentaje de victorias de Local contra ese adversario.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Filtra por iteraciones y puntos de corte seleccionados.</li>
                <li>Compara cada clasificador Local con su equivalente base.</li>
                <li>Victoria = Local supera al adversario en ese dataset.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Compara qué clasificador Local rinde mejor contra cada adversario.</li>
                <li>Identifica fortalezas/debilidades por clasificador.</li>
            </ul>
        </div>
    `,
    'classifier-radar': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Perfil radar de cada clasificador local (TANLd, KDBLd, AODELd).</li>
                <li>Cada eje representa un adversario; el radio = % de victorias.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Aplica filtros de iteraciones y puntos de corte.</li>
                <li>Por cada clasificador y adversario: % de datasets donde Local gana.</li>
                <li>Escala: 0% (centro) a 100% (borde).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Visualiza el perfil de fortalezas de cada clasificador.</li>
                <li>TANLd: área azul, KDBLd: verde, AODELd: morado.</li>
            </ul>
        </div>
    `,
    'effect-forest': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Forest plot: tamaño de efecto de cada par clasificador-método con IC 95%.</li>
                <li>Datos de statistical_results (pipeline adversaries_final).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Rank-biserial (Wilcoxon) o Cohen's d (t-test) según normalidad.</li>
                <li>IC 95% bootstrap. Corrección Holm-Bonferroni en p-valores.</li>
                <li>Línea vertical en 0 = sin efecto.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Identifica qué pares tienen efectos significativos (IC no cruza 0).</li>
                <li>Compara magnitudes de efecto entre adversarios.</li>
            </ul>
        </div>
    `,
    'pvalue-grid': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Grid de p-valores ajustados (Holm-Bonferroni) para 12 pares.</li>
                <li>Filas: clasificadores (TAN, KDB, AODE). Columnas: métodos (MDLP, Freq, Amp, PKI).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Tests: Wilcoxon signed-rank o t-test según normalidad.</li>
                <li>N=27 datasets por par. Corrección Holm-Bonferroni sobre 12 tests.</li>
                <li>Verde: p < 0,05 (significativo). Rojo: no significativo.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Identifica rápidamente qué comparaciones son estadísticamente significativas.</li>
                <li>El tamaño de burbuja es inversamente proporcional al p-valor.</li>
            </ul>
        </div>
    `,
    'scenarios-global': `
        <div class="tooltip-section">
            <strong>Qué muestra</strong>
            <ul>
                <li>Mejora pareada media de los 27 datasets, ordenados de mayor a menor.</li>
                <li>Datos de global_patterns.dataset_patterns (pipeline adversaries_final).</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Cálculo</strong>
            <ul>
                <li>Cada barra = media de improvement_pct sobre 12 comparaciones (3 clf × 4 métodos).</li>
                <li>Verde = Local mejora globalmente; rojo = Local empeora.</li>
            </ul>
        </div>
        <div class="tooltip-section">
            <strong>Uso</strong>
            <ul>
                <li>Visión global: en cuántos datasets Local es mejor/peor en promedio.</li>
                <li>Complementa el forest plot con la perspectiva por dataset.</li>
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
    const [resultsResponse, adversariesResponse] = await Promise.all([
        fetch('data/results.json'),
        fetch('data/adversaries.json')
    ]);
    if (!resultsResponse.ok) throw new Error(`HTTP ${resultsResponse.status} cargando results.json`);
    if (!adversariesResponse.ok) throw new Error(`HTTP ${adversariesResponse.status} cargando adversaries.json`);

    state.data = await resultsResponse.json();
    state.adversaries = await adversariesResponse.json();
    console.log(`Datos cargados: ${state.data.results.length} resultados, ${state.adversaries.pairwise_comparisons.length} comparaciones pareadas`);
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
    // Mostrar filtros de discretizadores solo para box-plot y trend-cuts
    // (top-improvements, size-vs-improvement, heatmap ahora usan datos de adversaries_final)
    const showFilters = ['box-plot', 'trend-cuts'].includes(state.chartType);
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
    // Gráficos que usan datos globales de adversaries (no filtran por iter/cuts)
    const isAdversaryGlobal = ['top-improvements', 'size-vs-improvement', 'heatmap',
        'effect-forest', 'pvalue-grid', 'scenarios-global'].includes(state.chartType);

    if (cutsSelect) {
        cutsSelect.disabled = isTrend || isConfigHeatmap || isAdversaryGlobal;
        if (isConfigHeatmap || isAdversaryGlobal) {
            cutsSelect.value = 'all';
            state.cuts = 'all';
        }
    }

    if (iterationsSelect) {
        iterationsSelect.disabled = isConfigHeatmap || isAdversaryGlobal;
        if (isConfigHeatmap || isAdversaryGlobal) {
            iterationsSelect.value = 'all';
            state.iterations = 'all';
        }
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
        case 'config-heatmap':
            renderConfigHeatmapChart();
            break;
        case 'adversary-bars':
            renderAdversaryBarsChart();
            break;
        case 'classifier-radar':
            renderClassifierRadarChart();
            break;
        case 'effect-forest':
            renderEffectForestChart();
            break;
        case 'pvalue-grid':
            renderPvalueGridChart();
            break;
        case 'scenarios-global':
            renderScenariosGlobalChart();
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
        'pki': { type: 'pki', label: 'PKI' }
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
 * 4. Top 15 Datasets: Mejora Pareada Media (desde adversaries_final)
 */
function renderTop15Chart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    if (!state.adversaries) {
        currentChart = new Chart(ctx, {
            type: 'bar', data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Datos de adversarios no disponibles' } } }
        });
        return;
    }

    // Usar global_patterns.dataset_patterns de complementary_analysis
    const patterns = state.adversaries.complementary_analysis?.global_patterns?.dataset_patterns;
    if (!patterns || patterns.length === 0) {
        currentChart = new Chart(ctx, {
            type: 'bar', data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'No hay dataset_patterns disponibles' } } }
        });
        return;
    }

    // Ordenar por mejora media y tomar top 15
    const sorted = [...patterns].sort((a, b) => b.mean_improvement_pct - a.mean_improvement_pct);
    const top15 = sorted.slice(0, 15).reverse();

    const labels = top15.map(d => d.dataset);
    const values = top15.map(d => d.mean_improvement_pct);

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
                        label: (c) => {
                            const idx = c.dataIndex;
                            const d = top15[idx];
                            return [
                                `Mejora pareada: ${c.raw >= 0 ? '+' : ''}${formatNum(c.raw)}%`,
                                `Positivos: ${d.n_positive}/${d.n_total} (${formatNum(d.pct_positive)}%)`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Mejora Pareada Media (%)' },
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
 * 5. Relación Tamaño vs Mejora Pareada (desde adversaries_final)
 */
function renderSizeChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    if (!state.adversaries) {
        currentChart = new Chart(ctx, {
            type: 'scatter', data: { datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Datos de adversarios no disponibles' } } }
        });
        return;
    }

    // Construir índice de muestras por dataset desde results.json
    const samplesIndex = {};
    state.data.results.forEach(r => {
        if (r.samples && !samplesIndex[r.dataset]) {
            samplesIndex[r.dataset] = r.samples;
        }
    });

    // Agregar mejora pareada media por dataset desde aggregated_by_dataset
    const aggByDataset = {};
    state.adversaries.aggregated_by_dataset.forEach(row => {
        if (!aggByDataset[row.dataset]) aggByDataset[row.dataset] = [];
        aggByDataset[row.dataset].push(row.improvement_pct);
    });

    const scatterData = Object.entries(aggByDataset)
        .filter(([ds]) => samplesIndex[ds])
        .map(([dataset, imps]) => ({
            x: samplesIndex[dataset],
            y: imps.reduce((a, b) => a + b, 0) / imps.length,
            dataset
        }));

    if (scatterData.length === 0) {
        currentChart = new Chart(ctx, {
            type: 'scatter', data: { datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'No hay datos disponibles' } } }
        });
        return;
    }

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
                            `Mejora pareada: ${c.raw.y >= 0 ? '+' : ''}${formatNum(c.raw.y)}%`
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
                    title: { display: true, text: 'Mejora pareada media (%)' },
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
 * 6. Heatmap: Mejora Pareada por Dataset y Método (desde adversaries_final)
 */
function renderHeatmapChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    if (!state.adversaries) {
        currentChart = new Chart(ctx, {
            type: 'bubble', data: { datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Datos de adversarios no disponibles' } } }
        });
        return;
    }

    // Agregar mejora pareada por dataset × método desde aggregated_by_dataset
    // Promediar sobre los 3 clasificadores
    const methods = ['mdlp', 'equal_freq', 'equal_width', 'pki'];
    const methodLabels = { 'mdlp': 'MDLP', 'equal_freq': 'Igual Freq', 'equal_width': 'Igual Amp', 'pki': 'PKI' };
    const methodLabelsList = methods.map(m => methodLabels[m]);

    // Indexar: {dataset: {method: [improvement_pct, ...]}}
    const aggIndex = {};
    state.adversaries.aggregated_by_dataset.forEach(row => {
        if (!aggIndex[row.dataset]) aggIndex[row.dataset] = {};
        if (!aggIndex[row.dataset][row.discretization_method]) aggIndex[row.dataset][row.discretization_method] = [];
        aggIndex[row.dataset][row.discretization_method].push(row.improvement_pct);
    });

    const datasetList = Object.keys(aggIndex).sort();

    // Crear datos de burbujas
    const bubbleData = datasetList.flatMap((dataset, yIdx) =>
        methods.map((method, xIdx) => {
            const imps = aggIndex[dataset]?.[method];
            if (!imps || imps.length === 0) return null;
            const avgImp = imps.reduce((a, b) => a + b, 0) / imps.length;
            return {
                x: xIdx, y: yIdx, r: 8,
                value: avgImp, dataset, method: methodLabels[method]
            };
        }).filter(d => d !== null)
    );

    if (bubbleData.length === 0) {
        currentChart = new Chart(ctx, {
            type: 'bubble', data: { datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'No hay datos disponibles' } } }
        });
        return;
    }

    currentChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: bubbleData,
                backgroundColor: bubbleData.map(d => {
                    if (d.value > 0) {
                        const intensity = Math.min(Math.abs(d.value) / 10, 1);
                        const g = Math.round(204 * (0.5 + intensity * 0.5));
                        return `rgba(46, ${g}, 113, 0.7)`;
                    } else {
                        const intensity = Math.min(Math.abs(d.value) / 10, 1);
                        const r = Math.round(231 * (0.5 + intensity * 0.5));
                        return `rgba(${r}, 76, 60, 0.7)`;
                    }
                }),
                borderColor: bubbleData.map(d => d.value > 0 ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)'),
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
                            `Método: ${c.raw.method}`,
                            `Mejora pareada: ${c.raw.value >= 0 ? '+' : ''}${formatNum(c.raw.value)}%`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: -0.5, max: methods.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => methodLabelsList[Math.round(v)] || '',
                        font: { size: 12, weight: 'bold' },
                        autoSkip: false, maxRotation: 0
                    },
                    grid: { display: true, drawOnChartArea: false, drawTicks: true, tickLength: 8 },
                    title: { display: true, text: 'Método de Discretización', font: { size: 13, weight: 'bold' } },
                    afterBuildTicks: (axis) => { axis.ticks = methods.map((_, i) => ({ value: i })); }
                },
                y: {
                    min: -0.5, max: datasetList.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => datasetList[Math.round(v)] || '',
                        font: { size: 10 }, align: 'end'
                    },
                    title: { display: true, text: 'Datasets', font: { size: 13, weight: 'bold' } }
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
        { key: 'mdlp', label: 'MDLP' },
        { key: 'equal_freq', label: 'Igual Freq' },
        { key: 'equal_width', label: 'Igual Amp' },
        { key: 'pki', label: 'PKI' }
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
                            `Configuración: ${c.raw.config}`,
                            `Adversario: ${c.raw.adversary}`,
                            `Victorias Local: ${c.raw.wins}/${c.raw.total}`,
                            `Ratio: ${formatNum(c.raw.value)}%`
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
                    title: { display: true, text: 'Adversario', font: { weight: 'bold' } },
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
                    title: { display: true, text: 'Configuración', font: { weight: 'bold' } },
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
        { key: 'mdlp', label: 'MDLP' },
        { key: 'equal_freq', label: 'Igual Freq' },
        { key: 'equal_width', label: 'Igual Amp' },
        { key: 'pki', label: 'PKI' }
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
                        label: (c) => `${c.dataset.label}: ${formatNum(c.raw)}% victorias`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: '% Victorias de Local' },
                    ticks: { callback: (v) => formatNum(v) + '%' }
                },
                x: {
                    title: { display: true, text: 'Adversario' }
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
        { key: 'mdlp', label: 'MDLP' },
        { key: 'equal_freq', label: 'Igual Frecuencia' },
        { key: 'equal_width', label: 'Igual Amplitud' },
        { key: 'pki', label: 'PKI' }
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
                        label: (c) => `${c.dataset.label} vs ${c.label}: ${formatNum(c.raw)}% victorias`
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

/**
 * 10. Forest Plot: Tamaños de Efecto con IC 95%
 * Muestra el efecto de cada par clasificador-método con intervalos de confianza
 */
function renderEffectForestChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    if (!state.adversaries?.statistical_results) {
        currentChart = new Chart(ctx, {
            type: 'bar', data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Datos estadísticos no disponibles' } } }
        });
        return;
    }

    const results = state.adversaries.statistical_results;
    const entries = Object.entries(results).map(([key, val]) => ({
        label: `${val.classifier} vs ${discTypeLabels[val.discretization_method] || val.discretization_method}`,
        effect: val.effect_size.value,
        ciLower: val.effect_size.ci_lower,
        ciUpper: val.effect_size.ci_upper,
        interpretation: val.effect_size.interpretation,
        type: val.effect_size.type,
        pAdj: val.statistical_test.pvalue_adjusted,
        classifier: val.classifier
    }));

    // Ordenar por tamaño de efecto descendente
    entries.sort((a, b) => b.effect - a.effect);

    const labels = entries.map(e => e.label);
    const effectValues = entries.map(e => e.effect);
    const errorBarsLow = entries.map(e => e.effect - e.ciLower);
    const errorBarsHigh = entries.map(e => e.ciUpper - e.effect);

    // Colores por clasificador
    const clfColorMap = { 'TAN': chartColors.TAN, 'KDB': chartColors.KDB, 'AODE': chartColors.AODE };
    const bgColors = entries.map(e => clfColorMap[e.classifier]?.bg || 'rgba(128,128,128,0.7)');
    const borderClrs = entries.map(e => clfColorMap[e.classifier]?.border || 'rgb(128,128,128)');

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Tamaño de Efecto',
                data: effectValues,
                backgroundColor: bgColors,
                borderColor: borderClrs,
                borderWidth: 2,
                errorBars: { low: errorBarsLow, high: errorBarsHigh }
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
                        label: (c) => {
                            const e = entries[c.dataIndex];
                            return [
                                `Efecto: ${formatNum(e.effect, 3)} (${e.interpretation})`,
                                `IC 95%: [${formatNum(e.ciLower, 3)}, ${formatNum(e.ciUpper, 3)}]`,
                                `Tipo: ${e.type}`,
                                `p-ajustado: ${e.pAdj < 0.001 ? '<0,001' : formatNum(e.pAdj, 3)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tamaño de Efecto' },
                    grid: { color: (c) => c.tick.value === 0 ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }
                },
                y: {
                    ticks: { font: { size: 11 } }
                }
            }
        },
        plugins: [{
            id: 'errorBars',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const xScale = chart.scales.x;

                meta.data.forEach((bar, i) => {
                    const e = entries[i];
                    const xLow = xScale.getPixelForValue(e.ciLower);
                    const xHigh = xScale.getPixelForValue(e.ciUpper);
                    const yCenter = bar.y;

                    ctx.save();
                    ctx.strokeStyle = borderClrs[i];
                    ctx.lineWidth = 2;

                    // Línea horizontal del IC
                    ctx.beginPath();
                    ctx.moveTo(xLow, yCenter);
                    ctx.lineTo(xHigh, yCenter);
                    ctx.stroke();

                    // Caps
                    const capHeight = 6;
                    ctx.beginPath();
                    ctx.moveTo(xLow, yCenter - capHeight);
                    ctx.lineTo(xLow, yCenter + capHeight);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(xHigh, yCenter - capHeight);
                    ctx.lineTo(xHigh, yCenter + capHeight);
                    ctx.stroke();

                    ctx.restore();
                });
            }
        }]
    });
}

/**
 * 11. Grid de P-valores Ajustados (3 clf × 4 métodos)
 */
function renderPvalueGridChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    if (!state.adversaries?.statistical_results) {
        currentChart = new Chart(ctx, {
            type: 'bubble', data: { datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Datos estadísticos no disponibles' } } }
        });
        return;
    }

    const classifiers = ['TAN', 'KDB', 'AODE'];
    const methods = ['mdlp', 'equal_freq', 'equal_width', 'pki'];
    const methodLabels = ['MDLP', 'Igual Freq', 'Igual Amp', 'PKI'];
    const results = state.adversaries.statistical_results;

    const bubbleData = [];
    classifiers.forEach((clf, yIdx) => {
        methods.forEach((method, xIdx) => {
            const key = `${clf}_vs_${method}`;
            const entry = results[key];
            if (!entry) return;

            const pAdj = entry.statistical_test.pvalue_adjusted;
            const significant = pAdj < 0.05;
            // Tamaño inversamente proporcional al p-valor (mayor burbuja = más significativo)
            const radius = significant ? Math.max(8, 20 - pAdj * 100) : 8;

            bubbleData.push({
                x: xIdx, y: yIdx, r: radius,
                pAdj, significant,
                testName: entry.statistical_test.name,
                pRaw: entry.statistical_test.pvalue,
                effect: entry.effect_size.value,
                effectInterp: entry.effect_size.interpretation,
                classifier: clf, method: methodLabels[xIdx]
            });
        });
    });

    currentChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: bubbleData,
                backgroundColor: bubbleData.map(d =>
                    d.significant ? 'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.5)'
                ),
                borderColor: bubbleData.map(d =>
                    d.significant ? 'rgb(39, 174, 96)' : 'rgb(192, 57, 43)'
                ),
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
                        label: (c) => {
                            const d = c.raw;
                            return [
                                `${d.classifier} vs ${d.method}`,
                                `p-ajustado: ${d.pAdj < 0.001 ? '<0,001' : formatNum(d.pAdj, 4)}`,
                                `p-raw: ${formatNum(d.pRaw, 4)}`,
                                `Test: ${d.testName}`,
                                `Efecto: ${formatNum(d.effect, 3)} (${d.effectInterp})`,
                                d.significant ? 'SIGNIFICATIVO' : 'No significativo'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: -0.5, max: methods.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => methodLabels[Math.round(v)] || '',
                        font: { size: 12, weight: 'bold' }
                    },
                    title: { display: true, text: 'Método de Discretización', font: { weight: 'bold' } },
                    afterBuildTicks: (axis) => { axis.ticks = methods.map((_, i) => ({ value: i })); }
                },
                y: {
                    min: -0.5, max: classifiers.length - 0.5,
                    ticks: {
                        stepSize: 1,
                        callback: (v) => classifiers[Math.round(v)] || '',
                        font: { size: 12, weight: 'bold' }
                    },
                    title: { display: true, text: 'Clasificador', font: { weight: 'bold' } },
                    afterBuildTicks: (axis) => { axis.ticks = classifiers.map((_, i) => ({ value: i })); }
                }
            }
        },
        plugins: [{
            id: 'pvalueLabels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((bubble, i) => {
                    const d = chart.data.datasets[0].data[i];
                    ctx.save();
                    ctx.fillStyle = d.significant ? '#1a5e2e' : '#8b1a1a';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const pStr = d.pAdj < 0.001 ? '<0,001' : formatNum(d.pAdj, 3);
                    ctx.fillText(pStr, bubble.x, bubble.y);
                    ctx.restore();
                });
            }
        }]
    });
}

/**
 * 12. Escenarios Globales: 27 Datasets ordenados por Mejora Pareada
 */
function renderScenariosGlobalChart() {
    const ctx = document.getElementById('main-chart').getContext('2d');

    if (!state.adversaries) {
        currentChart = new Chart(ctx, {
            type: 'bar', data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Datos de adversarios no disponibles' } } }
        });
        return;
    }

    const patterns = state.adversaries.complementary_analysis?.global_patterns?.dataset_patterns;
    if (!patterns || patterns.length === 0) {
        currentChart = new Chart(ctx, {
            type: 'bar', data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'No hay dataset_patterns disponibles' } } }
        });
        return;
    }

    // Ordenar todos los 27 datasets por mejora
    const sorted = [...patterns].sort((a, b) => b.mean_improvement_pct - a.mean_improvement_pct);

    const labels = sorted.map(d => d.dataset);
    const values = sorted.map(d => d.mean_improvement_pct);

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
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (c) => {
                            const d = sorted[c.dataIndex];
                            return [
                                `Mejora pareada: ${c.raw >= 0 ? '+' : ''}${formatNum(c.raw)}%`,
                                `Positivos: ${d.n_positive}/${d.n_total} (${formatNum(d.pct_positive)}%)`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 90,
                        minRotation: 45,
                        font: { size: 10 }
                    }
                },
                y: {
                    title: { display: true, text: 'Mejora Pareada Media (%)' },
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
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = val >= 0 ? 'bottom' : 'top';
                    ctx.fillText(`${val >= 0 ? '+' : ''}${formatNum(val, 1)}`, bar.x, val >= 0 ? bar.y - 3 : bar.y + 3);
                    ctx.restore();
                });
            }
        }]
    });
}
