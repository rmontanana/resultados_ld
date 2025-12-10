/**
 * Aplicación de visualización de resultados de discretización local
 */

// Estado global de la aplicación (window.state para acceso desde charts.js)
window.state = {
    data: null,
    filteredData: [],
    currentPage: 1,
    pageSize: 50,
    sortColumn: 'accuracy',
    sortDirection: 'desc',
    filters: {
        search: '',
        iterations: 'all',
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
    const response = await fetch('data/results.json');
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    state.data = await response.json();
    console.log(`Datos cargados: ${state.data.results.length} resultados`);
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

    // Selector de iteraciones
    document.getElementById('filter-iterations').addEventListener('change', (e) => {
        state.filters.iterations = e.target.value;
        state.currentPage = 1;
        applyFilters();
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
    document.getElementById('filter-iterations').value = 'all';
    state.filters.iterations = 'all';

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

    state.filteredData = state.data.results.filter(r => {
        // Filtro de búsqueda
        if (state.filters.search && !r.dataset.toLowerCase().includes(state.filters.search)) {
            return false;
        }

        // Filtro de iteraciones
        if (state.filters.iterations !== 'all' && r.iterations !== state.filters.iterations) {
            return false;
        }

        // Filtro de puntos de corte
        if (!state.filters.cuts.includes(r.cuts)) {
            return false;
        }

        // Filtro de modelo base
        if (!state.filters.model_base.includes(r.model_base)) {
            return false;
        }

        // Filtro de tipo de discretización
        if (!state.filters.disc_type.includes(r.discretization_type)) {
            return false;
        }

        // Filtro solo mejoras
        if (state.filters.onlyImprovements) {
            if (r.discretization_type !== 'local' || !r.improvement_vs_base || r.improvement_vs_base <= 0) {
                return false;
            }
        }

        return true;
    });

    // Ordenar
    sortData();

    // Actualizar UI
    renderTable();
    updateStats();
    updatePagination();
}

function sortData() {
    const col = state.sortColumn;
    const dir = state.sortDirection === 'asc' ? 1 : -1;

    state.filteredData.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        // Manejar valores undefined
        if (valA === undefined) valA = col === 'improvement_vs_base' ? -999 : '';
        if (valB === undefined) valB = col === 'improvement_vs_base' ? -999 : '';

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
            <td class="num">${(r.accuracy * 100).toFixed(2)}%</td>
            <td class="num">${(r.std * 100).toFixed(2)}%</td>
            <td class="num">${formatImprovement(r.improvement_vs_base)}</td>
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
    return `<span class="improvement ${cls}">${sign}${value.toFixed(2)}%</span>`;
}

function updateStats() {
    const total = state.filteredData.length;
    document.getElementById('stat-total').textContent = total;

    if (total === 0) {
        document.getElementById('stat-avg-accuracy').textContent = '0%';
        document.getElementById('stat-improvements').textContent = '0';
        document.getElementById('stat-best-accuracy').textContent = '0%';
        return;
    }

    // Accuracy promedio
    const avgAccuracy = state.filteredData.reduce((sum, r) => sum + r.accuracy, 0) / total;
    document.getElementById('stat-avg-accuracy').textContent = (avgAccuracy * 100).toFixed(2) + '%';

    // Conteo de mejoras locales
    const improvements = state.filteredData.filter(r =>
        r.discretization_type === 'local' && r.improvement_vs_base > 0
    ).length;
    document.getElementById('stat-improvements').textContent = improvements;

    // Mejor accuracy
    const bestAccuracy = Math.max(...state.filteredData.map(r => r.accuracy));
    document.getElementById('stat-best-accuracy').textContent = (bestAccuracy * 100).toFixed(2) + '%';
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
        'Tipo Discretización', 'Accuracy', 'Std', 'Mejora vs Base',
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
        r.improvement_vs_base || '',
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
