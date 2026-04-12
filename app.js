// ── CONSTANTS ──
const MAX_DOTS = 10;
const BUFFER_TIMEOUT = 2500;

// ── STATE ──
let secretCode = localStorage.getItem('_sc') || '';
let buffer = '';
let bufferTimer = null;

// ── DOM REFERENCES ──
const screens = {
  setup: document.getElementById('screen-setup'),
  lock:  document.getElementById('screen-lock'),
  chat:  document.getElementById('screen-chat'),
};

const els = {
  setupCode:    document.getElementById('setup-code'),
  setupConfirm: document.getElementById('setup-confirm'),
  setupErr:     document.getElementById('setup-err'),
  saveBtn:      document.getElementById('save-btn'),
  dotsRow:      document.getElementById('dots-row'),
  lockHint:     document.getElementById('lock-hint'),
  messages:     document.getElementById('messages'),
  unlockDate:   document.getElementById('unlock-date'),
  msgInput:     document.getElementById('msg-input'),
  sendBtn:      document.getElementById('send-btn'),
  clearBtn:     document.getElementById('clear-btn'),
  lockBtn:      document.getElementById('lock-btn'),
  lockBtnBottom:document.getElementById('lock-btn-bottom'),
  resetBtn:     document.getElementById('reset-btn'),
};

// ── SCREEN MANAGER ──
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── SETUP ──
function doSetup() {
  const code    = els.setupCode.value.trim();
  const confirm = els.setupConfirm.value.trim();

  if (!code) {
    els.setupErr.textContent = 'Please enter a code.';
    return;
  }
  if (code !== confirm) {
    els.setupErr.textContent = 'Codes do not match.';
    return;
  }

  els.setupErr.textContent = '';
  secretCode = code;
  localStorage.setItem('_sc', code);

  showScreen('lock');
  renderDots(0);
  window.addEventListener('keydown', handleKey);
}

// ── DOTS ──
function renderDots(count) {
  els.dotsRow.innerHTML = '';
  for (let i = 0; i < MAX_DOTS; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i < count ? ' active' : '');
    els.dotsRow.appendChild(dot);
  }
}

// ── KEY LISTENER ──
function handleKey(e) {
  if (!secretCode) return;

  if (e.key.length === 1) {
    buffer += e.key;
    renderDots(Math.min(buffer.length, MAX_DOTS));
    els.lockHint.textContent = '···';

    clearTimeout(bufferTimer);
    bufferTimer = setTimeout(() => {
      buffer = '';
      renderDots(0);
      els.lockHint.textContent = 'start typing…';
    }, BUFFER_TIMEOUT);

    if (buffer.toLowerCase().includes(secretCode.toLowerCase())) {
      buffer = '';
      clearTimeout(bufferTimer);
      window.removeEventListener('keydown', handleKey);
      unlockChat();
    }

  } else if (e.key === 'Backspace') {
    buffer = buffer.slice(0, -1);
    renderDots(Math.min(buffer.length, MAX_DOTS));
  }
}

// ── LOCK / UNLOCK ──
function unlockChat() {
  els.unlockDate.textContent = new Date().toLocaleTimeString();
  showScreen('chat');
}

function lockChat() {
  buffer = '';
  showScreen('lock');
  renderDots(0);
  els.lockHint.textContent = 'start typing…';
  window.addEventListener('keydown', handleKey);
}

// ── MESSAGES ──
function sendMsg() {
  const text = els.msgInput.value.trim();
  if (!text) return;
  addMessage(text);
  els.msgInput.value = '';
  els.msgInput.focus();
}

function addMessage(text) {
  const wrap   = document.createElement('div');
  const bubble = document.createElement('div');
  const time   = document.createElement('div');

  bubble.className   = 'msg-bubble';
  bubble.textContent = text;

  time.className   = 'msg-time';
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  wrap.appendChild(bubble);
  wrap.appendChild(time);
  els.messages.appendChild(wrap);
  els.messages.scrollTop = els.messages.scrollHeight;

  saveMessages();
}

function saveMessages() {
  const texts = [...document.querySelectorAll('.msg-bubble')].map(b => b.textContent);
  localStorage.setItem('_msgs', JSON.stringify(texts));
}

function loadMessages() {
  const saved = localStorage.getItem('_msgs');
  if (!saved) return;
  JSON.parse(saved).forEach(text => {
    const wrap   = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className   = 'msg-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    els.messages.appendChild(wrap);
  });
}

function clearMessages() {
  els.messages.innerHTML = '<div class="msg-system">cleared</div>';
  localStorage.removeItem('_msgs');
}

// ── RESET ──
function resetAll() {
  if (!confirm('Reset everything? Your code and messages will be deleted.')) return;
  localStorage.clear();
  secretCode = '';
  window.removeEventListener('keydown', handleKey);
  els.setupCode.value    = '';
  els.setupConfirm.value = '';
  els.messages.innerHTML = '<div class="msg-system">chat unlocked · </div>';
  showScreen('setup');
}

// ── EVENT LISTENERS ──
els.saveBtn.addEventListener('click', doSetup);
els.setupConfirm.addEventListener('keydown', e => { if (e.key === 'Enter') doSetup(); });
els.sendBtn.addEventListener('click', sendMsg);
els.msgInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
els.clearBtn.addEventListener('click', clearMessages);
els.lockBtn.addEventListener('click', lockChat);
els.lockBtnBottom.addEventListener('click', lockChat);
els.resetBtn.addEventListener('click', resetAll);

// ── INIT ──
(function init() {
  if (secretCode) {
    showScreen('lock');
    renderDots(0);
    window.addEventListener('keydown', handleKey);
  } else {
    showScreen('setup');
  }
  loadMessages();
})();
