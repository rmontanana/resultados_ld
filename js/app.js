/**
 * Aplicación de visualización de resultados de discretización local
 * Marco estadístico: comparaciones pareadas independientes (adversaries_final)
 */

// Función para formatear números con coma decimal
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals).replace('.', ',');
}

// ============== Gestión de Tema ==============
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
}
// ============================================

// Estado global de la aplicación (window.state para acceso desde charts.js)
window.state = {
    data: null,
    adversaries: null,
    filteredData: [],
    currentPage: 1,
    pageSize: 50,
    sortColumn: 'accuracy',
    sortDirection: 'desc',
    filters: {
        search: '',
        iterations: ['10it', '100it'],
        cuts: ['3p', '4p', '5p', 'up'],
        model_base: ['TAN', 'KDB', 'AODE'],
        disc_type: ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki'],
        onlyImprovements: false
    }
};

// Mapeo de tipos de discretización a badges
const discTypeBadges = {
    'local': 'badge-local',
    'mdlp': 'badge-mdlp',
    'equal_freq': 'badge-freq',
    'equal_width': 'badge-width',
    'pki': 'badge-pki',
    'base': 'badge-base'
};

const discTypeLabels = {
    'local': 'Local',
    'mdlp': 'MDLP',
    'equal_freq': 'Igual Freq',
    'equal_width': 'Igual Amp',
    'pki': 'PKI',
    'base': 'Base'
};

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        applyTheme(currentTheme);
        await loadData();
        setupEventListeners();
        applyFilters();
        // Inicializar gráficos después de cargar datos
        if (typeof initCharts === 'function') {
            initCharts();
        }
        hideLoading();
    } catch (error) {
        console.error('Error inicializando:', error);
        document.getElementById('loading').innerHTML = `
            <p style="color: var(--danger-color);">Error cargando datos: ${error.message}</p>
        `;
    }
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

    // Construir índice de comparaciones pareadas para lookups rápidos
    buildPairwiseIndex();

    console.log(`Datos cargados: ${state.data.results.length} resultados, ${state.adversaries.pairwise_comparisons.length} comparaciones pareadas`);
}

// Índice: "dataset|classifier|method|iterations|cuts" -> {improvement_pct, diff, ...}
let pairwiseIndex = {};

function buildPairwiseIndex() {
    pairwiseIndex = {};
    state.adversaries.pairwise_comparisons.forEach(row => {
        const key = `${row.dataset}|${row.classifier}|${row.discretization_method}|${row.iterations}|${row.cuts}`;
        pairwiseIndex[key] = row;
    });
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
    setTimeout(() => loading.style.display = 'none', 300);
}

function setupEventListeners() {
    // Búsqueda de dataset
    document.getElementById('search-dataset').addEventListener('input', (e) => {
        state.filters.search = e.target.value.toLowerCase();
        state.currentPage = 1;
        applyFilters();
    });

    // Checkboxes de iteraciones
    document.querySelectorAll('input[name="iterations"]').forEach(cb => {
        cb.addEventListener('change', () => {
            state.filters.iterations = getCheckedValues('iterations');
            state.currentPage = 1;
            applyFilters();
        });
    });

    // Checkboxes de puntos de corte
    document.querySelectorAll('input[name="cuts"]').forEach(cb => {
        cb.addEventListener('change', () => {
            state.filters.cuts = getCheckedValues('cuts');
            state.currentPage = 1;
            applyFilters();
        });
    });

    // Checkboxes de modelo base
    document.querySelectorAll('input[name="model_base"]').forEach(cb => {
        cb.addEventListener('change', () => {
            state.filters.model_base = getCheckedValues('model_base');
            state.currentPage = 1;
            applyFilters();
        });
    });

    // Checkboxes de tipo de discretización
    document.querySelectorAll('input[name="disc_type"]').forEach(cb => {
        cb.addEventListener('change', () => {
            state.filters.disc_type = getCheckedValues('disc_type');
            state.currentPage = 1;
            applyFilters();
        });
    });

    // Toggle solo mejoras
    document.getElementById('only-improvements').addEventListener('change', (e) => {
        state.filters.onlyImprovements = e.target.checked;
        state.currentPage = 1;
        applyFilters();
    });

    // Botón reset
    document.getElementById('reset-filters').addEventListener('click', resetFilters);

    // Ordenación de columnas
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (state.sortColumn === column) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortColumn = column;
                state.sortDirection = column === 'accuracy' ? 'desc' : 'asc';
            }
            updateSortIndicators();
            applyFilters();
        });
    });

    // Paginación
    document.getElementById('prev-page').addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderTable();
            updatePagination();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const maxPage = Math.ceil(state.filteredData.length / state.pageSize);
        if (state.currentPage < maxPage) {
            state.currentPage++;
            renderTable();
            updatePagination();
        }
    });

    // Exportar CSV
    document.getElementById('export-csv').addEventListener('click', exportCSV);

    // Toggle tema claro/oscuro
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(cb => cb.value);
}

