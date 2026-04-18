// Configuration — set API_BASE to your server URL in production
const API_BASE = window.location.origin;

// App State
let selectedTone = 'professional';
let selectedContentType = 'text';
let messageCount = 0;
let currentChatId = null;
let chats = {};

// DOM Elements
const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  toneBtns: document.querySelectorAll('.tone-btn'),
  contentTypeBtns: document.querySelectorAll('.content-type-btn'),
  input: document.getElementById('input'),
  charCount: document.getElementById('charCount'),
  generateBtn: document.getElementById('generateBtn'),
  chat: document.getElementById('chat'),
  msgCount: document.getElementById('msgCount'),
  clearBtn: document.getElementById('clearBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  recentChats: document.getElementById('recentChats'),
  toastContainer: document.getElementById('toastContainer'),
  quickActions: document.querySelectorAll('.action-card')
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  loadChatsFromStorage();
  
  if (Object.keys(chats).length === 0) {
    createNewChat();
  } else {
    // Load last active chat if exists, or first available
    const savedCurrent = localStorage.getItem('adgen_current');
    if (savedCurrent && chats[savedCurrent]) {
      loadChat(savedCurrent);
    } else {
      loadChat(Object.keys(chats)[0]);
    }
  }

  setupEventListeners();
});

function setupEventListeners() {
  // Sidebar
  els.sidebarToggle.addEventListener('click', () => {
    els.sidebar.classList.toggle('collapsed');
  });

  // Tone Selection
  els.toneBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      els.toneBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTone = btn.dataset.tone;
    });
  });

  // Content Type Selection
  els.contentTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      els.contentTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedContentType = btn.dataset.type;
      
      const placeholder = selectedContentType === 'poster' 
        ? 'Describe the visual poster you want to create...'
        : 'Describe your product or campaign here...';
      els.input.placeholder = placeholder;
      
      showToast(selectedContentType === 'poster' ? '🎨 Poster mode activated' : '📝 Text mode activated');
    });
  });

  // Input Handling
  els.input.addEventListener('input', (e) => {
    els.charCount.textContent = e.target.value.length;
  });

  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  // Actions
  els.generateBtn.addEventListener('click', send);
  els.clearBtn.addEventListener('click', clearCurrentChat);
  els.newChatBtn.addEventListener('click', createNewChat);

  // Quick Actions
  els.quickActions.forEach(btn => {
    btn.addEventListener('click', () => {
      const prefix = btn.dataset.quick;
      const val = els.input.value.trim();
      if (!val) {
        showToast('⚠️ Describe your product first, then click action.', 'error');
        els.input.focus();
        return;
      }
      sendMessage(prefix + val);
    });
  });
}

// Core Chat Logic
function send() {
  const msg = els.input.value.trim();
  if (!msg) {
    showToast('⚠️ Please enter something!', 'error');
    return;
  }
  
  els.input.value = "";
  els.charCount.textContent = '0';
  sendMessage(msg);
}

async function sendMessage(msg) {
  removeEmptyState();
  
  addUserMessage(msg);
  const loadingDiv = addLoadingMessage();

  try {
    const endpoint = selectedContentType === 'poster' ? '/generate-poster' : '/generate';
    
    // Simulate slight delay for premium feel
    await new Promise(r => setTimeout(r, 600));

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt: msg,
        tone: selectedTone 
      })
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    loadingDiv.remove();

    if (selectedContentType === 'poster') {
      addPosterMessage(data.posterUrl, data.prompt);
    } else {
      addBotMessage(data.result || "No response");
    }

    saveCurrentChat();

  } catch (err) {
    console.error('❌ Error:', err);
    loadingDiv.remove();
    addBotMessage("❌ Error: " + err.message, true);
    showToast('❌ Failed to connect to server', 'error');
  }
}

// UI Renderers
function removeEmptyState() {
  const emptyState = els.chat.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
}

function scrollToBottom() {
  els.chat.parentElement.scrollTop = els.chat.parentElement.scrollHeight;
}

