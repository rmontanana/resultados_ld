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
    fullContextData: { sizeBytes: null, content: null, tokens: null },
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
    await loadFullContextFile();
    setupEventListeners();
    await checkOllamaConnection();
    updateUI();
});

/**
 * Cargar datos de resultados
 */
async function loadResultsData() {
    try {
        const response = await fetch('data/results.json');
        state.resultsData = await response.json();
        updateContextStats();
    } catch (error) {
        console.error('Error cargando resultados:', error);
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

    document.addEventListener('langchange', () => {
        updateUI();
        renderMessages();
        i18n.applyTranslations();
    });
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
        let reason = i18n.t('ai.cannotConnect');
        if (error.name === 'TimeoutError') {
            reason = i18n.t('ai.timeout');
        } else if (error.message.includes('Failed to fetch')) {
            reason = i18n.t('ai.ollamaNotRunning');
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
            ollamaIndicator.innerHTML = `<span class="status-dot"></span>${i18n.t('ai.nModels', state.ollamaStatus.models.length)}`;
            ollamaIndicator.onclick = null;
            ollamaIndicator.title = '';
        } else {
            ollamaIndicator.className = 'status-indicator disconnected';
            ollamaIndicator.innerHTML = `<span class="status-dot"></span>${state.ollamaStatus.reason || i18n.t('ai.notAvailable')}`;
            ollamaIndicator.onclick = showOllamaHelpModal;
            ollamaIndicator.title = i18n.t('ai.clickInstructions');
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
        chatInput.placeholder = i18n.t('ai.placeholderCopy');
    } else {
        chatInput.placeholder = i18n.t('ai.placeholderOllama');
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
        indicator.innerHTML = `<span class="status-dot"></span>${i18n.t('ai.checking')}`;
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
        option.textContent = i18n.t('ai.noModels');
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
 * Cargar archivo compacto con todos los resultados
 */
async function loadFullContextFile() {
    try {
        const response = await fetch('data/results_compact.txt');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const content = await response.text();
        const sizeBytes = new Blob([content]).size;
        const estimatedTokens = Math.ceil(sizeBytes / 4);
        state.fullContextData = {
            sizeBytes,
            content,
            tokens: estimatedTokens
        };
    } catch (error) {
        console.error('No se pudo cargar results_compact.txt:', error);
        state.fullContextData = { sizeBytes: null, content: null, tokens: null, error: error.message };
    }

    updateFullContextInfo();
}

/**
 * Actualizar texto informativo sobre el contexto completo
 */
function updateFullContextInfo() {
    const sizeEl = document.getElementById('full-context-size');
    const tokensEl = document.getElementById('full-context-tokens');

    if (state.fullContextData?.sizeBytes) {
        const fileSize = formatBytes(state.fullContextData.sizeBytes);
        const tokens = state.fullContextData.tokens;
        if (sizeEl) sizeEl.textContent = fileSize;
        if (tokensEl) tokensEl.textContent = `~${(tokens/1000).toFixed(0)}K tokens`;
    } else {
        if (sizeEl) sizeEl.textContent = state.fullContextData?.error ? 'Error' : '...';
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
        addErrorMessage(i18n.t('ai.errorNotAvailable'));
        return;
    }

    if (!state.model) {
        addErrorMessage(i18n.t('ai.errorSelectModel'));
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
        addErrorMessage(`${i18n.t('ai.errorConnection')} ${error.message}`);
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
            return { error: `${i18n.t('ai.errorOllama')} ${response.status} ${response.statusText}` };
        }

        const data = await response.json();

        if (data.message && data.message.content) {
            return { content: data.message.content };
        } else if (data.error) {
            return { error: `${i18n.t('ai.errorOllama')} ${data.error}` };
        } else {
            return { error: i18n.t('ai.errorUnexpected') };
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            return { error: i18n.t('ai.errorCannotConnect') };
        }
        return { error: `Error: ${error.message}` };
    }
}

/**
 * Construir prompt del sistema
 */
function buildSystemPrompt() {
    let prompt = i18n.t('ai.systemPrompt');

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

    // Resumen estadístico
    let context = `${i18n.t('ai.ctx.summary')}
- ${i18n.t('ai.ctx.totalResults')} ${metadata.total_results}
- ${i18n.t('ai.ctx.datasetsEval')} ${metadata.datasets}
- ${i18n.t('ai.ctx.distinctModels')} ${metadata.models}
- ${i18n.t('ai.ctx.iterOptions')} ${metadata.iterations_options?.join(', ')}
- ${i18n.t('ai.ctx.cutOptions')} ${metadata.cuts_options?.join(', ')}

`;

    // Mejores resultados por modelo base
    context += i18n.t('ai.ctx.bestByBase') + '\n';
    ['TAN', 'KDB', 'AODE'].forEach(base => {
        const baseResults = results.filter(r => r.model_base === base);
        const best = baseResults.reduce((a, b) => a.accuracy > b.accuracy ? a : b, { accuracy: 0 });
        if (best.accuracy > 0) {
            context += `- ${base}: ${(best.accuracy * 100).toFixed(2)}% (${best.model} en ${best.dataset})\n`;
        }
    });

    // Mejoras de discretización local
    context += '\n' + i18n.t('ai.ctx.localImprovements') + '\n';
    const localResults = results.filter(r => r.discretization_type === 'local');
    const improvements = localResults.filter(r => r.improvement_vs_base > 0);
    const avgImprovement = improvements.length > 0
        ? improvements.reduce((sum, r) => sum + r.improvement_vs_base, 0) / improvements.length
        : 0;

    context += `- ${i18n.t('ai.ctx.casesWith')} ${improvements.length} ${i18n.t('ai.ctx.of')} ${localResults.length} (${(improvements.length/localResults.length*100).toFixed(1)}%)\n`;
    context += `- ${i18n.t('ai.ctx.avgImprovement')} ${avgImprovement.toFixed(2)}%\n`;

    // Top 5 datasets con mayor mejora
    context += '\n' + i18n.t('ai.ctx.top5') + '\n';
    const sortedByImprovement = [...localResults].sort((a, b) => b.improvement_vs_base - a.improvement_vs_base);
    sortedByImprovement.slice(0, 5).forEach((r, i) => {
        context += `${i+1}. ${r.dataset}: +${r.improvement_vs_base.toFixed(2)}% (${r.model}, ${r.iterations}, ${r.cuts})\n`;
    });

    // Resultados detallados
    if (state.includeFullContext && state.fullContextData?.content) {
        context += '\n' + state.fullContextData.content;
    } else {
        // Contexto resumido: muestra de resultados
        context += '\n' + i18n.t('ai.ctx.sampleResults') + '\n';
        const sample = results.slice(0, CONFIG.MAX_CONTEXT_RESULTS);
        sample.forEach(r => {
            context += `- ${r.dataset} | ${r.model} | ${r.iterations}/${r.cuts} | ${i18n.t('ai.ctx.acc')} ${(r.accuracy*100).toFixed(2)}%`;
            if (r.improvement_vs_base !== undefined) {
                context += ` | ${i18n.t('ai.ctx.imp')} ${r.improvement_vs_base > 0 ? '+' : ''}${r.improvement_vs_base.toFixed(2)}%`;
            }
            context += '\n';
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
                <h3>${i18n.t('ai.askAboutResults')}</h3>
                <p>${i18n.t('ai.welcomeMsg')}</p>
                <div class="example-questions">
                    <button class="example-question">${i18n.t('ai.exQ1')}</button>
                    <button class="example-question">${i18n.t('ai.exQ2')}</button>
                    <button class="example-question">${i18n.t('ai.exQ3')}</button>
                    <button class="example-question">${i18n.t('ai.exQ4')}</button>
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

    const userQuestion = chatInput.value.trim() || i18n.t('ai.writeQuestion');

    const fullPrompt = `${buildSystemPrompt()}

---

${i18n.t('ai.myQuestion')} ${userQuestion}`;

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
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${i18n.t('ai.copied')}`;
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
