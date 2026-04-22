// ── CONSTANTS ──
const MAX_DOTS = 10;
const BUFFER_TIMEOUT = 2500;

// ── STATE ──
let secretCode = '';                                        // raw code — in memory only, NEVER stored
let storedHash = localStorage.getItem('_sc_hash') || '';   // SHA-256 hash of the code
let codeLen    = parseInt(localStorage.getItem('_sc_len') || '0', 10);
let buffer     = '';
let bufferTimer = null;

// ── DOM REFERENCES ──
const screens = {
  setup: document.getElementById('screen-setup'),
  lock:  document.getElementById('screen-lock'),
  chat:  document.getElementById('screen-chat'),
};

const els = {
  setupCode:     document.getElementById('setup-code'),
  setupConfirm:  document.getElementById('setup-confirm'),
  setupErr:      document.getElementById('setup-err'),
  saveBtn:       document.getElementById('save-btn'),
  dotsRow:       document.getElementById('dots-row'),
  lockHint:      document.getElementById('lock-hint'),
  messages:      document.getElementById('messages'),
  unlockDate:    document.getElementById('unlock-date'),
  msgInput:      document.getElementById('msg-input'),
  sendBtn:       document.getElementById('send-btn'),
  clearBtn:      document.getElementById('clear-btn'),
  lockBtn:       document.getElementById('lock-btn'),
  lockBtnBottom: document.getElementById('lock-btn-bottom'),
  resetBtn:      document.getElementById('reset-btn'),
};

// ── SCREEN MANAGER ──
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ──────────────────────────────────────────
// ── CRYPTO UTILITIES ──
// ──────────────────────────────────────────

// Returns a hex SHA-256 hash of a string (lowercased before hashing)
async function hashCode(str) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str.toLowerCase())
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Gets (or creates) a random salt stored in localStorage
function getSalt() {
  let s = localStorage.getItem('_salt');
  if (!s) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    s = btoa(String.fromCharCode(...bytes));
    localStorage.setItem('_salt', s);
  }
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// Derives an AES-GCM key from the raw code using PBKDF2
async function deriveKey(code) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: getSalt(), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypts a plain-text message -> base64 string (IV prepended)
async function encryptMsg(text) {
  const key = await deriveKey(secretCode);
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  const out = new Uint8Array(12 + enc.byteLength);
  out.set(iv);
  out.set(new Uint8Array(enc), 12);
  return btoa(String.fromCharCode(...out));
}

// Decrypts a base64 string back to plain text
async function decryptMsg(b64) {
  const key  = await deriveKey(secretCode);
  const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const dec  = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.slice(0, 12) },
    key,
    data.slice(12)
  );
  return new TextDecoder().decode(dec);
}

// ──────────────────────────────────────────
// ── SETUP ──
// ──────────────────────────────────────────

async function doSetup() {
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
  secretCode = code; // keep raw code in memory for encryption

  // Store only the hash + length — never the raw code
  const hash = await hashCode(code);
  localStorage.setItem('_sc_hash', hash);
  localStorage.setItem('_sc_len', code.length);
  storedHash = hash;
  codeLen    = code.length;

  showScreen('lock');
  renderDots(0);
  window.addEventListener('keydown', handleKey);
  focusLockInput();
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

// ──────────────────────────────────────────
// ── KEY LISTENER ──
// ──────────────────────────────────────────

function handleKey(e) {
  if (!storedHash) return;

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

    // Once buffer is long enough, check the last N chars against the stored hash
    if (buffer.length >= codeLen) {
      const candidate = buffer.slice(-codeLen);
      hashCode(candidate).then(h => {
        if (h === storedHash) {
          buffer = '';
          clearTimeout(bufferTimer);
          window.removeEventListener('keydown', handleKey);
          secretCode = candidate; // restore raw code in memory for decryption
          unlockChat();
        }
      });
    }

  } else if (e.key === 'Backspace') {
    buffer = buffer.slice(0, -1);
    renderDots(Math.min(buffer.length, MAX_DOTS));
  }
}