function updateMessageCount() {
  els.msgCount.textContent = messageCount;
}

function generateTimestamp() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function addUserMessage(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper user-wrapper";
  wrapper.innerHTML = `
    <div class="user-message">
      ${escapeHtml(text)}
    </div>
  `;
  els.chat.appendChild(wrapper);
  messageCount++;
  updateMessageCount();
  scrollToBottom();
}

function addLoadingMessage() {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot-wrapper";
  
  const icon = selectedContentType === 'poster' ? '🎨' : '✨';
  const name = selectedContentType === 'poster' ? 'Poster Generator' : 'AI Assistant';
  const text = selectedContentType === 'poster' ? 'Designing your poster...' : 'Generating professional copy...';

  wrapper.innerHTML = `
    <div class="bot-message">
      <div class="bot-header">
        <div class="bot-avatar">${icon}</div>
        <div class="bot-name">${name}</div>
      </div>
      <div class="loading-wrapper">
        <div class="loading-spinner">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
        <div class="loading-text">${text}</div>
      </div>
    </div>
  `;
  els.chat.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function addBotMessage(text, isError = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot-wrapper";
  const timestamp = generateTimestamp();

  // Parse markdown if marked is available, otherwise escape text
  let formattedText = isError ? escapeHtml(text) : (window.marked ? marked.parse(text) : escapeHtml(text));

  wrapper.innerHTML = `
    <div class="bot-message ${isError ? 'error-message' : ''}">
      <div class="bot-header">
        <div class="bot-avatar">✨</div>
        <div class="bot-name">AI Assistant</div>
      </div>
      <div class="bot-content bot-text">
        ${formattedText}
      </div>
      <div class="message-footer">
        <div class="message-time">${timestamp}</div>
        <button class="action-btn" onclick="copyMessage(this, &quot;${escapeHtml(text).replace(/"/g, '&quot;')}&quot;)">
          📋 Copy Text
        </button>
      </div>
    </div>
  `;

  els.chat.appendChild(wrapper);
  messageCount++;
  updateMessageCount();
  scrollToBottom();
}

function addPosterMessage(posterUrl, promptText) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot-wrapper";
  const timestamp = generateTimestamp();

  wrapper.innerHTML = `
    <div class="bot-message">
      <div class="bot-header">
        <div class="bot-avatar">🎨</div>
        <div class="bot-name">Poster Generator</div>
      </div>
      <div class="bot-content">
        <div class="bot-text">Here is your custom poster design:</div>
        <div class="poster-container" style="min-height: 250px;">
          <div class="skeleton-loader" id="skel-${messageCount}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; color: #cbd5e1; text-align: center; padding: 20px;">
            <div class="loading-spinner" style="margin-bottom: 12px;">
              <div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>
            </div>
            <span style="font-size:13px; font-weight:500;">Rendering High-Res Poster...</span>
            <span style="font-size:11px; opacity:0.7; margin-top:4px;">This process usually takes 20-30 seconds.</span>
          </div>
          <img src="${posterUrl}" referrerpolicy="no-referrer" alt="Generated Poster" style="display: none; width: 100%;" 
               onload="this.style.display='block'; document.getElementById('skel-${messageCount}').style.display='none'; scrollToBottom();" 
               onerror="document.getElementById('skel-${messageCount}').innerHTML='⚠️ Failed to load. The image generation timed out or was blocked. Try clicking \\'Download HQ\\' to open it directly in a new tab.'; this.style.display='none'; scrollToBottom();" />
        </div>
      </div>
      <div class="poster-actions">
        <button class="download-poster-btn" onclick="window.open('${posterUrl}', '_blank', 'noopener,noreferrer')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Download HQ
        </button>
      </div>
      <div class="message-footer">
        <div class="message-time">${timestamp}</div>
        <button class="action-btn" onclick="copyMessage(this, '${posterUrl}')">
          🔗 Copy URL
        </button>
      </div>
    </div>
  `;

  els.chat.appendChild(wrapper);
  messageCount++;
  updateMessageCount();
  scrollToBottom();
}

