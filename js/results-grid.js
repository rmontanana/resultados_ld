/**
 * Grid de resultados completo
 */

// Formatear números con coma decimal
function formatNum(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals).replace('.', ',');
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
}

// Estado de la aplicación
const gridState = {
    data: null,
    filters: {
        iterations: ['10it', '100it'],
        model: ['TAN', 'KDB', 'AODE'],
        discretizer: ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki-sqrt', 'pki-log'],
        cuts: ['3p', '4p', '5p', 'up']
    },
    sortMode: 'best-desc' // 'best-desc', 'best-asc', 'alpha-asc', 'alpha-desc'
};

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        applyTheme(currentTheme);
        await loadData();
        setupEventListeners();
        renderGrid();
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
    gridState.data = await response.json();
    console.log(`Datos cargados: ${gridState.data.results.length} resultados`);
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

    // Checkboxes de filtros
    ['iterations', 'model', 'discretizer', 'cuts'].forEach(filterType => {
        document.querySelectorAll(`input[name="${filterType}"]`).forEach(cb => {
            cb.addEventListener('change', () => {
                gridState.filters[filterType] = getCheckedValues(filterType);
                renderGrid();
            });
        });
    });

    // Botones de ordenación
    document.getElementById('sort-best-desc').addEventListener('click', () => setSortMode('best-desc'));
    document.getElementById('sort-best-asc').addEventListener('click', () => setSortMode('best-asc'));
    document.getElementById('sort-alpha-asc').addEventListener('click', () => setSortMode('alpha-asc'));
    document.getElementById('sort-alpha-desc').addEventListener('click', () => setSortMode('alpha-desc'));
}

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(cb => cb.value);
}

function setSortMode(mode) {
    gridState.sortMode = mode;
    // Actualizar botones activos
    document.querySelectorAll('.btn-sort').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`sort-${mode}`).classList.add('active');
    renderGrid();
}

function renderGrid() {
    const columns = getFilteredColumns();
    const datasets = getUniqueDatasets();

    // Renderizar headers
    renderHeaders(columns);

    // Renderizar filas
    renderRows(datasets, columns);

    // Actualizar info
    updateInfo(columns.length, datasets.length);
}

function getFilteredColumns() {
    const columns = [];

    // Generar todas las combinaciones posibles
    gridState.filters.iterations.forEach(iter => {
        gridState.filters.model.forEach(model => {
            gridState.filters.discretizer.forEach(disc => {
                gridState.filters.cuts.forEach(cut => {
                    // Validar combinaciones válidas
                    // Equal_freq y equal_width solo con 3p, 4p, 5p (no 'up')
                    if ((disc === 'equal_freq' || disc === 'equal_width') && cut === 'up') {
                        return; // Skip esta combinación
                    }

                    // PKI-sqrt y PKI-log solo con 'up' (ilimitado)
                    if ((disc === 'pki-sqrt' || disc === 'pki-log') && cut !== 'up') {
                        return; // Skip esta combinación
                    }

                    const columnLabel = {
                        iter,
                        model,
                        disc,
                        cut,
                        id: `${iter}_${model}_${disc}_${cut}`,
                        fullName: `${iter}-${model}-${disc}-${cut}`
                    };

                    // Solo añadir si tiene al menos un resultado
                    if (columnHasData(columnLabel)) {
                        columns.push(columnLabel);
                    }
                });
            });
        });
    });

    // Ordenar columnas según modo
    sortColumns(columns);

    return columns;
}

// Verificar si una columna tiene al menos un resultado
function columnHasData(col) {
    const datasets = getUniqueDatasets();
    return datasets.some(dataset => {
        const result = findResult(dataset, col.iter, col.model, col.disc, col.cut);
        return result !== undefined;
    });
}

function sortColumns(columns) {
    // Calcular promedio de accuracy para cada columna
    columns.forEach(col => {
        const values = getColumnValues(col);
        const validValues = values.filter(v => v !== null);
        col.avgAccuracy = validValues.length > 0
            ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length
            : 0;
    });

    // Ordenar según el modo
    switch (gridState.sortMode) {
        case 'best-desc':
            columns.sort((a, b) => b.avgAccuracy - a.avgAccuracy);
            break;
        case 'best-asc':
            columns.sort((a, b) => a.avgAccuracy - b.avgAccuracy);
            break;
        case 'alpha-asc':
            columns.sort((a, b) => a.fullName.localeCompare(b.fullName));
            break;
        case 'alpha-desc':
            columns.sort((a, b) => b.fullName.localeCompare(a.fullName));
            break;
    }
}

function getColumnValues(col) {
    const datasets = getUniqueDatasets();
    return datasets.map(dataset => {
        const result = findResult(dataset, col.iter, col.model, col.disc, col.cut);
        return result ? result.accuracy : null;
    });
}

function getUniqueDatasets() {
    return [...new Set(gridState.data.results.map(r => r.dataset))].sort();
}

function findResult(dataset, iter, model, disc, cut) {
    // Buscar el resultado específico
    return gridState.data.results.find(r => {
        // Determinar el modelo real según el discretizador
        let targetModel = getTargetModel(model, disc, cut);

        return r.dataset === dataset &&
               r.iterations === iter &&
               r.model === targetModel &&
               r.cuts === cut;
    });
}

