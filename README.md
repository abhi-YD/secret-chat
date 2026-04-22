# 🔒 Secret Chat
A hidden chat that only appears when you type your secret code. No server. No login. No internet needed.

![HTML](https://img.shields.io/badge/HTML-5-orange?style=flat-square)
![CSS](https://img.shields.io/badge/CSS-3-blue?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 🔐 Chat is completely hidden until you type your secret code
- ⌨️ Type the code anywhere on the page — no input box needed
- 💾 Messages saved in browser local storage (persist after closing)
- 🌙 Dark theme with minimal design
- 📴 Works fully offline — no internet required
- 🧹 Clear, Lock, and Reset options built in
- > 🔑 **Password is hashed using SHA-256** — your secret code is never stored in plain text
- > 🛡️ **Messages are AES-GCM encrypted** — stored data is fully encrypted and unreadable without your code

---

## 📁 Project Structure

```
secret-chat/
│
├── index.html    ← Structure & layout (HTML only)
├── style.css     ← All styles & themes
├── app.js        ← All logic & interactivity
├── README.md     ← You are here
└── LICENSE       ← MIT license
```

---

## 🚀 How to Use

1. **Download** or clone this repo
2. **Open** `index.html` in any browser
3. **Set your secret code** on first launch
4. Chat is now hidden — just **start typing your code** anywhere to unlock
5. Type a message and press **Enter** or click ↑ to send

---

## 🔧 How It Works

| File | Responsibility |
|---|---|
| `index.html` | Markup, screen structure, links CSS & JS |
| `style.css` | Variables, layout, animations, components |
| `app.js` | State management, key listener, localStorage |

### Key logic (app.js)

| Feature | How |
|---|---|
| Code detection | `keydown` listener buffers every keystroke |
| Unlock | Buffer matches code → chat screen shown |
| Storage | `localStorage` — `_sc_hash` = SHA-256 hashed code, `_sc_len` = code length, `_msgs` = AES-GCM encrypted messages |
| Lock | Hides chat, re-enables keydown listener |

### 🔐 Security Details

> **Password Hashing** — Your secret code is hashed with SHA-256 via the Web Crypto API before being stored. The raw code is never written to disk or localStorage. On unlock, only the last N typed characters are hashed and compared — the plaintext code never leaves memory.

> **Message Encryption** — Every message is encrypted with AES-GCM (256-bit) using a key derived from your secret code via PBKDF2 (100,000 iterations). Each message gets a unique random IV. Without the correct code, the stored data is completely unreadable.

---

## ⚠️ Notes

- Data stored **in your browser only** — not synced across devices
- Clearing browser cache deletes messages and code
- This is a **privacy tool**, not a security tool

---

## 🌐 Live Demo via GitHub Pages

1. Live at: `https://abhi-yd.github.io/secret-chat/`

---

## 📄 License

MIT — free to use, modify, and share.
