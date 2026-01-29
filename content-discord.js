// content-discord.js - Discord Integration (No Auth Required)

// === Configuration ===
const CONFIG = {
  ROOMS: [],
  MAX_REPLIES: 20,
  API_BASE_URL: "http://localhost:3000", // Default, will be loaded from project.json
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  THEME: {
    primary: "#5865F2",
    secondary: "#2b2d31",
    accent: "rgba(88,101,242,.2)",
    text: "#e7e9ea",
    border: "#3b3d43",
    success: "#00ba7c",
    error: "#f4212e",
    warning: "#ffd400"
  }
};

// Project data loaded from project.json
let projectData = null;
let roomInfoMap = {};
let sessionGenerateCount = 0;

// Embedded fallback data
const FALLBACK_PROJECT_DATA = {
  "apiBaseUrl": "http://localhost:3000",
  "rooms": [
    { "id": "rialo", "icon": "🏛️", "name": "Rialo", "desc": "Rialo Community", "emojis": [], "vocab": ["Rialo", "gm", "fam"] },
    { "id": "lighter", "icon": "💡", "name": "Lighter", "desc": "Lighter Community", "emojis": [], "vocab": ["Lighter", "gm", "fam"] },
    { "id": "creek", "icon": "🌊", "name": "Creek", "desc": "Creek Community", "emojis": [], "vocab": ["Creek", "gm", "fam"] },
    { "id": "cys", "icon": "🎯", "name": "Cysic", "desc": "Cysic Community", "emojis": [":CysicSymbol_Coloronwhite2x:", ":pepeLove:", ":pepe_pray:", ":pogcat:"], "vocab": ["Cysors", "gmsor", "fam", "gm", "wen", "zk"] },
    { "id": "town", "icon": "🏘️", "name": "Town", "desc": "Town Community", "emojis": [], "vocab": ["Town", "gm", "fam"] },
    { "id": "fgo", "icon": "🎮", "name": "FGO", "desc": "FGO Community", "emojis": [], "vocab": ["Fogo", "gm", "fam"] },
    { "id": "mmt", "icon": "🚀", "name": "MMT", "desc": "MMT Community", "emojis": [], "vocab": ["MMT", "fam", "gm"] },
    { "id": "mega", "icon": "⚡", "name": "Mega", "desc": "Mega Community", "emojis": [], "vocab": ["Mega", "gm", "fam"] },
    { "id": "seismic", "icon": "🌍", "name": "Seismic", "desc": "Seismic Community", "emojis": [], "vocab": ["Seismic", "gm", "fam"] }
  ]
};

// Process project data into CONFIG
function processProjectData(data) {
  // Load API URL from project.json
  if (data.apiBaseUrl) {
    CONFIG.API_BASE_URL = data.apiBaseUrl;
    console.log('[Gemini Discord] API URL loaded:', CONFIG.API_BASE_URL);
  }

  if (data.rooms && Array.isArray(data.rooms)) {
    CONFIG.ROOMS = data.rooms.map(room => room.id);

    // Build roomInfoMap for quick lookup
    roomInfoMap = {};
    data.rooms.forEach(room => {
      roomInfoMap[room.id] = {
        icon: room.icon || "💬",
        name: room.name || room.id,
        desc: room.desc || `${room.name || room.id} Community`
      };
    });

    console.log('[Gemini Discord] Loaded', CONFIG.ROOMS.length, 'rooms');
    return true;
  }
  return false;
}

