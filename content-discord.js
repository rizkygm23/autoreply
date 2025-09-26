// content-discord.js

// ====================
// Util & reply context
// ====================
async function getNearbyReplies(currentMessage) {
  const replies = [];
  const allMessages = document.querySelectorAll('[id^="chat-messages-"] > div');

  for (const msg of allMessages) {
    if (msg === currentMessage) continue;

    const { contentText, username } = extractMessagePieces(msg);
    if (contentText && username) {
      replies.push({ username, reply: contentText });
    }
    if (replies.length >= 20) break;
  }
  return replies;
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

function showMiniToast(anchorEl, msg = "Copied!") {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.cssText = `
    position: absolute;
    right: 8px; bottom: 100%;
    transform: translateY(-6px);
    background: rgba(0,0,0,.85);
    color: #fff;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    pointer-events: none;
    z-index: 2147483647;
    box-shadow: 0 6px 20px rgba(0,0,0,.25);
  `;
  const host = anchorEl.closest('[class*="channelTextArea"]')
            || anchorEl.closest('[id^="chat-messages-"]')
            || document.body;
  if (host === document.body && getComputedStyle(host).position === "static") {
    document.body.style.position = "relative";
  }
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 1200);
}

function setBtnLoading(btn, isLoading, doneText) {
  if (isLoading) {
    btn.dataset._old = btn.innerText;
    btn.innerText = "⏳ Processing...";
    btn.disabled = true;
    btn.style.opacity = "0.7";
  } else {
    btn.innerText = doneText || btn.dataset._old || "Done";
    setTimeout(() => {
      btn.innerText = btn.dataset._old || "Action";
      btn.disabled = false;
      btn.style.opacity = "1";
    }, 1000);
  }
}

// ===================================================
// Helpers: ambil elemen KONTEN & USERNAME yang benar
// (bukan preview dari replied/quoted message)
// ===================================================
function getMainContentEl(messageEl) {
  const labelled = (messageEl.getAttribute('aria-labelledby') || '').split(/\s+/);
  const contentId = labelled.find(s => s.startsWith('message-content-'));
  if (contentId) {
    const el = document.getElementById(contentId);
    if (el) return el;
  }
  const candidates = Array.from(messageEl.querySelectorAll('[id^="message-content-"]'));
  const filtered = candidates.filter(el => !el.closest('[class*="repliedMessage"]'));
  return filtered.pop() || candidates.pop() || null;
}

function getUsernameEl(messageEl) {
  const labelled = (messageEl.getAttribute('aria-labelledby') || '').split(/\s+/);
  const userId = labelled.find(s => s.startsWith('message-username-'));
  if (userId) {
    const container = document.getElementById(userId);
    if (container) {
      const name = container.querySelector('[class*="username"]');
      if (name) return name;
    }
  }
  return messageEl.querySelector('h3 [class*="username"]');
}

function extractMessagePieces(messageEl) {
  const contentEl = getMainContentEl(messageEl);
  const usernameEl = getUsernameEl(messageEl);
  const contentText = (contentEl?.innerText || '').trim();
  const username = (usernameEl?.innerText || '').trim();
  return { contentEl, usernameEl, contentText, username };
}

// ===== Global Room Selector (single dropdown di header) =====
const ROOM_IDS = ["mmt", "cys","mega", "fgo", "rialo", "lighter"];
let selectedRoomId = (() => {
  try { return localStorage.getItem("geminiSelectedRoom") || ROOM_IDS[0]; } catch { return ROOM_IDS[0]; }
})();

function getSelectedRoomId() {
  return selectedRoomId || ROOM_IDS[0];
}
function setSelectedRoomId(val) {
  selectedRoomId = val;
  try { localStorage.setItem("geminiSelectedRoom", val); } catch {}
  const trigger = document.querySelector(".gemini-room-trigger");
  if (trigger) trigger.textContent = val;
}