// Utilities
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    ${type === 'error' ? '⚠️' : '✨'} ${message}
  `;
  
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function copyMessage(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2000);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Chat History Management
function createNewChat() {
  currentChatId = 'chat_' + Date.now();
  chats[currentChatId] = {
    id: currentChatId,
    title: 'New Project',
    messages: [],
    timestamp: new Date().toISOString(),
    messageCount: 0
  };
  
  showEmptyState();
  messageCount = 0;
  updateMessageCount();
  updateChatHistory();
  saveChatsToStorage();
}

window.loadChat = function(chatId) {
  currentChatId = chatId;
  const chat = chats[chatId];
  if (!chat) return;
  
  if (chat.messages.length === 0) {
    showEmptyState();
  } else {
    els.chat.innerHTML = chat.messages.join('');
  }
  
  messageCount = chat.messageCount || 0;
  updateMessageCount();
  updateChatHistory();
  saveChatsToStorage();
  scrollToBottom();
}

window.deleteChat = function(chatId, event) {
  event.stopPropagation();
  event.preventDefault();
  
  if (confirm('Delete this project?')) {
    delete chats[chatId];
    
    if (currentChatId === chatId) {
      const remainingChats = Object.keys(chats);
      if (remainingChats.length > 0) {
        window.loadChat(remainingChats[0]);
      } else {
        createNewChat();
      }
    }
    
    updateChatHistory();
    saveChatsToStorage();
    showToast('🗑️ Project deleted');
  }
}

function saveCurrentChat() {
  if (!currentChatId) return;
  
  const firstMessage = els.chat.querySelector('.user-message');
  
  chats[currentChatId].messages = Array.from(els.chat.children).map(el => el.outerHTML);
  chats[currentChatId].messageCount = messageCount;
  chats[currentChatId].title = firstMessage ? firstMessage.textContent.trim().substring(0, 25) + '...' : 'New Project';
  chats[currentChatId].timestamp = new Date().toISOString();
  
  updateChatHistory();
  saveChatsToStorage();
}

function clearCurrentChat() {
  if (!currentChatId) return;
  
  if (confirm('Delete this entire project and its history?')) {
    delete chats[currentChatId];
    
    const remainingChats = Object.keys(chats);
    if (remainingChats.length > 0) {
      window.loadChat(remainingChats[0]);
    } else {
      createNewChat();
    }
    
    updateChatHistory();
    saveChatsToStorage();
    showToast('🗑️ Project deleted');
  }
}

function showEmptyState() {
  els.chat.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon-wrapper">
        <div class="empty-state-icon">✨</div>
      </div>
      <h3>Ready to Create?</h3>
      <p>Choose text or poster mode to get started</p>
    </div>
  `;
}

function updateChatHistory() {
  const sortedChats = Object.values(chats).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  els.recentChats.innerHTML = sortedChats.map(chat => {
    const time = new Date(chat.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isActive = chat.id === currentChatId ? 'active' : '';
    
    return `
      <div class="chat-item ${isActive}" onclick="loadChat('${chat.id}')">
        <div class="chat-item-title">${chat.title}</div>
        <div class="chat-item-time">${time} • ${chat.messageCount || 0} msgs</div>
        <button class="chat-item-delete" onclick="deleteChat('${chat.id}', event)" title="Delete Project">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;
  }).join('');
}

function saveChatsToStorage() {
  localStorage.setItem('adgen_chats', JSON.stringify(chats));
  localStorage.setItem('adgen_current', currentChatId);
}

function loadChatsFromStorage() {
  const saved = localStorage.getItem('adgen_chats');
  if (saved) {
    try {
      chats = JSON.parse(saved);
      // Fallback if data structure changed
      Object.values(chats).forEach(chat => {
        if (!chat.title) chat.title = 'Project';
        if (!chat.messages) chat.messages = [];
      });
    } catch(e) {
      chats = {};
    }
  }
}
