/* ===========================================
   KANBAN BOARD - JAVASCRIPT
   Gerenciamento de estado e Drag & Drop
   Vanilla JS - Sem frameworks
   =========================================== */

// ===== SELEÇÃO DE ELEMENTOS DO DOM =====
const openModalBtn = document.getElementById('open-modal-btn');
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const inputTitle = document.getElementById('input-title');
const inputDesc = document.getElementById('input-desc');
const modalTitle = document.getElementById('modal-title');
const dropzones = document.querySelectorAll('.dropzone');

// Card sendo editado (null = novo card)
let editingCardId = null;

// ===== ESTADO DA APLICAÇÃO =====
let kanbanState = {
    todo: [],
    doing: [],
    done: []
};

// ===== FUNÇÕES DE PERSISTÊNCIA (localStorage) =====

/**
 * Salva o estado atual no localStorage
 */
function saveState() {
    localStorage.setItem('kanbanState', JSON.stringify(kanbanState));
}

/**
 * Carrega o estado salvo do localStorage
 * Migra dados antigos se necessário
 */
function loadState() {
    const saved = localStorage.getItem('kanbanState');
    if (saved) {
        kanbanState = JSON.parse(saved);
        
        // Migra dados antigos (formato com 'text' para 'title/desc')
        let needsMigration = false;
        ['todo', 'doing', 'done'].forEach(column => {
            kanbanState[column] = kanbanState[column].map(task => {
                if (task.text && !task.title) {
                    needsMigration = true;
                    return { id: task.id, title: task.text, desc: '' };
                }
                return task;
            });
        });
        
        if (needsMigration) saveState();
    }
}

// ===== FUNÇÕES DE FORMATAÇÃO =====

/**
 * Converte **texto** em <strong>texto</strong>
 * @param {string} text - Texto com markdown
 * @returns {string} - HTML formatado
 */
function parseMarkdown(text) {
    if (!text) return '';
    // Escapa HTML para segurança
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Converte **texto** em negrito
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// ===== FUNÇÕES DO MODAL =====

/**
 * Abre o modal para criar ou editar tarefa
 * @param {Object|null} task - Tarefa para editar (null = nova)
 */
function openModal(task = null) {
    editingCardId = task ? task.id : null;
    modalTitle.textContent = task ? 'Editar Tarefa' : 'Nova Tarefa';
    inputTitle.value = task ? task.title : '';
    inputDesc.value = task ? task.desc : '';
    modalOverlay.classList.remove('hidden');
    inputTitle.focus();
}

/**
 * Fecha o modal e limpa os campos
 */
function closeModal() {
    modalOverlay.classList.add('hidden');
    inputTitle.value = '';
    inputDesc.value = '';
    editingCardId = null;
}

/**
 * Salva a tarefa (nova ou editada)
 */
function saveTask() {
    const title = inputTitle.value.trim();
    const desc = inputDesc.value.trim();
    
    if (!title) {
        inputTitle.focus();
        inputTitle.style.borderColor = '#e03131';
        setTimeout(() => inputTitle.style.borderColor = '', 1500);
        return;
    }
    
    if (editingCardId) {
        // Atualiza tarefa existente
        updateTask(editingCardId, title, desc);
    } else {
        // Cria nova tarefa
        addTask(title, desc);
    }
    
    closeModal();
}

// ===== FUNÇÕES DE CRIAÇÃO DE ELEMENTOS =====

/**
 * Cria um novo card de tarefa
 * @param {Object} task - Objeto com id, title, desc
 * @returns {HTMLElement} - Elemento do card
 */
function createCard(task) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.draggable = true;
    card.dataset.id = task.id;

    // Header com título e botão deletar
    const header = document.createElement('div');
    header.classList.add('card-header');

    const titleEl = document.createElement('span');
    titleEl.classList.add('card-title');
    titleEl.textContent = task.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Excluir tarefa';

    header.appendChild(titleEl);
    header.appendChild(deleteBtn);

    // Descrição (se existir)
    const descEl = document.createElement('div');
    descEl.classList.add('card-desc');
    descEl.innerHTML = parseMarkdown(task.desc);

    card.appendChild(header);
    card.appendChild(descEl);

    // Evento: Deletar card
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCard(card);
    });

    // Evento: Editar com duplo clique
    card.addEventListener('dblclick', () => {
        const taskData = findCardInState(task.id);
        if (taskData) openModal(taskData);
    });

    // Eventos de Drag (Arrastar)
    card.addEventListener('dragstart', () => {
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });

    return card;
}

