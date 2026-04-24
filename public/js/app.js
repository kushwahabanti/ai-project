// Configuration — set API_BASE to your server URL in production
const API_BASE = window.location.origin;

// App State
let selectedTone = 'professional';
let selectedContentType = 'text';
let messageCount = 0;
let currentChatId = null;
let chats = {};
let lastPosterText = null; // Track last poster for follow-up modifications

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

    const requestBody = { 
      prompt: msg,
      tone: selectedTone 
    };
    // Send previous poster context for follow-up modifications
    if (selectedContentType === 'poster' && lastPosterText) {
      requestBody.previousPosterText = lastPosterText;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    loadingDiv.remove();

    if (selectedContentType === 'poster') {
      addPosterMessage(data.posterUrl, data.prompt, data.posterText);
      // Save for follow-up modifications
      lastPosterText = data.posterText;
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
  const text = selectedContentType === 'poster' ? 'Generating your poster (this may take 1-2 minutes)...' : 'Generating professional copy...';

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

/**
 * Renders text on a Canvas overlay on top of the AI-generated background image.
 * This solves the AI model's inability to render legible English text.
 */
function renderPosterWithTextOverlay(canvas, bgImage, posterText) {
  const ctx = canvas.getContext('2d');
  const W = 1024, H = 1024;
  canvas.width = W;
  canvas.height = H;

  // Draw the AI-generated background image
  ctx.drawImage(bgImage, 0, 0, W, H);

  // Add a dark gradient scrim at the bottom for text readability
  const gradient = ctx.createLinearGradient(0, H * 0.35, 0, H);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Also add a subtle top gradient for branding area
  const topGradient = ctx.createLinearGradient(0, 0, 0, H * 0.25);
  topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, W, H * 0.25);

  // Text settings
  ctx.textAlign = 'center';

  const headline = (posterText.headline || 'Your Brand Here').toUpperCase();
  const tagline = posterText.tagline || 'Quality You Can Trust';
  const cta = (posterText.cta || 'Shop Now').toUpperCase();

  // --- HEADLINE ---
  ctx.save();
  ctx.font = 'bold 72px "Outfit", "Arial Black", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Word-wrap headline
  const headlineLines = wrapText(ctx, headline, W - 120, 72);
  const headlineY = H * 0.62;
  headlineLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, headlineY + (i * 82));
  });
  ctx.restore();

  // --- TAGLINE ---
  ctx.save();
  ctx.font = '400 36px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  const taglineY = headlineY + (headlineLines.length * 82) + 20;
  ctx.fillText(tagline, W / 2, taglineY);
  ctx.restore();

  // --- CTA BUTTON ---
  ctx.save();
  const ctaY = taglineY + 65;
  const ctaFont = 'bold 28px "Outfit", "Arial Black", sans-serif';
  ctx.font = ctaFont;
  const ctaWidth = ctx.measureText(cta).width + 70;
  const ctaHeight = 56;
  const ctaX = (W - ctaWidth) / 2;

  // CTA button background
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY - ctaHeight + 10, ctaX + ctaWidth, ctaY + 10);
  ctaGrad.addColorStop(0, '#6366f1');
  ctaGrad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = ctaGrad;

  // Rounded rectangle for CTA
  const radius = 28;
  ctx.beginPath();
  ctx.moveTo(ctaX + radius, ctaY - ctaHeight + 10);
  ctx.lineTo(ctaX + ctaWidth - radius, ctaY - ctaHeight + 10);
  ctx.quadraticCurveTo(ctaX + ctaWidth, ctaY - ctaHeight + 10, ctaX + ctaWidth, ctaY - ctaHeight + 10 + radius);
  ctx.lineTo(ctaX + ctaWidth, ctaY + 10 - radius);
  ctx.quadraticCurveTo(ctaX + ctaWidth, ctaY + 10, ctaX + ctaWidth - radius, ctaY + 10);
  ctx.lineTo(ctaX + radius, ctaY + 10);
  ctx.quadraticCurveTo(ctaX, ctaY + 10, ctaX, ctaY + 10 - radius);
  ctx.lineTo(ctaX, ctaY - ctaHeight + 10 + radius);
  ctx.quadraticCurveTo(ctaX, ctaY - ctaHeight + 10, ctaX + radius, ctaY - ctaHeight + 10);
  ctx.closePath();
  ctx.fill();

  // CTA text
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  ctx.font = ctaFont;
  ctx.fillText(cta, W / 2, ctaY - 12);
  ctx.restore();
}