function resetFilters() {
    // Resetear búsqueda
    document.getElementById('search-dataset').value = '';
    state.filters.search = '';

    // Resetear iteraciones
    document.querySelectorAll('input[name="iterations"]').forEach(cb => cb.checked = true);
    state.filters.iterations = ['10it', '100it'];

    // Marcar todos los checkboxes
    document.querySelectorAll('input[name="cuts"]').forEach(cb => cb.checked = true);
    document.querySelectorAll('input[name="model_base"]').forEach(cb => cb.checked = true);
    document.querySelectorAll('input[name="disc_type"]').forEach(cb => cb.checked = true);
    document.getElementById('only-improvements').checked = false;

    state.filters.cuts = ['3p', '4p', '5p', 'up'];
    state.filters.model_base = ['TAN', 'KDB', 'AODE'];
    state.filters.disc_type = ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki'];
    state.filters.onlyImprovements = false;

    state.currentPage = 1;
    applyFilters();
}

function applyFilters() {
    if (!state.data) return;

    // Filtrar por búsqueda, iteraciones, cortes, modelo base y discretización
    let interim = state.data.results.filter(r => {
        if (state.filters.search && !r.dataset.toLowerCase().includes(state.filters.search)) {
            return false;
        }
        if (!state.filters.iterations.includes(r.iterations)) {
            return false;
        }
        if (!state.filters.cuts.includes(r.cuts)) {
            return false;
        }
        if (!state.filters.model_base.includes(r.model_base)) {
            return false;
        }
        if (!state.filters.disc_type.includes(r.discretization_type)) {
            return false;
        }
        return true;
    });

    // Clonar para no mutar los datos originales
    interim = interim.map(r => ({ ...r }));

    // Enriquecer resultados locales con mejora pareada media desde adversaries.json
    enrichWithAdversarialImprovement(interim);

    // Aplicar filtro "solo mejoras" sobre los valores de mejora pareada
    if (state.filters.onlyImprovements) {
        interim = interim.filter(r =>
            r.discretization_type === 'local' &&
            r.paired_improvement !== undefined &&
            r.paired_improvement > 0
        );
    }

    state.filteredData = interim;

    // Ordenar
    sortData();

    // Actualizar UI
    renderTable();
    updateStats();
    updatePagination();
}

/**
 * Enriquece resultados locales con mejora pareada media.
 * Para cada resultado local (dataset, classifier, iterations, cuts),
 * busca TODAS las comparaciones pareadas contra cada adversario
 * y calcula la mejora media sobre todos ellos.
 */
function enrichWithAdversarialImprovement(list) {
    const adversaryMethods = ['mdlp', 'equal_freq', 'equal_width', 'pki'];

    list.forEach(r => {
        if (r.discretization_type !== 'local') return;

        const improvements = [];
        adversaryMethods.forEach(method => {
            const key = `${r.dataset}|${r.model_base}|${method}|${r.iterations}|${r.cuts}`;
            const pair = pairwiseIndex[key];
            if (pair) {
                improvements.push(pair.improvement_pct);
            }
        });

        if (improvements.length > 0) {
            r.paired_improvement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
            r.paired_n_adversaries = improvements.length;
        }
    });
}