/**
 * Gera um ID único para cada card
 * @returns {string} - ID único
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== FUNÇÕES DE MANIPULAÇÃO DO ESTADO =====

/**
 * Adiciona uma nova tarefa ao estado e ao DOM
 * @param {string} title - Título da tarefa
 * @param {string} desc - Descrição da tarefa
 */
function addTask(title, desc) {
    const id = generateId();
    const task = { id, title, desc };
    
    kanbanState.todo.push(task);
    saveState();
    
    const card = createCard(task);
    document.getElementById('todo').appendChild(card);
    
    updateCounts();
}

/**
 * Atualiza uma tarefa existente
 * @param {string} id - ID do card
 * @param {string} title - Novo título
 * @param {string} desc - Nova descrição
 */
function updateTask(id, title, desc) {
    ['todo', 'doing', 'done'].forEach(column => {
        const task = kanbanState[column].find(t => t.id === id);
        if (task) {
            task.title = title;
            task.desc = desc;
        }
    });
    
    saveState();
    renderCards();
}

/**
 * Deleta um card do DOM e do estado
 * @param {HTMLElement} card - Elemento do card
 */
function deleteCard(card) {
    const id = card.dataset.id;
    
    ['todo', 'doing', 'done'].forEach(column => {
        kanbanState[column] = kanbanState[column].filter(task => task.id !== id);
    });
    
    saveState();
    
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    setTimeout(() => {
        card.remove();
        updateCounts();
    }, 200);
}

/**
 * Encontra um card no estado pelo ID
 * @param {string} id - ID do card
 * @returns {Object|null} - Objeto da tarefa ou null
 */
function findCardInState(id) {
    for (const column of ['todo', 'doing', 'done']) {
        const task = kanbanState[column].find(t => t.id === id);
        if (task) return task;
    }
    return null;
}

/**
 * Move um card entre colunas no estado
 * @param {string} cardId - ID do card
 * @param {string} targetColumn - Coluna de destino
 */
function moveCardInState(cardId, targetColumn) {
    let task = null;
    
    ['todo', 'doing', 'done'].forEach(column => {
        const index = kanbanState[column].findIndex(t => t.id === cardId);
        if (index !== -1) {
            task = kanbanState[column].splice(index, 1)[0];
        }
    });
    
    if (task) {
        kanbanState[targetColumn].push(task);
        saveState();
    }
}

// ===== FUNÇÕES DE INTERFACE =====

/**
 * Atualiza os contadores de cards em cada coluna
 */
function updateCounts() {
    document.getElementById('count-todo').textContent = kanbanState.todo.length;
    document.getElementById('count-doing').textContent = kanbanState.doing.length;
    document.getElementById('count-done').textContent = kanbanState.done.length;
}

/**
 * Renderiza todos os cards a partir do estado
 */
function renderCards() {
    dropzones.forEach(zone => zone.innerHTML = '');
    
    ['todo', 'doing', 'done'].forEach(column => {
        const zone = document.getElementById(column);
        kanbanState[column].forEach(task => {
            const card = createCard(task);
            zone.appendChild(card);
        });
    });
    
    updateCounts();
}

// ===== EVENTOS DO MODAL =====

openModalBtn.addEventListener('click', () => openModal());
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
saveBtn.addEventListener('click', saveTask);

// Fechar modal clicando fora
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Salvar com Ctrl+Enter ou fechar com ESC
document.addEventListener('keydown', (e) => {
    if (modalOverlay.classList.contains('hidden')) return;
    
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.ctrlKey) saveTask();
});

// ===== LÓGICA DE DRAG AND DROP =====

dropzones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('highlight');
        
        const cardArrastado = document.querySelector('.dragging');
        if (cardArrastado) {
            zone.appendChild(cardArrastado);
        }
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('highlight');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('highlight');
        
        const cardArrastado = document.querySelector('.dragging');
        if (cardArrastado) {
            const cardId = cardArrastado.dataset.id;
            const targetColumn = zone.id;
            
            moveCardInState(cardId, targetColumn);
            updateCounts();
        }
    });
});

// ===== INICIALIZAÇÃO =====

function init() {
    loadState();
    renderCards();
}

document.addEventListener('DOMContentLoaded', init);