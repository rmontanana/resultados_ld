/**
 * Vista de comparación por dataset
 */

// Función para formatear números con coma decimal
function formatNum(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals).replace('.', ',');
}

// Aplicar tema guardado en localStorage
function applyStoredTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

// Estado de la aplicación
const compareState = {
    data: null,
    iterations: '10it',
    discretizer: 'mdlp',
    cuts: '3p',
    pkiVariant: 'sqrt'  // sqrt o log para PKI
};

// Inicialización
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        applyStoredTheme();
        await loadData();
        setupEventListeners();
        renderTable();
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
    compareState.data = await response.json();
    console.log(`Datos cargados: ${compareState.data.results.length} resultados`);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
    setTimeout(() => loading.style.display = 'none', 300);
}

function setupEventListeners() {
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
        if (compareState.discretizer === 'pki') {
            // Para PKI, el valor es sqrt o log
            compareState.pkiVariant = e.target.value;
            compareState.cuts = 'up';  // Siempre 'up' para PKI
        } else {
            compareState.cuts = e.target.value;
        }
        renderTable();
    });
}

/**
 * Actualiza las opciones de puntos de corte según el discretizador
 */
function updateCutsOptions() {
    const cutsSelect = document.getElementById('filter-cuts');
    const discretizer = compareState.discretizer;

    if (discretizer === 'pki') {
        // PKI tiene variantes sqrt/log en lugar de puntos de corte
        cutsSelect.innerHTML = `
            <option value="sqrt">PKI sqrt</option>
            <option value="log">PKI log</option>
        `;
        compareState.cuts = 'up';  // PKI siempre usa carpeta 'up'
        compareState.pkiVariant = 'sqrt';
    } else if (discretizer === 'mdlp') {
        // MDLP tiene 3, 4, 5 e ilimitado
        cutsSelect.innerHTML = `
            <option value="3p">3 puntos</option>
            <option value="4p">4 puntos</option>
            <option value="5p">5 puntos</option>
            <option value="up">Ilimitado</option>
        `;
        compareState.cuts = '3p';
    } else {
        // equal_freq y equal_width solo tienen 3, 4, 5 (no ilimitado)
        cutsSelect.innerHTML = `
            <option value="3p">3 puntos</option>
            <option value="4p">4 puntos</option>
            <option value="5p">5 puntos</option>
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
 * - PKI: TAN-pkisqrt, TAN-pkilog
 */
function getBaseModelName(classifier) {
    const discretizer = compareState.discretizer;
    const cuts = compareState.cuts;

    if (discretizer === 'pki') {
        // PKI: TAN-pkisqrt o TAN-pkilog
        return `${classifier}-pki${compareState.pkiVariant}`;
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
