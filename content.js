// content.js

// === Data room (inisialisasi di atas sesuai permintaan)
const ROOMS = ["rialo","lighter", "mmt", "cys", "mega", "fgo"];

// Ambil komentar dari tweet lain (maks 20)
async function getTweetReplies(currentTweet) {
  const replies = [];
  const allArticles = document.querySelectorAll("article");

  for (const article of allArticles) {
    if (article === currentTweet) continue;

    const textEl = article.querySelector("div[lang]");
    const usernameEl = article.querySelector("a[role='link'] span");

    if (textEl && usernameEl) {
      const text = textEl.innerText.trim();
      const username = usernameEl.innerText.replace("@", "").trim();

      if (text && username) {
        replies.push({ username, reply: text });
      }
    }

    if (replies.length >= 20) break;
  }

  return replies;
}

// Proses generate ke backend
async function handleGenerate({ tweet, tweetText, roomId, btn }) {
  const originalText = btn.innerText;
  btn.innerText = "⏳ Generating...";
  btn.disabled = true;
  btn.style.opacity = "0.7";

  try {
    const komentar = await getTweetReplies(tweet);

    const res = await fetch("http://localhost:3000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: tweetText,
        roomId,
        komentar,
      }),
    });

    const data = await res.json();
    const reply = data.reply || "Gagal generate 😅";

    // Buka composer balasan
    const replyBtn = tweet.querySelector('[data-testid="reply"]');
    if (replyBtn) replyBtn.click();

    setTimeout(() => {
      const input = document.querySelector('div[role="textbox"]');
      if (input) {
        input.focus();
        document.execCommand("insertText", false, reply);
      }
    }, 600);

    btn.innerText = "✅ Done!";
  } catch (error) {
    console.error("Gagal generate reply:", error);
    btn.innerText = "❌ Error";
    alert("Gagal menghubungi backend lokal.");
  } finally {
    setTimeout(() => {
      btn.innerText = originalText;
      btn.disabled = false;
      btn.style.opacity = "1";
    }, 1200);
  }
}

// === Util: buat menu opsi yang dipasang ke <body> (portal) agar tidak ketiban
function createOptionsPortal(items, onSelect) {
  const menu = document.createElement("div");
  menu.className = "gemini-dropdown-portal";
  menu.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    display: none;
    background: #15202b;
    border: 1px solid #2f3336;
    border-radius: 8px;
    min-width: 140px;
    box-shadow: 0 12px 24px rgba(0,0,0,0.45);
    z-index: 2147483647; /* very high */
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
    row.addEventListener("mouseenter", () => (row.style.background = "#1d9bf033"));
    row.addEventListener("mouseleave", () => (row.style.background = "transparent"));
    row.addEventListener("click", () => onSelect(id));
    menu.appendChild(row);
  });

  document.body.appendChild(menu);
  return menu;
}

// Tambahkan dropdown room ke tweet (custom dropdown; auto-open saat hover)
function addReplyButtonToTweet(tweet) {
  if (tweet.querySelector(".gemini-reply-wrapper")) return;

  const textElement = tweet.querySelector("div[lang]");
  if (!textElement) return;

  const tweetText = textElement.innerText;

  // Wrapper UI
  const wrapper = document.createElement("div");
  wrapper.className = "gemini-reply-wrapper";
  wrapper.style = `
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
    align-items: center;
    position: relative;
  `;

  // Trigger dropdown (div, bukan <select>)
  const trigger = document.createElement("div");
  trigger.className = "gemini-dropdown-trigger";
  trigger.style = `
    position: relative;
    background: #0f1419;
    color: #e7e9ea;
    border: 1px solid #2f3336;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
  `;
  trigger.innerText = "Pilih room…";

  // Portal menu di body
  const menu = createOptionsPortal(ROOMS, (chosen) => {
    trigger.innerText = chosen;
    trigger.dataset.value = chosen;
    hideMenu();
  });

  // Posisi menu relatif ke trigger
  let hoverInside = false;
  let hideTimer = null;

  function placeMenu() {
    const r = trigger.getBoundingClientRect();
    menu.style.minWidth = Math.max(140, r.width) + "px";
    menu.style.top = window.scrollY + r.bottom + 6 + "px";
    menu.style.left = window.scrollX + r.left + "px";
  }

  function showMenu() {
    placeMenu();
    menu.style.display = "block";
  }
  function hideMenu() {
    menu.style.display = "none";
  }

  // Hover logic — shared state + sedikit delay supaya tidak “ketutup” saat pindah ke menu
  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!hoverInside) hideMenu();
    }, 150);
  };

  trigger.addEventListener("mouseenter", () => {
    hoverInside = true;
    clearTimeout(hideTimer);
    showMenu();
  });
  trigger.addEventListener("mouseleave", () => {
    hoverInside = false;
    scheduleHide();
  });

  menu.addEventListener("mouseenter", () => {
    hoverInside = true;
    clearTimeout(hideTimer);
  });
  menu.addEventListener("mouseleave", () => {
    hoverInside = false;
    scheduleHide();
  });

  // Update posisi saat scroll/resize
  const onScrollResize = () => {
    if (menu.style.display === "block") placeMenu();
  };
  window.addEventListener("scroll", onScrollResize, true);
  window.addEventListener("resize", onScrollResize);

  // Tombol generate
  const genBtn = document.createElement("button");
  genBtn.innerText = "💬 Generate";
  genBtn.className = "gemini-room-btn";
  genBtn.style = `
    background: #1d9bf0;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  genBtn.addEventListener("click", () => {
    const roomId = trigger.dataset.value;
    if (!roomId) {
      alert("Pilih room terlebih dahulu.");
      return;
    }
    handleGenerate({ tweet, tweetText, roomId, btn: genBtn });
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(genBtn);

  // Sisipkan setelah bagian footer tweet
  const footer = tweet.querySelector('[role="group"]');
  if (footer && footer.parentElement) {
    footer.parentElement.appendChild(wrapper);
  } else {
    tweet.appendChild(wrapper); // fallback
  }

  // Cleanup menu jika tweet dihapus dari DOM
  const cleanupObserver = new MutationObserver(() => {
    if (!document.body.contains(wrapper)) {
      menu.remove();
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  console.log("[Gemini Extension] Dropdown room (hover, portal) ditambahkan:", ROOMS.join(", "));
}

// Pantau tweet baru muncul
const observer = new MutationObserver(() => {
  const tweets = document.querySelectorAll("article");
  tweets.forEach((tweet) => addReplyButtonToTweet(tweet));
});

// Jalankan saat halaman dimuat
window.addEventListener("load", () => {
  document.querySelectorAll("article").forEach((tweet) => {
    addReplyButtonToTweet(tweet);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[Gemini Extension] Aktif memantau tweet.");
});
