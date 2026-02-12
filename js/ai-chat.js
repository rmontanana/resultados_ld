/**
 * AI Chat - Lógica para consultar IA sobre los resultados experimentales
 *
 * Soporta dos modos de conexión:
 * 1. Ollama directo (localhost:11434) - Modelos locales gratuitos
 * 2. Copiar contexto para usar en claude.ai/chatgpt.com
 */

// Estado global
const state = {
    provider: 'copy',  // ollama o copy
    model: '',
    messages: [],
    resultsData: null,
    adversariesData: null,
    compactResults: { sizeBytes: null, content: null },
    compactAdversaries: { sizeBytes: null, content: null },
    includeContext: true,
    includeFullContext: false,
    isLoading: false,
    ollamaStatus: { available: false, models: [] }
};

// Configuración
const CONFIG = {
    OLLAMA_URL: 'http://localhost:11434',
    MAX_CONTEXT_RESULTS: 100
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadResultsData();
    await loadCompactFiles();
    setupEventListeners();
    await checkOllamaConnection();
    updateUI();
});

/**
 * Cargar datos de resultados y adversarios
 */
async function loadResultsData() {
    try {
        const [resultsResponse, adversariesResponse] = await Promise.all([
            fetch('data/results.json'),
            fetch('data/adversaries.json')
        ]);
        state.resultsData = await resultsResponse.json();
        state.adversariesData = await adversariesResponse.json();
        updateContextStats();
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Selección de proveedor
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.provider = e.target.value;
            updateUI();
        });
    });

    // Selección de modelo
    document.getElementById('model-select')?.addEventListener('change', (e) => {
        state.model = e.target.value;
    });

    // Toggle de contexto
    document.getElementById('include-context')?.addEventListener('change', (e) => {
        state.includeContext = e.target.checked;
    });

    // Toggle de contexto completo
    document.getElementById('include-full-context')?.addEventListener('change', (e) => {
        state.includeFullContext = e.target.checked;
        updateFullContextVisibility(e.target.checked);
        // Si se activa contexto completo, activar también el contexto básico
        if (e.target.checked) {
            state.includeContext = true;
            document.getElementById('include-context').checked = true;
        }
    });

    // Input de chat
    const chatInput = document.getElementById('chat-input');
    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize del textarea
    chatInput?.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });

    // Botón enviar
    document.getElementById('btn-send')?.addEventListener('click', sendMessage);

    // Botón limpiar chat
    document.getElementById('btn-clear')?.addEventListener('click', clearChat);

    // Botón copiar contexto
    document.getElementById('btn-copy-context')?.addEventListener('click', showCopyContextModal);

    // Preguntas de ejemplo
    document.querySelectorAll('.example-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const chatInput = document.getElementById('chat-input');
            chatInput.value = btn.textContent;
            chatInput.focus();
        });
    });

    // Modal de contexto
    document.getElementById('modal-close')?.addEventListener('click', hideModal);
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') hideModal();
    });
    document.getElementById('btn-copy-to-clipboard')?.addEventListener('click', copyToClipboard);

    // Modal de ayuda Ollama
    document.getElementById('ollama-help-close')?.addEventListener('click', hideOllamaHelpModal);
    document.getElementById('ollama-help-ok')?.addEventListener('click', hideOllamaHelpModal);
    document.getElementById('ollama-help-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'ollama-help-modal') hideOllamaHelpModal();
    });

    // Botones de copiar comando
    document.querySelectorAll('.btn-copy-cmd').forEach(btn => {
        btn.addEventListener('click', () => copyCommand(btn));
    });

    // Refresh status
    document.getElementById('btn-refresh-status')?.addEventListener('click', checkOllamaConnection);
}

/**
 * Verificar conexión con Ollama
 */