/** Word-wrap helper for Canvas text */
function wrapText(ctx, text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // If too many lines, reduce font and retry
  if (lines.length > 3) {
    ctx.font = ctx.font.replace(/\d+px/, Math.floor(fontSize * 0.8) + 'px');
    return wrapText(ctx, text, maxWidth, Math.floor(fontSize * 0.8));
  }

  return lines;
}

function addPosterMessage(posterUrl, promptText, posterText) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper bot-wrapper";
  const timestamp = generateTimestamp();
  const posterId = 'poster-' + messageCount;
  const canvasId = 'canvas-' + messageCount;
  const skelId = 'skel-' + messageCount;

  // Fallback poster text
  posterText = posterText || { headline: "Your Brand Here", tagline: "Quality You Can Trust", cta: "Shop Now" };

  wrapper.innerHTML = `
    <div class="bot-message">
      <div class="bot-header">
        <div class="bot-avatar">🎨</div>
        <div class="bot-name">Poster Generator</div>
      </div>
      <div class="bot-content">
        <div class="bot-text">Here is your custom poster design:</div>
        <div class="poster-container" style="min-height: 250px; position: relative;">
          <div class="skeleton-loader" id="${skelId}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; color: #cbd5e1; text-align: center; padding: 20px;">
            <div class="loading-spinner" style="margin-bottom: 12px;">
              <div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>
            </div>
            <span style="font-size:13px; font-weight:500;">Rendering High-Res Poster...</span>
            <span style="font-size:11px; opacity:0.7; margin-top:4px;">This may take 20-30 seconds.</span>
          </div>
          <canvas id="${canvasId}" style="display: none; width: 100%; border-radius: 12px;"></canvas>
        </div>
      </div>
      <div class="poster-actions">
        <button class="download-poster-btn" id="dl-${posterId}" style="display:none;" onclick="downloadCanvasPoster('${canvasId}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Download Poster
        </button>
      </div>
      <div class="poster-text-preview" style="margin: 8px 0; padding: 10px 14px; background: rgba(255,255,255,0.05); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; color: #94a3b8;">
        <div style="margin-bottom:4px;"><strong style="color:#e2e8f0;">Headline:</strong> ${escapeHtml(posterText.headline)}</div>
        <div style="margin-bottom:4px;"><strong style="color:#e2e8f0;">Tagline:</strong> ${escapeHtml(posterText.tagline)}</div>
        <div><strong style="color:#e2e8f0;">CTA:</strong> ${escapeHtml(posterText.cta)}</div>
      </div>
      <div class="message-footer">
        <div class="message-time">${timestamp}</div>
        <button class="action-btn" onclick="copyMessage(this, '${escapeHtml(posterText.headline)} - ${escapeHtml(posterText.tagline)}')">
          📋 Copy Text
        </button>
      </div>
    </div>
  `;

  els.chat.appendChild(wrapper);
  messageCount++;
  updateMessageCount();
  scrollToBottom();

  // Load the background image and render text overlay using Canvas
  const bgImage = new Image();
  // Only set crossOrigin for external URLs (fallback), not for base64 data URLs
  if (!posterUrl.startsWith('data:')) {
    bgImage.crossOrigin = 'anonymous';
  }
  bgImage.onload = function() {
    const canvas = document.getElementById(canvasId);
    const skel = document.getElementById(skelId);
    const dlBtn = document.getElementById('dl-' + posterId);

    try {
      renderPosterWithTextOverlay(canvas, bgImage, posterText);
      canvas.style.display = 'block';
      if (skel) skel.style.display = 'none';
      if (dlBtn) dlBtn.style.display = 'inline-flex';
      scrollToBottom();
    } catch(e) {
      console.error('Canvas render error:', e);
      if (skel) skel.innerHTML = '⚠️ Failed to render poster overlay. Try again.';
    }
  };
  bgImage.onerror = function() {
    const skel = document.getElementById(skelId);
    if (skel) skel.innerHTML = '⚠️ Failed to load background image. The generation timed out or was blocked. Please try again.';
    scrollToBottom();
  };
  bgImage.src = posterUrl;
}

/** Download the Canvas poster as a PNG file */
window.downloadCanvasPoster = function(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const link = document.createElement('a');
  link.download = 'ai-poster-' + Date.now() + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('📥 Poster downloaded!');
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