function getTargetModel(baseModel, disc, cut) {
    // Construir el nombre del modelo según el discretizador
    if (disc === 'local') {
        return `${baseModel}Ld`;
    } else if (disc === 'mdlp') {
        if (cut === 'up') return `${baseModel}-mdlp`;
        const cutNum = cut.replace('p', '');
        return `${baseModel}-mdlp${cutNum}`;
    } else if (disc === 'equal_freq') {
        // Igual frecuencia usa 'binXq' (q = equal freq)
        const cutNum = cut.replace('p', '');
        return `${baseModel}-bin${cutNum}q`;
    } else if (disc === 'equal_width') {
        // Igual amplitud usa 'binXu' (u = equal width)
        const cutNum = cut.replace('p', '');
        return `${baseModel}-bin${cutNum}u`;
    } else if (disc === 'pki-sqrt') {
        return `${baseModel}-pkisqrt`;
    } else if (disc === 'pki-log') {
        return `${baseModel}-pkilog`;
    }
    return baseModel;
}

function renderHeaders(columns) {
    const headerRow = document.getElementById('header-row');

    // Limpiar headers excepto el primero (Dataset)
    while (headerRow.children.length > 1) {
        headerRow.removeChild(headerRow.lastChild);
    }

    // Añadir headers de columnas
    columns.forEach(col => {
        const th = document.createElement('th');
        th.innerHTML = `
            <div class="col-header">
                <span class="col-header-main">${col.iter} · ${col.model}</span>
                <span class="col-header-sub">${getDiscLabel(col.disc)} · ${col.cut}</span>
            </div>
        `;
        headerRow.appendChild(th);
    });
}

function getDiscLabel(disc) {
    const labels = {
        'local': 'Local',
        'mdlp': 'MDLP',
        'equal_freq': 'Igual Freq',
        'equal_width': 'Igual Amp',
        'pki-sqrt': 'PKI-sqrt',
        'pki-log': 'PKI-log'
    };
    return labels[disc] || disc;
}

function renderRows(datasets, columns) {
    const tbody = document.getElementById('grid-body');
    tbody.innerHTML = '';

    datasets.forEach(dataset => {
        const tr = document.createElement('tr');

        // Columna fija: Dataset
        const tdDataset = document.createElement('td');
        tdDataset.className = 'fixed-col';
        tdDataset.textContent = dataset;
        tr.appendChild(tdDataset);

        // Columnas de datos
        columns.forEach(col => {
            const td = document.createElement('td');
            const result = findResult(dataset, col.iter, col.model, col.disc, col.cut);

            if (result) {
                const accuracy = result.accuracy * 100;
                td.innerHTML = `<span class="cell-value">${formatNum(accuracy)}</span>`;
                td.title = `${dataset} - ${col.fullName}\nAccuracy: ${formatNum(accuracy)}%`;
            } else {
                td.innerHTML = '<span class="cell-empty">-</span>';
                td.className = 'cell-empty';
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    // Añadir fila de totales
    renderTotalsRow(tbody, columns);

    // Luego marcar mejores valores por fila (excluyendo totales)
    highlightBestValues(tbody);
}

function highlightBestValues(tbody) {
    // Obtener todas las filas excepto la de totales usando selector CSS
    const dataRows = tbody.querySelectorAll('tr:not(.totals-row)');

    dataRows.forEach(row => {
        // Obtener todas las celdas de datos (excluir la columna fija del dataset)
        const dataCells = Array.from(row.querySelectorAll('td:not(.fixed-col)'));

        // Limpiar clases previas de todas las celdas
        dataCells.forEach(cell => cell.classList.remove('cell-best'));

        // Extraer valores numéricos de cada celda
        const cellValues = dataCells.map(cell => {
            const valueSpan = cell.querySelector('.cell-value');
            if (!valueSpan) return null;

            const text = valueSpan.textContent.trim();
            const num = parseFloat(text.replace(',', '.'));
            return isNaN(num) ? null : num;
        });

        // Encontrar el valor máximo
        const validValues = cellValues.filter(v => v !== null);
        if (validValues.length === 0) return; // Si no hay valores válidos, saltar esta fila

        const maxValue = Math.max(...validValues);

        // Marcar las celdas que tienen el valor máximo
        cellValues.forEach((value, index) => {
            if (value === maxValue) {
                dataCells[index].classList.add('cell-best');
            }
        });
    });
}

function renderTotalsRow(tbody, columns) {
    const tr = document.createElement('tr');
    tr.className = 'totals-row';

    // Primera columna: etiqueta "Media"
    const tdLabel = document.createElement('td');
    tdLabel.className = 'fixed-col';
    tdLabel.textContent = 'Media';
    tr.appendChild(tdLabel);

    // Para cada columna, calcular y mostrar la media
    columns.forEach(col => {
        const td = document.createElement('td');
        const values = getColumnValues(col);
        const validValues = values.filter(v => v !== null);

        if (validValues.length > 0) {
            const avg = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
            const avgPercent = avg * 100;
            td.textContent = formatNum(avgPercent);
            td.title = `Media de ${validValues.length} datasets`;
        } else {
            td.textContent = '-';
        }

        tr.appendChild(td);
    });

    tbody.appendChild(tr);
}

function updateInfo(numColumns, numDatasets) {
    document.getElementById('column-count').textContent = `${numColumns} columnas mostradas`;
    document.getElementById('dataset-count').textContent = `${numDatasets} datasets`;
}