async function checkOllamaConnection() {
    updateOllamaStatus('checking');

    try {
        const response = await fetch(`${CONFIG.OLLAMA_URL}/api/tags`, {
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const data = await response.json();
            state.ollamaStatus = {
                available: true,
                models: data.models?.map(m => ({ id: m.name, name: m.name })) || []
            };
            updateModelSelect();
        } else {
            state.ollamaStatus = { available: false, models: [], reason: `Error ${response.status}` };
        }
    } catch (error) {
        let reason = 'No se puede conectar';
        if (error.name === 'TimeoutError') {
            reason = 'Tiempo de espera agotado';
        } else if (error.message.includes('Failed to fetch')) {
            reason = 'Ollama no está corriendo';
        }
        state.ollamaStatus = { available: false, models: [], reason };
    }

    updateUI();
}

/**
 * Actualizar UI según el estado
 */
function updateUI() {
    // Actualizar estado de Ollama
    const ollamaIndicator = document.querySelector('#provider-ollama .status-indicator');
    if (ollamaIndicator) {
        if (state.ollamaStatus.available) {
            ollamaIndicator.className = 'status-indicator connected';
            ollamaIndicator.innerHTML = `<span class="status-dot"></span>${state.ollamaStatus.models.length} modelos`;
            ollamaIndicator.onclick = null;
            ollamaIndicator.title = '';
        } else {
            ollamaIndicator.className = 'status-indicator disconnected';
            ollamaIndicator.innerHTML = `<span class="status-dot"></span>${state.ollamaStatus.reason || 'No disponible'}`;
            ollamaIndicator.onclick = showOllamaHelpModal;
            ollamaIndicator.title = 'Clic para ver instrucciones';
        }
    }

    // Actualizar selección visual
    document.querySelectorAll('.provider-option').forEach(opt => {
        const radio = opt.querySelector('input[type="radio"]');
        opt.classList.toggle('selected', radio.checked);
    });

    // Mostrar/ocultar selector de modelo según proveedor
    const modelWrapper = document.getElementById('model-select-wrapper');
    if (state.provider === 'copy') {
        modelWrapper.style.display = 'none';
    } else {
        modelWrapper.style.display = 'block';
    }

    // Actualizar placeholder del input
    const chatInput = document.getElementById('chat-input');
    if (state.provider === 'copy') {
        chatInput.placeholder = 'Escribe tu pregunta y usa el botón "Copiar contexto"...';
    } else {
        chatInput.placeholder = 'Escribe tu pregunta sobre los resultados...';
    }

    // Habilitar/deshabilitar botón enviar
    const btnSend = document.getElementById('btn-send');
    const canSend = state.provider === 'copy' || (state.provider === 'ollama' && state.ollamaStatus.available && state.model);
    btnSend.disabled = !canSend || state.isLoading;

    updateFullContextInfo();
}

/**
 * Actualizar indicador de Ollama durante verificación
 */
function updateOllamaStatus(status) {
    const indicator = document.querySelector('#provider-ollama .status-indicator');
    if (indicator && status === 'checking') {
        indicator.className = 'status-indicator checking';
        indicator.innerHTML = '<span class="status-dot"></span>Verificando...';
    }
}

/**
 * Actualizar selector de modelos
 */
function updateModelSelect() {
    const select = document.getElementById('model-select');
    if (!select) return;

    select.innerHTML = '';

    if (state.ollamaStatus.models.length > 0) {
        state.ollamaStatus.models.forEach((m, index) => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            select.appendChild(option);
        });
        // Seleccionar el primer modelo por defecto
        state.model = state.ollamaStatus.models[0].id;
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay modelos disponibles';
        option.disabled = true;
        select.appendChild(option);
    }
}

/**
 * Actualizar estadísticas del contexto
 */
function updateContextStats() {
    if (!state.resultsData) return;

    const totalResults = document.getElementById('context-total-results');
    const totalDatasets = document.getElementById('context-total-datasets');

    if (totalResults) {
        totalResults.textContent = state.resultsData.metadata?.total_results || 0;
    }
    if (totalDatasets) {
        totalDatasets.textContent = state.resultsData.metadata?.datasets || 0;
    }
}

/**
 * Cargar archivos compactos con resultados y análisis estadístico
 */
async function loadCompactFiles() {
    const files = [
        { key: 'compactResults', url: 'data/results_compact.txt' },
        { key: 'compactAdversaries', url: 'data/adversaries_compact.txt' }
    ];

    const fetches = files.map(async ({ key, url }) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();
            state[key] = { sizeBytes: new Blob([content]).size, content };
        } catch (error) {
            console.error(`No se pudo cargar ${url}:`, error);
            state[key] = { sizeBytes: null, content: null, error: error.message };
        }
    });

    await Promise.all(fetches);
    updateFullContextInfo();
}

/**
 * Actualizar texto informativo sobre el contexto completo
 */