// ===== Custom dropdown (portal ke <body>) =====
function createOptionsPortal(items, onSelect) {
  const menu = document.createElement("div");
  menu.className = "gemini-dropdown-portal";
  menu.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    display: none;
    background: #2b2d31;
    border: 1px solid #3b3d43;
    border-radius: 8px;
    min-width: 140px;
    box-shadow: 0 12px 24px rgba(0,0,0,0.45);
    z-index: 2147483647;
    overflow: hidden;
  `;

  items.forEach((id) => {
    const row = document.createElement("div");
    row.textContent = id;
    row.style.cssText = `
      padding: 8px 10px;
      font-size: 12px;
      color: #e7e9ea;
      cursor: pointer;
      transition: background 120ms ease;
      white-space: nowrap;
    `;
    row.addEventListener("mouseenter", () => (row.style.background = "rgba(88,101,242,.2)"));
    row.addEventListener("mouseleave", () => (row.style.background = "transparent"));
    row.addEventListener("click", () => onSelect(id));
    menu.appendChild(row);
  });

  document.body.appendChild(menu);
  return menu;
}

// Inject 1 dropdown ke header server
function injectServerRoomDropdown() {
  const header = document.querySelector("header.header_f37cb1");
  if (!header) return;

  const host = header.querySelector(".headerChildren_f37cb1") || header;
  if (!host || host.querySelector(".gemini-room-trigger")) return;

  const trigger = document.createElement("div");
  trigger.className = "gemini-room-trigger";
  trigger.style.cssText = `
    margin-left: 8px;
    background: #1e1f22;
    color: #e7e9ea;
    border: 1px solid #3b3d43;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    line-height: 18px;
  `;
  trigger.textContent = getSelectedRoomId();

  const menu = createOptionsPortal(ROOM_IDS, (chosen) => {
    setSelectedRoomId(chosen);
    hideMenu();
  });

  function placeMenu() {
    const r = trigger.getBoundingClientRect();
    menu.style.minWidth = Math.max(140, r.width) + "px";
    menu.style.top = window.scrollY + r.bottom + 6 + "px";
    menu.style.left = window.scrollX + r.left + "px";
  }
  function showMenu() { placeMenu(); menu.style.display = "block"; }
  function hideMenu() { menu.style.display = "none"; }

  let hoverInside = false, hideTimer = null;
  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!hoverInside) hideMenu(); }, 150);
  };

  trigger.addEventListener("mouseenter", () => { hoverInside = true; clearTimeout(hideTimer); showMenu(); });
  trigger.addEventListener("mouseleave", () => { hoverInside = false; scheduleHide(); });
  menu.addEventListener("mouseenter", () => { hoverInside = true; clearTimeout(hideTimer); });
  menu.addEventListener("mouseleave", () => { hoverInside = false; scheduleHide(); });

  const onScrollResize = () => { if (menu.style.display === "block") placeMenu(); };
  window.addEventListener("scroll", onScrollResize, true);
  window.addEventListener("resize", onScrollResize);

  host.appendChild(trigger);
}

// ====================
// UI per pesan (rooms)
// ====================
function addReplyButtonToMessage(message) {
  if (!message || message.querySelector(".gemini-reply-wrapper")) return;

  const { contentText } = extractMessagePieces(message);
  if (!contentText) return;

  const caption = contentText;

  const wrapper = document.createElement("div");
  wrapper.className = "gemini-reply-wrapper";
  wrapper.style = "display: flex; flex-direction: column; gap: 6px; margin-top: 6px;";

  const row = document.createElement("div");
  row.style = "display: flex; flex-wrap: wrap; gap: 6px; align-items: center; position: relative;";

  let latestReply = "";

  // ===== Tombol Generate (reply) =====
  const genBtn = document.createElement("button");
  genBtn.innerText = "💬 Generate";
  genBtn.className = "gemini-reply-btn";
  genBtn.style = `
    background: #5865F2;
    color: white;
    border: none;
    padding: 2px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
  `;

  genBtn.onclick = async () => {
    const roomId = getSelectedRoomId();
    if (!roomId) return alert("Pilih room terlebih dahulu (di header).");

    setBtnLoading(genBtn, true);
    try {
      const komentar = await getNearbyReplies(message);
      const res = await fetch("http://localhost:3000/generate-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, roomId, komentar }),
      });

      const data = await res.json();
      latestReply = data.reply || "Gagal generate 😅";

      await copyToClipboard(latestReply);
      showMiniToast(genBtn, "Generated ✓ copied");
      setBtnLoading(genBtn, false, "✅ Done!");
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Gagal menghubungi backend lokal.");
      setBtnLoading(genBtn, false, "❌ Error");
    }
  };

  // (opsional) tombol copy manual
  const copyBtn = document.createElement("button");
  copyBtn.innerText = "📌 Copy Reply";
  copyBtn.style = `
    display: none;
    background: #4caf50;
    color: white;
    border: none;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  copyBtn.onclick = () => { if (latestReply) copyToClipboard(latestReply); };

  row.appendChild(genBtn);
  row.appendChild(copyBtn);
  wrapper.appendChild(row);

  // ===== Section: Generate Topic (pakai room global) =====
  const manualContainer = document.createElement("div");
  manualContainer.style = "display: flex; gap: 6px; flex-wrap: wrap; align-items: center;";

  const captionInput = document.createElement("input");
  captionInput.placeholder = "Optional hint (topic)...";
  captionInput.style = `
    padding: 2px 4px;
    font-size: 12px;
    border: 1px solid #3b3d43;
    background:#1e1f22; color:#e7e9ea;
    border-radius: 4px;
    flex-grow: 1;
    min-width: 160px;
  `;

  const manualBtn = document.createElement("button");
  manualBtn.innerText = "💭 Generate Topic";
  manualBtn.style = `
    background: #333;
    color: white;
    border: none;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;

  manualBtn.onclick = async () => {
    const hint = captionInput.value.trim();
    const roomId = getSelectedRoomId();
    if (!roomId) return alert("Pilih room terlebih dahulu (di header).");

    setBtnLoading(manualBtn, true);
    try {
      const nearby = await getNearbyReplies(message);
      const examples = nearby.slice(0, 10);

      const res = await fetch("http://localhost:3000/generate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, hint, examples }),
      });

      const data = await res.json();
      const out =
        Array.isArray(data.topics) ? data.topics.join("\n")
        : (data.topic || data.text || "");
      latestReply = out || "Gagal generate 😅";

      await copyToClipboard(latestReply);
      showMiniToast(manualBtn, "Topic ✓ copied");
      setBtnLoading(manualBtn, false, "✅ Done!");
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Gagal menghubungi backend lokal.");
      setBtnLoading(manualBtn, false, "❌ Error");
    }
  };

  // Tombol translate & parafrase (tetap)
  const translateBtn = document.createElement("button");
  translateBtn.innerText = "🌐 ke English";
  translateBtn.title = "Translate dari Indonesia ➜ English";
  translateBtn.style = `
    background: #0b8457;
    color: white;
    border: none;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  translateBtn.onclick = async () => {
    const text = captionInput.value.trim();
    if (!text) return alert("Isi dulu teks yang mau diterjemahkan.");
    setBtnLoading(translateBtn, true);
    try {
      const res = await fetch("http://localhost:3000/generate-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data?.text) captionInput.value = data.text;
      setBtnLoading(translateBtn, false, "✅ Translated");
    } catch (e) {
      console.error(e);
      alert("Gagal translate.");
      setBtnLoading(translateBtn, false, "❌ Error");
    }
  };

  const paraphraseBtn = document.createElement("button");
  paraphraseBtn.innerText = "✨ Perbaiki EN";
  paraphraseBtn.title = "Parafrase / perbaiki grammar & wording (English)";
  paraphraseBtn.style = `
    background: #7b3fe4;
    color: white;
    border: none;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  paraphraseBtn.onclick = async () => {
    const text = captionInput.value.trim();
    if (!text) return alert("Isi dulu teks yang mau diperbaiki.");
    setBtnLoading(paraphraseBtn, true);
    try {
      const res = await fetch("http://localhost:3000/generate-parafrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data?.text) captionInput.value = data.text;
      setBtnLoading(paraphraseBtn, false, "✅ Fixed");
    } catch (e) {
      console.error(e);
      alert("Gagal parafrase.");
      setBtnLoading(paraphraseBtn, false, "❌ Error");
    }
  };

  manualContainer.appendChild(captionInput);
  manualContainer.appendChild(manualBtn);
  manualContainer.appendChild(translateBtn);
  manualContainer.appendChild(paraphraseBtn);
  wrapper.appendChild(manualContainer);

  message.appendChild(wrapper);
}

// =====================================
// INLINE TOOLS DI COMPOSER (copy only)
// =====================================
function setBtnBusy(btn, busy, doneText) {
  if (busy) {
    btn.dataset._old = btn.innerText;
    btn.innerText = "⏳";
    btn.disabled = true;
    btn.style.opacity = "0.7";
  } else {
    btn.innerText = doneText || btn.dataset._old || "Done";
    setTimeout(() => {
      btn.innerText = btn.dataset._old || btn.innerText;
      btn.disabled = false;
      btn.style.opacity = "1";
    }, 700);
  }
}

function getActiveComposer() {
  const candidates = Array.from(document.querySelectorAll('div[role="textbox"]'))
    .filter(el => el.isContentEditable && el.offsetParent !== null);
  return candidates[candidates.length - 1] || null;
}

function readComposerText(el) {
  if (!el) return "";
  return (el.innerText || "").trim();
}

function createInlineBtn(label, title, bg) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.title = title || "";
  btn.style.cssText = `
    background: ${bg};
    color: #fff;
    border: none;
    padding: 2px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    line-height: 18px;
  `;
  return btn;
}

function injectComposerToolbar() {
  const composer = getActiveComposer();
  if (!composer) return;

  const container =
    composer.closest('[class*="channelTextArea"]') ||
    composer.parentElement;

  if (!container || container.querySelector(".gemini-inline-toolbar")) return;

  const bar = document.createElement("div");
  bar.className = "gemini-inline-toolbar";
  bar.style.cssText = `
    display: flex; gap: 6px; align-items: center;
    margin-top: 6px; flex-wrap: wrap;
  `;

  const hint = document.createElement("span");
  hint.textContent = "AI tools:";
  hint.style.cssText = "opacity: .7; font-size: 12px;";

  const btnTranslate = createInlineBtn("🌐 EN (Copy)", "Translate ID ➜ EN lalu salin", "#0b8457");
  const btnParaphrase = createInlineBtn("✨ Polish EN (Copy)", "Perbaiki English lalu salin", "#7b3fe4");

  btnTranslate.addEventListener("click", async () => {
    const el = getActiveComposer();
    const text = readComposerText(el);
    if (!text) return alert("Ketik dulu teksnya ya.");

    setBtnBusy(btnTranslate, true);
    try {
      const res = await fetch("http://localhost:3000/generate-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const out = (data && data.text || "").trim();
      if (!out) throw new Error("Empty result");
      await copyToClipboard(out);
      showMiniToast(btnTranslate, "Translated ✓ copied");
      setBtnBusy(btnTranslate, false, "✅");
    } catch (e) {
      console.error(e);
      alert("Gagal translate.");
      setBtnBusy(btnTranslate, false, "❌");
    }
  });

  btnParaphrase.addEventListener("click", async () => {
    const el = getActiveComposer();
    const text = readComposerText(el);
    if (!text) return alert("Ketik dulu teksnya ya.");

    setBtnBusy(btnParaphrase, true);
    try {
      const res = await fetch("http://localhost:3000/generate-parafrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const out = (data && data.text || "").trim();
      await copyToClipboard(out);
      showMiniToast(btnParaphrase, "Polished ✓ copied");
      setBtnBusy(btnParaphrase, false, "✅");
    } catch (e) {
      console.error(e);
      alert("Gagal parafrase.");
      setBtnBusy(btnParaphrase, false, "❌");
    }
  });

  bar.appendChild(hint);
  bar.appendChild(btnTranslate);
  bar.appendChild(btnParaphrase);

  const extrasRow = container.querySelector('[class*="buttons"]') || container;
  extrasRow.parentElement.appendChild(bar);
}

// ===================
// Observers & boot
// ===================
const messageObserver = new MutationObserver(() => {
  const messages = document.querySelectorAll('[id^="chat-messages-"] > div');
  messages.forEach(addReplyButtonToMessage);
});
messageObserver.observe(document.body, { childList: true, subtree: true });

const composerObserver = new MutationObserver(() => {
  try { injectComposerToolbar(); } catch (_) {}
});
composerObserver.observe(document.body, { childList: true, subtree: true });

// Observer untuk inject dropdown di header (satu kali per halaman)
const headerObserver = new MutationObserver(() => {
  try { injectServerRoomDropdown(); } catch (_) {}
});
headerObserver.observe(document.body, { childList: true, subtree: true });

setTimeout(() => {
  document.querySelectorAll('[id^="chat-messages-"] > div').forEach(addReplyButtonToMessage);
  injectComposerToolbar();
  injectServerRoomDropdown();
}, 800);