function sortData() {
    const col = state.sortColumn;
    const dir = state.sortDirection === 'asc' ? 1 : -1;

    state.filteredData.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        // Manejar valores undefined
        if (valA === undefined) valA = col === 'paired_improvement' ? -999 : '';
        if (valB === undefined) valB = col === 'paired_improvement' ? -999 : '';

        // Comparar
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * dir;
        }
        return String(valA).localeCompare(String(valB)) * dir;
    });
}

function updateSortIndicators() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.sortColumn) {
            th.classList.add(state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

function renderTable() {
    const tbody = document.getElementById('results-body');
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageData = state.filteredData.slice(start, end);

    tbody.innerHTML = pageData.map(r => `
        <tr>
            <td>${r.dataset}</td>
            <td>${r.iterations}</td>
            <td>${r.cuts}</td>
            <td>${r.model}${r.best_in_group ? '<span class="best-indicator" title="Mejor en su grupo">★</span>' : ''}</td>
            <td><span class="badge ${discTypeBadges[r.discretization_type] || 'badge-base'}">${discTypeLabels[r.discretization_type] || r.discretization_type}</span></td>
            <td class="num">${formatNumber(r.accuracy * 100)}%</td>
            <td class="num">${formatNumber(r.std * 100)}%</td>
            <td class="num">${formatImprovement(r.paired_improvement)}</td>
            <td class="num">${r.samples || '-'}</td>
            <td class="num">${r.features || '-'}</td>
        </tr>
    `).join('');

    document.getElementById('results-count').textContent = `(${state.filteredData.length})`;
}

function formatImprovement(value) {
    if (value === undefined || value === null) {
        return '-';
    }
    const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
    const sign = value > 0 ? '+' : '';
    return `<span class="improvement ${cls}">${sign}${formatNumber(value)}%</span>`;
}

function updateStats() {
    const total = state.filteredData.length;
    document.getElementById('stat-total').textContent = total;

    if (total === 0) {
        document.getElementById('stat-avg-accuracy').textContent = '0%';
        document.getElementById('stat-improvements').textContent = '-';
        document.getElementById('stat-best-accuracy').textContent = '0%';
        return;
    }

    // Accuracy promedio
    const avgAccuracy = state.filteredData.reduce((sum, r) => sum + r.accuracy, 0) / total;
    document.getElementById('stat-avg-accuracy').textContent = formatNumber(avgAccuracy * 100) + '%';

    // Tasa de victoria: % de resultados locales con mejora pareada > 0
    const localResults = state.filteredData.filter(r =>
        r.discretization_type === 'local' && r.paired_improvement !== undefined
    );
    if (localResults.length > 0) {
        const wins = localResults.filter(r => r.paired_improvement > 0).length;
        const winRate = (wins / localResults.length * 100).toFixed(0);
        document.getElementById('stat-improvements').textContent = `${winRate}% (${wins}/${localResults.length})`;
    } else {
        document.getElementById('stat-improvements').textContent = '-';
    }

    // Mejor accuracy
    const bestAccuracy = Math.max(...state.filteredData.map(r => r.accuracy));
    document.getElementById('stat-best-accuracy').textContent = formatNumber(bestAccuracy * 100) + '%';
}

function updatePagination() {
    const total = state.filteredData.length;
    const maxPage = Math.max(1, Math.ceil(total / state.pageSize));

    document.getElementById('page-info').textContent = `Página ${state.currentPage} de ${maxPage}`;
    document.getElementById('prev-page').disabled = state.currentPage <= 1;
    document.getElementById('next-page').disabled = state.currentPage >= maxPage;
}

function exportCSV() {
    if (state.filteredData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = [
        'Dataset', 'Iteraciones', 'Cortes', 'Modelo', 'Modelo Base',
        'Tipo Discretización', 'Accuracy', 'Std', 'Mejora Pareada Media',
        'Muestras', 'Características', 'Clases', 'Mejor en Grupo'
    ];

    const rows = state.filteredData.map(r => [
        r.dataset,
        r.iterations,
        r.cuts,
        r.model,
        r.model_base,
        r.discretization_type,
        r.accuracy,
        r.std,
        r.paired_improvement !== undefined ? r.paired_improvement.toFixed(4) : '',
        r.samples || '',
        r.features || '',
        r.classes || '',
        r.best_in_group ? 'Sí' : 'No'
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(val =>
            typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultados_discretizacion_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}