function updateFullContextInfo() {
    const sizeEl = document.getElementById('full-context-size');
    const tokensEl = document.getElementById('full-context-tokens');

    const sizeResults = state.compactResults?.sizeBytes || 0;
    const sizeAdv = state.compactAdversaries?.sizeBytes || 0;
    const totalBytes = sizeResults + sizeAdv;

    if (totalBytes > 0) {
        const estimatedTokens = Math.ceil(totalBytes / 4);
        if (sizeEl) sizeEl.textContent = formatBytes(totalBytes);
        if (tokensEl) tokensEl.textContent = `~${(estimatedTokens/1000).toFixed(0)}K tokens`;
    } else {
        const hasError = state.compactResults?.error || state.compactAdversaries?.error;
        if (sizeEl) sizeEl.textContent = hasError ? 'Error' : '...';
        if (tokensEl) tokensEl.textContent = '...';
    }
}

function updateFullContextVisibility(isChecked) {
    const warning = document.getElementById('context-warning');
    if (warning) {
        warning.style.display = isChecked ? 'block' : 'none';
    }
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000; // evitar call stack grande
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

function formatBytes(bytes) {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Enviar mensaje
 */
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (!message || state.isLoading) return;

    // Si es modo copiar, mostrar modal
    if (state.provider === 'copy') {
        showCopyContextModal();
        return;
    }

    // Verificar que Ollama está disponible
    if (!state.ollamaStatus.available) {
        addErrorMessage('Ollama no está disponible. Verifica que está corriendo en localhost:11434');
        return;
    }

    if (!state.model) {
        addErrorMessage('Selecciona un modelo de Ollama');
        return;
    }

    // Añadir mensaje del usuario
    state.messages.push({ role: 'user', content: message });
    renderMessages();
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Mostrar indicador de carga
    state.isLoading = true;
    updateUI();
    showTypingIndicator();

    try {
        const response = await sendToOllama(message);

        hideTypingIndicator();

        if (response.error) {
            addErrorMessage(response.error);
        } else {
            state.messages.push({ role: 'assistant', content: response.content });
            renderMessages();
        }
    } catch (error) {
        hideTypingIndicator();
        addErrorMessage(`Error de conexión: ${error.message}`);
    }

    state.isLoading = false;
    updateUI();
    scrollToBottom();
}

/**
 * Enviar mensaje a Ollama
 */
async function sendToOllama(message) {
    const systemPrompt = buildSystemPrompt();

    // Construir historial de mensajes para Ollama
    const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...state.messages
    ];

    try {
        const response = await fetch(`${CONFIG.OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: state.model,
                messages: ollamaMessages,
                stream: false
            })
        });

        if (!response.ok) {
            return { error: `Error de Ollama: ${response.status} ${response.statusText}` };
        }

        const data = await response.json();

        if (data.message && data.message.content) {
            return { content: data.message.content };
        } else if (data.error) {
            return { error: `Error de Ollama: ${data.error}` };
        } else {
            return { error: 'Respuesta inesperada de Ollama. Verifica que el modelo está disponible.' };
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            return { error: 'No se puede conectar a Ollama. Asegúrate de que está corriendo.' };
        }
        return { error: `Error: ${error.message}` };
    }
}

/**
 * Construir prompt del sistema
 */
function buildSystemPrompt() {
    let prompt = `Eres un asistente experto en análisis de datos de experimentos de Machine Learning.

Estás analizando resultados de experimentos que comparan técnicas de discretización en clasificadores bayesianos:
- Clasificadores base: TAN, KDB, AODE (con discretización a priori)
- Variantes con discretización local: TANLd, KDBLd, AODELd (propuesta iterativa)
- Métodos de discretización base (adversarios): MDLP, Equal Frequency (bin-q), Equal Width (bin-u), PKI

Los experimentos evalúan:
- 27 datasets diferentes
- Configuraciones con 10 y 100 iteraciones máximas
- Puntos de corte: 3, 4, 5 e ilimitado
- Métrica principal: Accuracy (validación cruzada estratificada 5-fold, 3 repeticiones)

Marco estadístico: Comparaciones pareadas independientes. Cada clasificador local se compara contra cada método base por separado (3 clasificadores × 4 métodos = 12 adversarios), con N=27 observaciones por adversario, tests de Wilcoxon/t-test, tamaños de efecto (rank-biserial/Cohen's d) y corrección de Holm-Bonferroni.

Tu rol es ayudar a interpretar los resultados, identificar patrones, comparar rendimientos
y responder preguntas sobre los experimentos de forma clara y concisa en español.`;

    if (state.includeContext) {
        prompt += `\n\nDatos del contexto actual:\n${buildContext()}`;
    }

    return prompt;
}

/**
 * Construir contexto con datos relevantes
 */
function buildContext() {
    if (!state.resultsData) return '';

    const results = state.resultsData.results || [];
    const metadata = state.resultsData.metadata || {};
    const adv = state.adversariesData;

    // Resumen estadístico
    let context = `RESUMEN DE DATOS:
- Total de resultados: ${metadata.total_results}
- Datasets evaluados: ${metadata.datasets}
- Modelos distintos: ${metadata.models}
- Opciones de iteraciones: ${metadata.iterations_options?.join(', ')}
- Opciones de puntos de corte: ${metadata.cuts_options?.join(', ')}

`;

    // Mejores resultados por modelo base
    context += 'MEJORES RESULTADOS POR MODELO BASE:\n';
    ['TAN', 'KDB', 'AODE'].forEach(base => {
        const baseResults = results.filter(r => r.model_base === base);
        const best = baseResults.reduce((a, b) => a.accuracy > b.accuracy ? a : b, { accuracy: 0 });
        if (best.accuracy > 0) {
            context += `- ${base}: ${(best.accuracy * 100).toFixed(2)}% (${best.model} en ${best.dataset})\n`;
        }
    });

    // Resumen de comparaciones pareadas (desde adversaries_final)
    if (adv) {
        const profile = adv.integrated_profile;
        if (profile) {
            context += `\nRESUMEN GLOBAL DE COMPARACIONES PAREADAS:
- Marco estadístico: Comparaciones pareadas independientes (3 clf × 4 métodos = 12 adversarios)
- N = 27 datasets por adversario
- Total victorias Local: ${profile.total_wins || '-'} / Total derrotas: ${profile.total_losses || '-'}
- % victorias: ${profile.pct_wins?.toFixed(1) || '-'}%
`;
        }

        // Resultados estadísticos por adversario
        if (adv.statistical_results) {
            context += '\nRESULTADOS ESTADÍSTICOS POR ADVERSARIO:\n';
            Object.entries(adv.statistical_results).forEach(([key, val]) => {
                const sig = val.statistical_test.pvalue_adjusted < 0.05 ? 'SIG' : 'n.s.';
                context += `- ${val.classifier} vs ${val.discretization_method}: media=${val.mean_improvement_pct.toFixed(2)}%, `;
                context += `p-adj=${val.statistical_test.pvalue_adjusted < 0.001 ? '<0.001' : val.statistical_test.pvalue_adjusted.toFixed(3)}, `;
                context += `efecto=${val.effect_size.value.toFixed(3)} (${val.effect_size.interpretation}), ${sig}\n`;
            });
        }

        // Top 5 datasets con mayor mejora pareada
        const patterns = adv.complementary_analysis?.global_patterns?.dataset_patterns;
        if (patterns) {
            const sorted = [...patterns].sort((a, b) => b.mean_improvement_pct - a.mean_improvement_pct);
            context += '\nTOP 5 DATASETS CON MAYOR MEJORA PAREADA:\n';
            sorted.slice(0, 5).forEach((d, i) => {
                context += `${i+1}. ${d.dataset}: ${d.mean_improvement_pct > 0 ? '+' : ''}${d.mean_improvement_pct.toFixed(2)}% (${d.n_positive}/${d.n_total} positivos)\n`;
            });

            context += '\nTOP 5 DATASETS CON PEOR RESULTADO:\n';
            sorted.slice(-5).reverse().forEach((d, i) => {
                context += `${i+1}. ${d.dataset}: ${d.mean_improvement_pct.toFixed(2)}% (${d.n_positive}/${d.n_total} positivos)\n`;
            });
        }
    }

    // Resultados detallados y análisis estadístico completo
    if (state.includeFullContext) {
        if (state.compactResults?.content) {
            context += '\n' + state.compactResults.content;
        }
        if (state.compactAdversaries?.content) {
            context += '\n' + state.compactAdversaries.content;
        }
    } else {
        // Contexto resumido: muestra de resultados
        context += '\nMUESTRA DE RESULTADOS DETALLADOS:\n';
        const sample = results.slice(0, CONFIG.MAX_CONTEXT_RESULTS);
        sample.forEach(r => {
            context += `- ${r.dataset} | ${r.model} | ${r.iterations}/${r.cuts} | Acc: ${(r.accuracy*100).toFixed(2)}%\n`;
        });
    }

    return context;
}

/**
 * Renderizar mensajes en el chat
 */
function renderMessages() {
    const container = document.getElementById('chat-messages');

    if (state.messages.length === 0) {
        container.innerHTML = `
            <div class="welcome-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="10" r="1"/>
                    <circle cx="8" cy="10" r="1"/>
                    <circle cx="16" cy="10" r="1"/>
                </svg>
                <h3>Pregunta sobre los resultados</h3>
                <p>Puedo ayudarte a analizar los experimentos de discretización local en clasificadores bayesianos.</p>
                <div class="example-questions">
                    <button class="example-question">¿Qué modelo tiene mejor accuracy?</button>
                    <button class="example-question">¿En qué datasets mejora la discretización local?</button>
                    <button class="example-question">Compara TAN vs KDB</button>
                    <button class="example-question">¿Influyen las iteraciones en el resultado?</button>
                </div>
            </div>
        `;

        // Re-attach event listeners para preguntas de ejemplo
        container.querySelectorAll('.example-question').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('chat-input').value = btn.textContent;
                document.getElementById('chat-input').focus();
            });
        });
        return;
    }

    container.innerHTML = state.messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-avatar">
                ${msg.role === 'user' ? `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                ` : `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                        <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                `}
            </div>
            <div class="message-content">${formatMessage(msg.content)}</div>
        </div>
    `).join('');

    scrollToBottom();
}

/**
 * Formatear mensaje con markdown básico
 */
function formatMessage(content) {
    // Escapar HTML
    let formatted = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Código en bloque
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Código inline
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negrita
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Cursiva
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Listas
    formatted = formatted.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Párrafos
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = `<p>${formatted}</p>`;

    // Limpiar párrafos vacíos
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');

    return formatted;
}

/**
 * Mostrar indicador de escritura
 */
function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'message assistant';
    indicator.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                <path d="M12 16v-4M12 8h.01"/>
            </svg>
        </div>
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    container.appendChild(indicator);
    scrollToBottom();
}

/**
 * Ocultar indicador de escritura
 */
function hideTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
}