// ── MOBILE: hidden input focus ──
function focusLockInput() {
  const inp = document.getElementById('lock-input');
  if (inp) inp.focus();
}

document.getElementById('lock-input').addEventListener('input', function () {
  const chars = this.value;
  this.value = '';
  for (const ch of chars) { handleKey({ key: ch }); }
});

// ──────────────────────────────────────────
// ── LOCK / UNLOCK ──
// ──────────────────────────────────────────

function unlockChat() {
  els.unlockDate.textContent = new Date().toLocaleTimeString();
  showScreen('chat');
  loadMessages(); // decrypt & render only after unlock
}

function lockChat() {
  buffer     = '';
  secretCode = ''; // wipe raw code from memory
  // Clear rendered messages from DOM so they cannot be read while locked
  els.messages.innerHTML = '<div class="msg-system">chat unlocked · <span id="unlock-date"></span></div>';
  showScreen('lock');
  renderDots(0);
  els.lockHint.textContent = 'start typing…';
  window.addEventListener('keydown', handleKey);
  focusLockInput();
}

// ──────────────────────────────────────────
// ── MESSAGES ──
// ──────────────────────────────────────────

async function sendMsg() {
  const text = els.msgInput.value.trim();
  if (!text) return;
  await addMessage(text);
  els.msgInput.value = '';
  els.msgInput.focus();
}

async function addMessage(text) {
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

  await saveMessages();
}

async function saveMessages() {
  const texts     = [...document.querySelectorAll('.msg-bubble')].map(b => b.textContent);
  const encrypted = await Promise.all(texts.map(t => encryptMsg(t)));
  localStorage.setItem('_msgs', JSON.stringify(encrypted));
}

async function loadMessages() {
  const saved = localStorage.getItem('_msgs');
  if (!saved) return;
  const encrypted = JSON.parse(saved);
  for (const enc of encrypted) {
    try {
      const text   = await decryptMsg(enc);
      const wrap   = document.createElement('div');
      const bubble = document.createElement('div');
      bubble.className   = 'msg-bubble';
      bubble.textContent = text;
      wrap.appendChild(bubble);
      els.messages.appendChild(wrap);
    } catch {
      console.warn('Could not decrypt a message — skipping.');
    }
  }
}

async function clearMessages() {
  els.messages.innerHTML = '<div class="msg-system">cleared</div>';
  localStorage.removeItem('_msgs');
}

// ──────────────────────────────────────────
// ── RESET ──
// ──────────────────────────────────────────

function resetAll() {
  if (!confirm('Reset everything? Your code and messages will be deleted.')) return;
  localStorage.clear();
  secretCode = '';
  storedHash = '';
  codeLen    = 0;
  window.removeEventListener('keydown', handleKey);
  els.setupCode.value    = '';
  els.setupConfirm.value = '';
  els.messages.innerHTML = '<div class="msg-system">chat unlocked · </div>';
  showScreen('setup');
}

// ──────────────────────────────────────────
// ── EVENT LISTENERS ──
// ──────────────────────────────────────────

els.saveBtn.addEventListener('click', doSetup);
els.setupConfirm.addEventListener('keydown', e => { if (e.key === 'Enter') doSetup(); });
els.sendBtn.addEventListener('click', sendMsg);
els.msgInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
els.clearBtn.addEventListener('click', clearMessages);
els.lockBtn.addEventListener('click', lockChat);
els.lockBtnBottom.addEventListener('click', lockChat);
els.resetBtn.addEventListener('click', resetAll);

// ──────────────────────────────────────────
// ── INIT ──
// ──────────────────────────────────────────

(function init() {
  if (storedHash) {
    showScreen('lock');
    renderDots(0);
    window.addEventListener('keydown', handleKey);
    focusLockInput();
  } else {
    showScreen('setup');
  }
  // NOTE: loadMessages() is NOT called here.
  // Messages are decrypted and loaded only after the user unlocks successfully.
})();