// Load project.json data
async function loadProjectData() {
  try {
    const url = chrome.runtime.getURL('project.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    projectData = await response.json();

    if (processProjectData(projectData)) {
      console.log('[Gemini Discord] ✅ project.json loaded successfully');
      return;
    } else {
      throw new Error('Invalid project.json structure');
    }
  } catch (error) {
    console.warn('[Gemini Discord] ⚠️ Failed to load project.json:', error.message);
    console.log('[Gemini Discord] Using fallback data');
    projectData = FALLBACK_PROJECT_DATA;
    processProjectData(projectData);
  }
}

// Dynamically supplied rooms from Supabase user.user_room
let dynamicRooms = null;
function getAvailableRooms() {
  return Array.isArray(dynamicRooms) && dynamicRooms.length > 0 ? dynamicRooms : CONFIG.ROOMS;
}

// Get room info from project.json data
function getRoomInfo(roomId) {
  return roomInfoMap[roomId] || { icon: "💬", name: roomId, desc: `${roomId} Community` };
}

async function initRoomsFromUser() { }

// === Enhanced Storage & Settings
class ExtensionSettings {
  constructor() {
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem('geminiExtensionSettings');
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch {
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      autoGenerate: false,
      showPreview: true,
      maxReplies: 20,
      selectedRoom: CONFIG.ROOMS[0],
      theme: 'dark',
      notifications: true,
      analytics: true,
      autoPaste: false,
      openComposer: true
    };
  }

  saveSettings() {
    try {
      localStorage.setItem('geminiExtensionSettings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }
}

const settings = new ExtensionSettings();

// === Enhanced Analytics & Tracking
class Analytics {
  constructor() {
    this.events = this.loadEvents();
  }

  loadEvents() {
    try {
      const stored = localStorage.getItem('geminiAnalytics');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveEvents() {
    try {
      localStorage.setItem('geminiAnalytics', JSON.stringify(this.events));
    } catch (e) {
      console.warn('Failed to save analytics:', e);
    }
  }

  track(event, data = {}) {
    if (!settings.get('analytics')) return;

    const eventData = {
      timestamp: Date.now(),
      event,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: 'discord'
    };

    this.events.push(eventData);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    this.saveEvents();
  }

  getStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);

    const recent = this.events.filter(e => e.timestamp > last24h);
    const weekly = this.events.filter(e => e.timestamp > last7d);

    return {
      total: this.events.length,
      last24h: recent.length,
      last7d: weekly.length,
      byEvent: this.events.reduce((acc, e) => {
        acc[e.event] = (acc[e.event] || 0) + 1;
        return acc;
      }, {}),
      byRoom: this.events
        .filter(e => e.data.roomId)
        .reduce((acc, e) => {
          acc[e.data.roomId] = (acc[e.data.roomId] || 0) + 1;
          return acc;
        }, {})
    };
  }
}

const analytics = new Analytics();

// === Enhanced Error Handling & Retry Logic
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      analytics.track('api_request_start', { endpoint, retryCount, platform: 'discord' });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error message from response body
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (parseErr) {
          // Ignore JSON parse error, use default message
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      analytics.track('api_request_success', { endpoint, retryCount, platform: 'discord' });

      return data;
    } catch (error) {
      analytics.track('api_request_error', {
        endpoint,
        retryCount,
        error: error.message,
        platform: 'discord'
      });

      if (retryCount < CONFIG.RETRY_ATTEMPTS && this.shouldRetry(error)) {
        await this.delay(CONFIG.RETRY_DELAY * (retryCount + 1));
        return this.request(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  shouldRetry(error) {
    // Retry on network errors
    if (error.name === 'AbortError' ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')) {
      return true;
    }

    // Also retry when response is too similar to recent (server detected duplicate)
    if (error.message.includes('too similar') ||
      error.message.includes('duplicate') ||
      error.message.includes('Response too similar')) {
      console.log('[Gemini Discord] 🔄 Retrying due to duplicate response...');
      return true;
    }

    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const apiClient = new ApiClient(CONFIG.API_BASE_URL);

// ====================
// Enhanced Util & reply context
// ====================
// === Enhanced Message Analysis with Better Context
async function getNearbyReplies(currentMessage) {
  const replies = [];
  const maxReplies = settings.get('maxReplies') || CONFIG.MAX_REPLIES;

  // Multiple strategies to find messages
  const messageSelectors = [
    '[id^="chat-messages-"] > div',
    '[class*="message"]',
    '[data-list-item-id*="chat-messages"]'
  ];

  let allMessages = [];

  // Try each selector strategy
  for (const selector of messageSelectors) {
    try {
      allMessages = document.querySelectorAll(selector);
      if (allMessages.length > 0) {
        console.log(`[Gemini Discord] Found ${allMessages.length} messages using selector: ${selector}`);
        break;
      }
    } catch (e) {
      console.warn(`[Gemini Discord] Selector failed: ${selector}`, e);
    }
  }

  for (const msg of allMessages) {
    if (msg === currentMessage) continue;

    const { contentText, username } = extractMessagePieces(msg);
    if (contentText && username && contentText.length > 3) {
      // Add timestamp and engagement data if available
      const timestamp = msg.querySelector('time')?.getAttribute('datetime');
      const reactions = msg.querySelectorAll('[class*="reaction"]');
      const reactionCount = reactions.length;

      replies.push({
        username,
        reply: contentText,
        timestamp,
        reactions: reactionCount,
        engagement: reactionCount
      });
    }
    if (replies.length >= maxReplies) break;
  }

  // Sort by engagement for better context
  replies.sort((a, b) => b.engagement - a.engagement);

  analytics.track('discord_messages_collected', {
    count: replies.length,
    maxReplies,
    platform: 'discord'
  });

  console.log(`[Gemini Discord] Total messages collected: ${replies.length}`);
  return replies;
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

// === Enhanced Notification System
// === Fallback Simple Login Modal for Discord
function showSimpleLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'gemini-simple-login';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      background: #2b2d31;
      border: 1px solid #3b3d43;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    ">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #e7e9ea; margin: 0; font-size: 20px;">🚀 Login to Gemini</h2>
        <p style="color: #888; margin: 8px 0 0 0; font-size: 14px;">Enter your credentials to continue</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; color: #e7e9ea; margin-bottom: 8px; font-size: 14px;">Email Address</label>
        <input type="email" id="simpleEmail" placeholder="your@email.com" style="
          width: 100%;
          padding: 12px;
          border: 1px solid #333;
          border-radius: 6px;
          background: #2a2a2a;
          color: #e7e9ea;
          font-size: 14px;
          box-sizing: border-box;
        ">
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; color: #e7e9ea; margin-bottom: 8px; font-size: 14px;">Password</label>
        <input type="password" id="simplePassword" placeholder="Enter your password" style="
          width: 100%;
          padding: 12px;
          border: 1px solid #333;
          border-radius: 6px;
          background: #2a2a2a;
          color: #e7e9ea;
          font-size: 14px;
          box-sizing: border-box;
        ">
      </div>
      
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <button id="simpleLogin" style="
          flex: 1;
          background: #5865F2;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">🔑 Login</button>
        <button id="simpleRegister" style="
          flex: 1;
          background: #00ba7c;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">📝 Register</button>
      </div>
      
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <button id="simpleCancel" style="
          flex: 1;
          background: #333;
          color: #e7e9ea;
          border: none;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
      </div>
      
      <div style="text-align: center; color: #888; font-size: 12px;">
        <p>New users get 200,000 free tokens!</p>
        <p>Each AI request costs 100 tokens</p>
      </div>
    </div>
  `;

  // Event listeners
  modal.querySelector('#simpleCancel').onclick = () => modal.remove();
  // Login handler
  modal.querySelector('#simpleLogin').onclick = async () => {
    const email = modal.querySelector('#simpleEmail').value.trim();
    const password = modal.querySelector('#simplePassword').value.trim();

    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    const loginBtn = modal.querySelector('#simpleLogin');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = '⏳ Logging in...';
    loginBtn.disabled = true;

    try {
      console.log('[Gemini Discord] Attempting login for:', email);
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('[Gemini Discord] Login response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[Gemini Discord] Login response data:', data);

        if (data.user) {
          // Store user data
          await chrome.storage.local.set({ geminiUser: data.user });
          console.log('[Gemini Discord] User data stored:', data.user);
          modal.remove();
          showNotification('Login successful! Welcome to Gemini Auto Reply!', 'success');

          // Notify content scripts about login
          chrome.runtime.sendMessage({ type: 'USER_LOGGED_IN', user: data.user });

          // Retry the original action
          if (originalAction) {
            originalAction();
          }
        } else {
          console.error('[Gemini Discord] No user data in response:', data);
          alert('Login failed. Invalid response from server.');
        }
      } else {
        const errorData = await response.json();
        console.error('[Gemini Discord] Login failed:', errorData);
        alert(errorData.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('[Gemini Discord] Login error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('Login failed. Please check your internet connection and try again.');
      } else {
        alert('Login failed. Please try again.');
      }
    } finally {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  };

  // Register handler
  modal.querySelector('#simpleRegister').onclick = async () => {
    const email = modal.querySelector('#simpleEmail').value.trim();
    const password = modal.querySelector('#simplePassword').value.trim();

    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    const registerBtn = modal.querySelector('#simpleRegister');
    const originalText = registerBtn.textContent;
    registerBtn.textContent = '⏳ Registering...';
    registerBtn.disabled = true;

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data
        await chrome.storage.local.set({ geminiUser: data.user });
        modal.remove();
        showNotification('Registration successful! Welcome to Gemini Auto Reply!', 'success');

        // Retry the original action
        if (originalAction) {
          originalAction();
        }
      } else if (data.user) {
        // User exists, login instead
        await chrome.storage.local.set({ geminiUser: data.user });
        modal.remove();
        showNotification('User already exists! Logged in successfully.', 'success');

        // Retry the original action
        if (originalAction) {
          originalAction();
        }
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;
    }
  };

  // Close on outside click
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);

  // Focus email input
  setTimeout(() => {
    modal.querySelector('#simpleEmail').focus();
  }, 100);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? CONFIG.THEME.success : type === 'error' ? CONFIG.THEME.error : CONFIG.THEME.primary};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
    max-width: 300px;
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
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

// === Global Room Selector for Discord (Fixed Position)
let globalRoomSelector = null;

function updateCounterUI() {
  const el = document.getElementById('gemini-generate-counter');
  if (el) el.innerText = sessionGenerateCount;
  // Also update inside the selector if it was just re-rendered
  // actually innerText check is enough if ID is unique
}

function incrementCounter() {
  sessionGenerateCount++;
  updateCounterUI();
}

function createGlobalRoomSelector() {
  if (globalRoomSelector) return globalRoomSelector;

  const selectedRoom = settings.get('selectedRoom') || getAvailableRooms()[0];

  // Create global room selector
  const selector = document.createElement("div");
  selector.className = "gemini-global-room-selector";
  selector.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 12px;
    padding: 12px 16px;
    z-index: 2147483646;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: all 0.3s ease;
  `;

  // Room info from project.json
  const currentRoom = getRoomInfo(selectedRoom);

  selector.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">${currentRoom.icon}</span>
      <span style="color: ${CONFIG.THEME.text}; font-size: 14px; font-weight: 500;">${currentRoom.name}</span>
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
      <div id="gemini-generate-counter" title="Session Generations" style="
        background: rgba(0,0,0,0.2);
        color: ${CONFIG.THEME.success};
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        border: 1px solid ${CONFIG.THEME.border};
        min-width: 20px;
        text-align: center;
      ">${sessionGenerateCount}</div>
      <div class="gemini-room-dropdown-trigger" style="
        background: ${CONFIG.THEME.primary};
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      ">Change</div>
      <button class="gemini-analytics-btn" style="
        background: ${CONFIG.THEME.border};
        color: ${CONFIG.THEME.text};
        border: none;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
      " title="Analytics & Settings">📊</button>
    </div>
  `;

  // Create dropdown menu
  const menu = createOptionsPortal(getAvailableRooms(), (chosen) => {
    const room = getRoomInfo(chosen);
    selector.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${room.icon}</span>
        <span style="color: ${CONFIG.THEME.text}; font-size: 14px; font-weight: 500;">${room.name}</span>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        <div id="gemini-generate-counter" title="Session Generations" style="
          background: rgba(0,0,0,0.2);
          color: ${CONFIG.THEME.success};
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          border: 1px solid ${CONFIG.THEME.border};
          min-width: 20px;
          text-align: center;
        ">${sessionGenerateCount}</div>
        <div class="gemini-room-dropdown-trigger" style="
          background: ${CONFIG.THEME.primary};
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        ">Change</div>
        <button class="gemini-analytics-btn" style="
          background: ${CONFIG.THEME.border};
          color: ${CONFIG.THEME.text};
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        " title="Analytics & Settings">📊</button>
      </div>
    `;
    settings.set('selectedRoom', chosen);
    hideMenu();

    // Update all existing message interfaces
    updateAllMessageInterfaces();

    if (settings.get('notifications')) {
      showNotification(`Room changed to ${room.name}`, "success");
    }
  });

  // Hover effects
  selector.addEventListener('mouseenter', () => {
    selector.style.transform = 'translateY(-2px)';
    selector.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)';
  });

  selector.addEventListener('mouseleave', () => {
    selector.style.transform = 'translateY(0)';
    selector.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
  });

  // Dropdown positioning
  function placeMenu() {
    const r = selector.getBoundingClientRect();
    menu.style.minWidth = Math.max(160, r.width) + "px";
    menu.style.top = window.scrollY + r.bottom + 6 + "px";
    menu.style.right = window.innerWidth - r.right + "px";
  }

  function showMenu() {
    placeMenu();
    menu.style.display = "block";
  }

  function hideMenu() {
    menu.style.display = "none";
  }

  // Click to show dropdown
  selector.addEventListener('click', (e) => {
    if (e.target.classList.contains('gemini-room-dropdown-trigger')) {
      showMenu();
    } else if (e.target.classList.contains('gemini-analytics-btn')) {
      console.log('📊 Discord Analytics & Settings button clicked from room selector');
      showAnalyticsPanel();
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!selector.contains(e.target) && !menu.contains(e.target)) {
      hideMenu();
    }
  });

  // Update position on scroll/resize
  const onScrollResize = () => {
    if (menu.style.display === "block") placeMenu();
  };
  window.addEventListener("scroll", onScrollResize, true);
  window.addEventListener("resize", onScrollResize);

  document.body.appendChild(selector);
  globalRoomSelector = selector;

  analytics.track('global_room_selector_created', { selectedRoom, platform: 'discord' });

  return selector;
}

// === Update all message interfaces when room changes
function updateAllMessageInterfaces() {
  const wrappers = document.querySelectorAll('.gemini-reply-wrapper');
  wrappers.forEach(wrapper => {
    const currentRoomId = settings.get('selectedRoom') || getAvailableRooms()[0];
    const room = getRoomInfo(currentRoomId);

    // Update any room display in the wrapper if exists
    const roomDisplay = wrapper.querySelector('.current-room-display');
    if (roomDisplay) {
      roomDisplay.innerHTML = `
        <span style="font-size: 12px; opacity: 0.7;">Current Room:</span>
        <span style="font-size: 14px;">${room.icon} ${room.name}</span>
      `;
    }
  });
}

function getSelectedRoomId() {
  return settings.get('selectedRoom') || getAvailableRooms()[0];
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


// ====================
// Enhanced UI per pesan (rooms)
// ====================
function addReplyButtonToMessage(message) {
  if (!message || message.querySelector(".gemini-reply-wrapper")) return;

  const { contentText, username } = extractMessagePieces(message);
  if (!contentText) return;

  const caption = contentText;
  const currentRoomId = settings.get('selectedRoom') || getAvailableRooms()[0];
  const room = getRoomInfo(currentRoomId);

  const wrapper = document.createElement("div");
  wrapper.className = "gemini-reply-wrapper";
  wrapper.style.cssText = `
    display: flex; 
    flex-direction: column; 
    gap: 8px; 
    margin-top: 8px;
    padding: 12px;
    background: rgba(30, 31, 34, 0.8);
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 8px;
    backdrop-filter: blur(5px);
  `;

  // Current room display
  const roomDisplay = document.createElement("div");
  roomDisplay.className = "current-room-display";
  roomDisplay.style.cssText = `
    display: flex; 
    align-items: center; 
    gap: 6px; 
    font-size: 12px; 
    color: ${CONFIG.THEME.text};
    opacity: 0.8;
  `;
  roomDisplay.innerHTML = `
    <span>Current Room:</span>
    <span style="font-weight: 500;">${room.icon} ${room.name}</span>
  `;

  const row = document.createElement("div");
  row.style.cssText = `
    display: flex; 
    flex-wrap: wrap; 
    gap: 8px; 
    align-items: center; 
    position: relative;
  `;

  let latestReply = "";

  // ===== Enhanced Generate Button =====
  const genBtn = document.createElement("button");
  genBtn.innerText = "💬 Generate Reply";
  genBtn.className = "gemini-reply-btn";
  genBtn.style.cssText = `
    background: ${CONFIG.THEME.primary};
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  `;

  genBtn.addEventListener('mouseenter', () => {
    genBtn.style.transform = 'translateY(-1px)';
    genBtn.style.boxShadow = '0 4px 12px rgba(88, 101, 242, 0.3)';
  });

  genBtn.addEventListener('mouseleave', () => {
    genBtn.style.transform = 'translateY(0)';
    genBtn.style.boxShadow = 'none';
  });

  genBtn.onclick = async () => {
    // No authentication required in local mode

    const roomId = getSelectedRoomId();
    if (!roomId) {
      showNotification("Please select a room first", "error");
      return;
    }

    analytics.track('discord_generate_start', { roomId, platform: 'discord' });
    setBtnLoading(genBtn, true);

    try {
      const startTime = Date.now();
      const komentar = await getNearbyReplies(message);

      // Use direct API request with userId
      const response = await fetch(`${CONFIG.API_BASE_URL}/generate-discord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, roomId, komentar, username })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data;
        if (response.status === 402) {
          // Insufficient tokens
          showNotification(`Insufficient tokens! You have ${errorData.currentTokens} tokens, need ${errorData.requiredTokens}. Please top up your account.`, "error");
          window.geminiAuthUI.showUserInfo();
          return;
        } else if (response.status === 404) {
          showNotification("User not found. Please login again.", "error");
          window.geminiAuthUI.showAuthModal();
          return;
        } else {
          throw new Error(errorData.error || 'Request failed');
        }
      }

      const generationTime = Date.now() - startTime;
      latestReply = data.reply || "Failed to generate reply 😅";

      await copyToClipboard(latestReply);

      analytics.track('discord_generate_success', { roomId, generationTime, replyLength: latestReply.length, platform: 'discord' });

      if (settings.get('notifications')) showNotification("Reply generated!", "success");

      setBtnLoading(genBtn, false, "✅ Done!");
      incrementCounter();
    } catch (err) {
      console.error("❌ Error:", err);
      analytics.track('discord_generate_error', {
        roomId,
        error: err.message,
        platform: 'discord'
      });

      if (settings.get('notifications')) {
        showNotification("Failed to generate reply. Please try again.", "error");
      } else {
        alert("Failed to connect to backend.");
      }
      setBtnLoading(genBtn, false, "❌ Error");
    }
  };

  // ===== Quick Chat Templates (Personal Conversation Starters) =====
  const QUICK_CHAT_TEMPLATES = [
    { id: 'how_are_you', label: '👋 Tanya Kabar', desc: "Tanya gimana kabarnya hari ini" },
    { id: 'how_long', label: '📅 Berapa Lama Disini', desc: "Tanya sudah berapa lama di komunitas" },
    { id: 'origin', label: '🌍 Dari Mana', desc: "Tanya dia dari mana asalnya" },
    { id: 'fav_food', label: '🍜 Makanan Favorit', desc: "Tanya makanan favorit dari tempatnya" },
    { id: 'weather', label: '🌤️ Cuaca Disana', desc: "Tanya cuaca atau waktu di tempatnya" },
    { id: 'job', label: '💼 Kerjaan', desc: "Tanya kerja apa atau background-nya" },
    { id: 'hobby', label: '🎮 Hobi', desc: "Tanya hobi atau kegiatan favorit" },
    { id: 'music', label: '🎵 Musik', desc: "Tanya genre musik favorit" },
    { id: 'gaming', label: '🕹️ Gaming', desc: "Tanya main game apa" },
    { id: 'coffee_tea', label: '☕ Kopi atau Teh', desc: "Tanya lebih suka kopi atau teh" },
    { id: 'night_owl', label: '🦉 Night Owl', desc: "Tanya tipe begadang atau bangun pagi" },
    { id: 'weekend', label: '🏖️ Weekend', desc: "Tanya rencana weekend atau aktivitas" },
    { id: 'pet', label: '🐱 Peliharaan', desc: "Tanya punya hewan peliharaan tidak" },
    { id: 'travel', label: '✈️ Travel', desc: "Tanya tempat yg ingin dikunjungi" },
    { id: 'movie', label: '🎬 Film/Series', desc: "Tanya film atau series favorit" }
  ];

  // ===== Quick Actions with Dropdown =====
  const quickContainer = document.createElement("div");
  quickContainer.style.cssText = `position: relative; display: inline-block;`;

  const quickBtn = document.createElement("button");
  quickBtn.innerText = "⚡ Quick ▾";
  quickBtn.style.cssText = `
    background: ${CONFIG.THEME.success};
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  `;

  // Create dropdown menu for quick chat (appended to body for proper z-index)
  const quickDropdown = document.createElement("div");
  quickDropdown.className = "gemini-quick-dropdown";
  quickDropdown.style.cssText = `
    position: fixed;
    background: #2b2d31;
    border: 1px solid #3b3d43;
    border-radius: 8px;
    min-width: 250px;
    max-height: 350px;
    overflow-y: auto;
    box-shadow: 0 12px 24px rgba(0,0,0,0.6);
    z-index: 2147483647;
    display: none;
  `;

  // Append dropdown to body for proper layering
  document.body.appendChild(quickDropdown);

  // Add quick chat template options
  QUICK_CHAT_TEMPLATES.forEach((template) => {
    const option = document.createElement("div");
    option.style.cssText = `
      padding: 10px 12px;
      font-size: 12px;
      color: #e7e9ea;
      cursor: pointer;
      transition: background 120ms ease;
      white-space: nowrap;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-bottom: 1px solid #3b3d4355;
    `;
    option.innerHTML = `
      <span style="font-weight: 500;">${template.label}</span>
      <span style="font-size: 10px; opacity: 0.7; white-space: normal;">${template.desc}</span>
    `;

    option.addEventListener("mouseenter", () => (option.style.background = "rgba(88,101,242,.2)"));
    option.addEventListener("mouseleave", () => (option.style.background = "transparent"));

    option.addEventListener("click", async () => {
      quickDropdown.style.display = "none";

      const roomId = getSelectedRoomId();
      if (!roomId) {
        showNotification("Please select a room first", "error");
        return;
      }

      setBtnLoading(quickBtn, true);
      try {
        // Use direct fetch with CONFIG.API_BASE_URL (updated after project.json load)
        const response = await fetch(`${CONFIG.API_BASE_URL}/generate-quick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption,
            roomId,
            username,
            quickTemplate: template.id,
            quickMessage: template.desc // Send desc as fallback context
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        latestReply = data.reply;
        if (!latestReply) {
          throw new Error("No reply generated");
        }

        await copyToClipboard(latestReply);

        if (settings.get('notifications')) {
          showNotification(`Quick chat "${template.label}" copied!`, "success");
        }

        setBtnLoading(quickBtn, false, "✅");
        incrementCounter();
      } catch (err) {
        console.error("Quick generate error:", err);
        showNotification(`Failed to generate: ${err.message}`, "error");
        setBtnLoading(quickBtn, false, "❌");
      }
    });

    quickDropdown.appendChild(option);
  });

  // Remove last border
  if (quickDropdown.lastChild) {
    quickDropdown.lastChild.style.borderBottom = "none";
  }

  // Toggle dropdown on button click with dynamic positioning
  quickBtn.onclick = (e) => {
    e.stopPropagation();
    const isVisible = quickDropdown.style.display === "block";

    // Close all other quick dropdowns first
    document.querySelectorAll('.gemini-quick-dropdown').forEach(dd => {
      dd.style.display = "none";
    });

    if (!isVisible) {
      // Calculate position based on button location
      const btnRect = quickBtn.getBoundingClientRect();
      const dropdownHeight = 350; // max-height
      const viewportHeight = window.innerHeight;

      // Check if dropdown would go below viewport
      const spaceBelow = viewportHeight - btnRect.bottom;
      const spaceAbove = btnRect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Show above the button
        quickDropdown.style.top = "auto";
        quickDropdown.style.bottom = (viewportHeight - btnRect.top + 4) + "px";
      } else {
        // Show below the button (default)
        quickDropdown.style.top = (btnRect.bottom + 4) + "px";
        quickDropdown.style.bottom = "auto";
      }

      quickDropdown.style.left = btnRect.left + "px";
      quickDropdown.style.display = "block";
    } else {
      quickDropdown.style.display = "none";
    }
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!quickContainer.contains(e.target) && !quickDropdown.contains(e.target)) {
      quickDropdown.style.display = "none";
    }
  });

  // Close dropdown on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      quickDropdown.style.display = "none";
    }
  });

  quickContainer.appendChild(quickBtn);
  // Note: quickDropdown is appended to document.body above for proper z-index

  // Settings button removed - functionality moved to Analytics panel

  // ===== Debug Button =====
  const debugBtn = document.createElement("button");
  debugBtn.innerText = "🐛 Debug";
  debugBtn.style.cssText = `
    background: ${CONFIG.THEME.warning};
    color: #000;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
  `;
  debugBtn.onclick = () => debugMessageDetection(message);

  row.appendChild(genBtn);
  row.appendChild(quickContainer);
  row.appendChild(debugBtn);

  wrapper.appendChild(roomDisplay);
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

      const res = await fetch(`${CONFIG.API_BASE_URL}/generate-topic`, {
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
      incrementCounter();
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
      const res = await fetch(`${CONFIG.API_BASE_URL}/generate-translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data?.text) captionInput.value = data.text;
      setBtnLoading(translateBtn, false, "✅ Translated");
      incrementCounter();
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
      const res = await fetch(`${CONFIG.API_BASE_URL}/generate-parafrase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data?.text) captionInput.value = data.text;
      setBtnLoading(paraphraseBtn, false, "✅ Fixed");
      incrementCounter();
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

// === Settings Panel for Discord
function showSettingsPanel() {
  console.log('🔧 showSettingsPanel called');

  // Remove existing panel if any
  const existing = document.querySelector('.gemini-settings-panel');
  if (existing) {
    console.log('🗑️ Removing existing settings panel');
    existing.remove();
    return;
  }

  console.log('🆕 Creating new settings panel');

  const panel = document.createElement('div');
  panel.className = 'gemini-settings-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 12px;
    padding: 24px;
    z-index: 2147483647;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    backdrop-filter: blur(10px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const stats = analytics.getStats();

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="color: ${CONFIG.THEME.text}; margin: 0; font-size: 18px;">⚙️ Discord Settings</h3>
      <button id="closeSettings" style="
        background: none; border: none; color: ${CONFIG.THEME.text}; 
        font-size: 20px; cursor: pointer; padding: 4px;
      ">×</button>
    </div>
    
    <div style="display: grid; gap: 16px;">
      <!-- Authentication -->
      <div>
        <h4 style="color: ${CONFIG.THEME.text}; margin: 0 0 8px 0; font-size: 14px;">🔐 Authentication</h4>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="loginBtn" style="
            background: ${CONFIG.THEME.primary}; 
            color: white; 
            border: none; 
            padding: 6px 12px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 11px;
            flex: 1;
          ">🔑 Login/Register</button>
          <button id="userInfoBtn" style="
            background: ${CONFIG.THEME.success}; 
            color: white; 
            border: none; 
            padding: 6px 12px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 11px;
            flex: 1;
          ">👤 Account</button>
        </div>
      </div>
      
      <div>
        <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
          <input type="checkbox" id="showPreview" ${settings.get('showPreview') ? 'checked' : ''} style="margin-right: 8px;">
          Show Reply Preview
        </label>
      </div>
      
      <div>
        <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
          <input type="checkbox" id="notifications" ${settings.get('notifications') ? 'checked' : ''} style="margin-right: 8px;">
          Enable Notifications
        </label>
      </div>
      
      <div>
        <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
          <input type="checkbox" id="analytics" ${settings.get('analytics') ? 'checked' : ''} style="margin-right: 8px;">
          Enable Analytics
        </label>
      </div>
      
      <div>
        <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
          <input type="checkbox" id="autoPaste" ${settings.get('autoPaste') ? 'checked' : ''} style="margin-right: 8px;">
          Auto Paste Replies
        </label>
      </div>
      
      <div>
        <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
          Max Messages to Analyze: 
          <input type="range" id="maxReplies" min="5" max="50" value="${settings.get('maxReplies') || 20}" 
                 style="margin-left: 8px; width: 100px;">
          <span id="maxRepliesValue">${settings.get('maxReplies') || 20}</span>
        </label>
      </div>
    </div>
    
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid ${CONFIG.THEME.border};">
      <h4 style="color: ${CONFIG.THEME.text}; margin: 0 0 12px 0; font-size: 14px;">📊 Analytics</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; color: ${CONFIG.THEME.text};">
        <div>Total Events: <strong>${stats.total}</strong></div>
        <div>Last 24h: <strong>${stats.last24h}</strong></div>
        <div>Last 7d: <strong>${stats.last7d}</strong></div>
        <div>Platform: <strong>Discord</strong></div>
      </div>
      
      <div style="margin-top: 12px;">
        <button id="exportAnalytics" style="
          background: ${CONFIG.THEME.primary}; color: white; border: none; 
          padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px;
        ">📤 Export Analytics</button>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('closeSettings').onclick = () => panel.remove();

  document.getElementById('showPreview').onchange = (e) => {
    settings.set('showPreview', e.target.checked);
  };

  document.getElementById('notifications').onchange = (e) => {
    settings.set('notifications', e.target.checked);
  };

  document.getElementById('analytics').onchange = (e) => {
    settings.set('analytics', e.target.checked);
  };

  document.getElementById('autoPaste').onchange = (e) => {
    settings.set('autoPaste', e.target.checked);
  };

  document.getElementById('maxReplies').oninput = (e) => {
    const value = parseInt(e.target.value);
    settings.set('maxReplies', value);
    document.getElementById('maxRepliesValue').textContent = value;
  };

  document.getElementById('exportAnalytics').onclick = () => {
    const dataStr = JSON.stringify(analytics.events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gemini-discord-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Authentication buttons
  document.getElementById('loginBtn').onclick = () => {
    panel.remove();
    if (window.geminiAuthUI) {
      window.geminiAuthUI.showAuthModal();
    } else {
      // Fallback: show simple login modal
      showSimpleLoginModal();
    }
  };

  document.getElementById('userInfoBtn').onclick = () => {
    panel.remove();
    if (window.geminiAuthUI) {
      window.geminiAuthUI.showUserInfo();
    } else {
      showNotification("Please login first using the Login/Register button.", "error");
    }
  };

  // Close on outside click
  panel.onclick = (e) => e.stopPropagation();
  document.addEventListener('click', () => panel.remove(), { once: true });

  document.body.appendChild(panel);
  console.log('✅ Settings panel appended to body');
  analytics.track('settings_panel_opened', { platform: 'discord' });
  console.log('✅ Analytics tracked for settings panel opened');
}

// === Analytics Panel for Discord
function showAnalyticsPanel() {
  console.log('📊 Discord showAnalyticsPanel called');

  // Remove existing panel if any
  const existingPanel = document.querySelector('.gemini-analytics-panel');
  if (existingPanel) {
    console.log('🗑️ Removing existing Discord analytics panel');
    existingPanel.remove();
  }

  console.log('🆕 Creating new Discord analytics panel');

  const panel = document.createElement('div');
  panel.className = 'gemini-analytics-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 12px;
    padding: 24px;
    z-index: 2147483647;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    backdrop-filter: blur(10px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const stats = analytics.getStats();

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: ${CONFIG.THEME.text}; font-size: 20px;">📊 Analytics & Settings</h2>
      <button class="close-analytics" style="background: none; border: none; color: ${CONFIG.THEME.text}; font-size: 24px; cursor: pointer;">×</button>
    </div>
    
    <div style="display: grid; gap: 20px;">
      <!-- Settings Section -->
      <div class="settings-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">⚙️ Settings</h3>
        
        <!-- Authentication -->
        <div style="margin-bottom: 16px;">
          <h4 style="color: ${CONFIG.THEME.text}; margin: 0 0 8px 0; font-size: 14px;">🔐 Authentication</h4>
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button id="loginBtn" style="
              background: ${CONFIG.THEME.primary}; 
              color: white; 
              border: none; 
              padding: 6px 12px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 11px;
              flex: 1;
            ">🔑 Login/Register</button>
            <button id="userInfoBtn" style="
              background: ${CONFIG.THEME.success}; 
              color: white; 
              border: none; 
              padding: 6px 12px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 11px;
              flex: 1;
            ">👤 Account</button>
          </div>
        </div>
        
        <!-- General Settings -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
            <input type="checkbox" id="showPreview" ${settings.get('showPreview') ? 'checked' : ''} style="margin-right: 8px;">
            Show Reply Preview
          </label>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
            <input type="checkbox" id="notifications" ${settings.get('notifications') ? 'checked' : ''} style="margin-right: 8px;">
            Enable Notifications
          </label>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
            <input type="checkbox" id="analytics" ${settings.get('analytics') ? 'checked' : ''} style="margin-right: 8px;">
            Enable Analytics
          </label>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
            <input type="checkbox" id="autoPaste" ${settings.get('autoPaste') ? 'checked' : ''} style="margin-right: 8px;">
            Auto Paste Replies
          </label>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: ${CONFIG.THEME.text}; margin-bottom: 8px; font-weight: 500;">
            Max Messages to Analyze: 
            <input type="range" id="maxReplies" min="5" max="50" value="${settings.get('maxReplies') || 20}" 
                   style="margin-left: 8px; width: 100px;">
            <span id="maxRepliesValue">${settings.get('maxReplies') || 20}</span>
          </label>
        </div>
      </div>
      
      <!-- Usage Statistics -->
      <div class="analytics-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">📈 Usage Statistics</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          <div style="background: ${CONFIG.THEME.border}; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: ${CONFIG.THEME.primary}; font-size: 20px; font-weight: bold;">${stats.total}</div>
            <div style="color: ${CONFIG.THEME.text}; opacity: 0.8;">Total Events</div>
          </div>
          <div style="background: ${CONFIG.THEME.border}; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: ${CONFIG.THEME.success}; font-size: 20px; font-weight: bold;">${stats.last24h}</div>
            <div style="color: ${CONFIG.THEME.text}; opacity: 0.8;">Last 24h</div>
          </div>
          <div style="background: ${CONFIG.THEME.border}; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: ${CONFIG.THEME.warning}; font-size: 20px; font-weight: bold;">${stats.last7d}</div>
            <div style="color: ${CONFIG.THEME.text}; opacity: 0.8;">Last 7d</div>
          </div>
          <div style="background: ${CONFIG.THEME.border}; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: ${CONFIG.THEME.error}; font-size: 20px; font-weight: bold;">Discord</div>
            <div style="color: ${CONFIG.THEME.text}; opacity: 0.8;">Platform</div>
          </div>
        </div>
      </div>
      
      <!-- Event Breakdown -->
      <div class="analytics-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">🎯 Event Breakdown</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(stats.byEvent).map(([event, count]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: ${CONFIG.THEME.border}; border-radius: 6px;">
              <span style="color: ${CONFIG.THEME.text}; font-size: 13px;">${event}</span>
              <span style="color: ${CONFIG.THEME.primary}; font-weight: bold;">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Room Usage -->
      <div class="analytics-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">🏠 Room Usage</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(stats.byRoom).map(([room, count]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: ${CONFIG.THEME.border}; border-radius: 6px;">
              <span style="color: ${CONFIG.THEME.text}; font-size: 13px;">${room}</span>
              <span style="color: ${CONFIG.THEME.success}; font-weight: bold;">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button class="export-analytics" style="background: ${CONFIG.THEME.primary}; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">📤 Export Data</button>
      <button class="close-analytics" style="background: ${CONFIG.THEME.border}; color: ${CONFIG.THEME.text}; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">Close</button>
    </div>
  `;

  // Event listeners
  panel.querySelector('.close-analytics').onclick = () => panel.remove();

  // Settings event listeners
  panel.querySelector('#showPreview').onchange = (e) => {
    settings.set('showPreview', e.target.checked);
  };

  panel.querySelector('#notifications').onchange = (e) => {
    settings.set('notifications', e.target.checked);
  };

  panel.querySelector('#analytics').onchange = (e) => {
    settings.set('analytics', e.target.checked);
  };

  panel.querySelector('#autoPaste').onchange = (e) => {
    settings.set('autoPaste', e.target.checked);
  };

  panel.querySelector('#maxReplies').oninput = (e) => {
    const value = parseInt(e.target.value);
    settings.set('maxReplies', value);
    panel.querySelector('#maxRepliesValue').textContent = value;
  };

  // Authentication buttons
  panel.querySelector('#loginBtn').onclick = () => {
    panel.remove();
    if (window.geminiAuthUI) {
      window.geminiAuthUI.showAuthModal();
    } else {
      // Fallback: show simple login modal
      showSimpleLoginModal();
    }
  };

  panel.querySelector('#userInfoBtn').onclick = () => {
    panel.remove();
    if (window.geminiAuthUI) {
      window.geminiAuthUI.showUserInfo();
    } else {
      showNotification("Please login first using the Login/Register button.", "error");
    }
  };

  panel.querySelector('.export-analytics').onclick = () => {
    const data = {
      settings: settings.settings,
      analytics: analytics.events,
      stats: stats,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-discord-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification("Analytics data exported!", "success");
  };

  document.body.appendChild(panel);
  console.log('✅ Discord Analytics panel appended to body');

  // Close on escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      panel.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// === Debug Message Detection for Discord
function debugMessageDetection(message) {
  console.log('=== Discord Message Debug ===');
  console.log('Message element:', message);

  const { contentText, username } = extractMessagePieces(message);
  console.log('Extracted content:', contentText);
  console.log('Extracted username:', username);

  // Test message selectors
  const selectors = [
    '[id^="chat-messages-"] > div',
    '[class*="message"]',
    '[data-list-item-id*="chat-messages"]'
  ];

  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector "${selector}": ${elements.length} elements found`);
    } catch (e) {
      console.log(`Selector "${selector}": Error -`, e.message);
    }
  });

  // Test nearby messages
  getNearbyReplies(message).then(replies => {
    console.log('Nearby replies found:', replies.length);
    console.log('Sample replies:', replies.slice(0, 3));
  });

  showNotification("Debug info logged to console", "info");
  analytics.track('debug_triggered', { platform: 'discord' });
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
      const res = await fetch(`${CONFIG.API_BASE_URL}/generate-translate`, {
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
      const res = await fetch(`${CONFIG.API_BASE_URL}/generate-parafrase`, {
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

// === Enhanced Initialization & CSS Animations
async function initializeDiscordExtension() {
  console.log('🚀 Initializing Enhanced Gemini Discord Extension...');

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    .gemini-reply-wrapper {
      animation: fadeIn 0.3s ease-out;
    }
    
    .gemini-global-room-selector {
      animation: slideIn 0.5s ease-out;
    }
    
    .gemini-reply-btn:hover {
      animation: pulse 0.3s ease-in-out;
    }
  `;
  document.head.appendChild(style);

  // Load project.json data first
  await loadProjectData();

  // Load dynamic rooms then create global room selector
  await initRoomsFromUser();
  createGlobalRoomSelector();

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey) {
      switch (e.key) {
        case 'S':
          e.preventDefault();
          showSettingsPanel();
          break;
        case 'D':
          e.preventDefault();
          const messages = document.querySelectorAll('[id^="chat-messages-"] > div');
          if (messages.length > 0) {
            debugMessageDetection(messages[messages.length - 1]);
          }
          break;
        case 'R':
          e.preventDefault();
          const lastMessage = document.querySelectorAll('[id^="chat-messages-"] > div');
          if (lastMessage.length > 0) {
            const genBtn = lastMessage[lastMessage.length - 1].querySelector('.gemini-reply-btn');
            if (genBtn) genBtn.click();
          }
          break;
      }
    }
  });

  analytics.track('discord_extension_initialized', { platform: 'discord' });
  console.log('✅ Enhanced Gemini Discord Extension initialized successfully!');
}

// ===================
// Enhanced Observers & boot
// ===================
const messageObserver = new MutationObserver(() => {
  const messages = document.querySelectorAll('[id^="chat-messages-"] > div');
  messages.forEach(addReplyButtonToMessage);
});
messageObserver.observe(document.body, { childList: true, subtree: true });

const composerObserver = new MutationObserver(() => {
  try { injectComposerToolbar(); } catch (_) { }
});
composerObserver.observe(document.body, { childList: true, subtree: true });

// Listen for authentication messages from popup
// No auth messaging needed in local mode

// Initialize extension
setTimeout(() => {
  initializeDiscordExtension();
  document.querySelectorAll('[id^="chat-messages-"] > div').forEach(addReplyButtonToMessage);
  injectComposerToolbar();
}, 1000);

// Re-initialize on navigation (Discord is SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      if (!document.querySelector('.gemini-global-room-selector')) {
        createGlobalRoomSelector();
      }
    }, 2000);
  }
}).observe(document, { subtree: true, childList: true });