/**
 * Añadir mensaje de error
 */
function addErrorMessage(error) {
    const container = document.getElementById('chat-messages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = error;
    container.appendChild(errorDiv);
    scrollToBottom();
}

/**
 * Scroll al final del chat
 */
function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
}

/**
 * Limpiar chat
 */
function clearChat() {
    state.messages = [];
    renderMessages();
}

/**
 * Mostrar modal para copiar contexto
 */
function showCopyContextModal() {
    const modal = document.getElementById('modal-overlay');
    const textarea = document.getElementById('context-textarea');
    const chatInput = document.getElementById('chat-input');

    const userQuestion = chatInput.value.trim() || '[Escribe aquí tu pregunta]';

    const fullPrompt = `${buildSystemPrompt()}

---

Mi pregunta es: ${userQuestion}`;

    textarea.value = fullPrompt;
    modal.classList.add('active');
}

/**
 * Ocultar modal
 */
function hideModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

/**
 * Copiar al portapapeles
 */
async function copyToClipboard() {
    const textarea = document.getElementById('context-textarea');
    try {
        await navigator.clipboard.writeText(textarea.value);
        const btn = document.getElementById('btn-copy-to-clipboard');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ¡Copiado!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    } catch (error) {
        // Fallback para navegadores antiguos
        textarea.select();
        document.execCommand('copy');
    }
}

/**
 * Mostrar modal de ayuda de Ollama
 */
function showOllamaHelpModal() {
    document.getElementById('ollama-help-modal').classList.add('active');
}

/**
 * Ocultar modal de ayuda de Ollama
 */
function hideOllamaHelpModal() {
    document.getElementById('ollama-help-modal').classList.remove('active');
}

/**
 * Copiar comando al portapapeles
 */
async function copyCommand(btn) {
    const cmd = btn.dataset.cmd;
    try {
        await navigator.clipboard.writeText(cmd);
        btn.classList.add('copied');
        const originalSvg = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalSvg;
        }, 1500);
    } catch (error) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = cmd;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}
