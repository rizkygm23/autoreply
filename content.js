// content.js - Enhanced Auto Reply Extension

// === Load Authentication Helper ===
const authScript = document.createElement('script');
authScript.src = chrome.runtime.getURL('auth-helper.js');
authScript.onload = () => {
  console.log('[Gemini] Auth helper loaded successfully');
};
authScript.onerror = () => {
  console.error('[Gemini] Failed to load auth helper');
};
document.head.appendChild(authScript);

// === Enhanced Configuration
const CONFIG = {
  ROOMS: ["rialo", "lighter", "mmt", "cys", "mega", "fgo", "town"],
  MAX_REPLIES: 20,
  API_BASE_URL: "https://autoreply-gt64.onrender.com",
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  THEME: {
    primary: "#1d9bf0",
    secondary: "#15202b", 
    accent: "#1d9bf033",
    text: "#e7e9ea",
    border: "#2f3336",
    success: "#00ba7c",
    error: "#f4212e",
    warning: "#ffd400"
  }
};

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
      autoPaste: false, // New: false = copy to clipboard, true = auto-paste
      openComposer: true // New: whether to open reply composer
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
      userAgent: navigator.userAgent
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
      analytics.track('api_request_start', { endpoint, retryCount });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      analytics.track('api_request_success', { endpoint, retryCount });
      
      return data;
    } catch (error) {
      analytics.track('api_request_error', { 
        endpoint, 
        retryCount, 
        error: error.message 
      });
      
      if (retryCount < CONFIG.RETRY_ATTEMPTS && this.shouldRetry(error)) {
        await this.delay(CONFIG.RETRY_DELAY * (retryCount + 1));
        return this.request(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  shouldRetry(error) {
    return error.name === 'AbortError' || 
           error.message.includes('Failed to fetch') ||
           error.message.includes('NetworkError');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const apiClient = new ApiClient(CONFIG.API_BASE_URL);

// === Enhanced Tweet Analysis with Better Reply Detection
async function getTweetReplies(currentTweet) {
  const replies = [];
  const maxReplies = settings.get('maxReplies') || CONFIG.MAX_REPLIES;

  // Multiple strategies to find replies
  const replySelectors = [
    // Strategy 1: Look for articles that are replies (have reply indicators)
    "article[data-testid='tweet']:has([data-testid='reply'])",
    // Strategy 2: Look for articles in reply threads
    "article[data-testid='tweet']:has([aria-label*='Reply'])",
    // Strategy 3: Look for articles with reply button
    "article:has([data-testid='reply'])",
    // Strategy 4: Fallback to all articles
    "article[data-testid='tweet']"
  ];

  let allArticles = [];
  
  // Try each selector strategy
  for (const selector of replySelectors) {
    try {
      allArticles = document.querySelectorAll(selector);
      if (allArticles.length > 0) {
        console.log(`[Gemini] Found ${allArticles.length} articles using selector: ${selector}`);
        break;
      }
    } catch (e) {
      console.warn(`[Gemini] Selector failed: ${selector}`, e);
    }
  }

  // If no articles found with specific selectors, use fallback
  if (allArticles.length === 0) {
    allArticles = document.querySelectorAll("article");
    console.log(`[Gemini] Using fallback selector, found ${allArticles.length} articles`);
  }

  for (const article of allArticles) {
    if (article === currentTweet) continue;

    // Enhanced text extraction with multiple selectors
    const textSelectors = [
      "div[lang]",
      "[data-testid='tweetText']",
      ".tweet-text",
      "[role='textbox']",
      "div[dir='auto']"
    ];

    let textEl = null;
    let text = "";

    for (const selector of textSelectors) {
      textEl = article.querySelector(selector);
      if (textEl && textEl.innerText.trim()) {
        text = textEl.innerText.trim();
        break;
      }
    }

    // Enhanced username extraction
    const usernameSelectors = [
      "a[role='link'] span",
      "[data-testid='User-Name'] span",
      ".username",
      "a[href*='/'] span"
    ];

    let usernameEl = null;
    let username = "";

    for (const selector of usernameSelectors) {
      usernameEl = article.querySelector(selector);
      if (usernameEl && usernameEl.innerText.trim()) {
        username = usernameEl.innerText.replace("@", "").trim();
        break;
      }
    }

    // Additional metadata
    const timeEl = article.querySelector("time");
    const likeEl = article.querySelector('[data-testid="like"]') || article.querySelector('[aria-label*="like"]');
    const retweetEl = article.querySelector('[data-testid="retweet"]') || article.querySelector('[aria-label*="retweet"]');

    if (text && username && text.length > 5) { // Minimum text length to avoid empty replies
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const likes = likeEl ? extractNumber(likeEl.innerText || likeEl.getAttribute('aria-label') || '0') : 0;
      const retweets = retweetEl ? extractNumber(retweetEl.innerText || retweetEl.getAttribute('aria-label') || '0') : 0;

      replies.push({ 
        username, 
        reply: text, 
        timestamp,
        likes,
        retweets,
        engagement: likes + retweets,
        element: article // Store reference for debugging
      });

      console.log(`[Gemini] Found reply: @${username} - "${text.substring(0, 50)}..."`);
    }

    if (replies.length >= maxReplies) break;
  }

  // Sort by engagement for better context
  replies.sort((a, b) => b.engagement - a.engagement);
  
  console.log(`[Gemini] Total replies collected: ${replies.length}`);
  
  analytics.track('tweet_replies_collected', { 
    count: replies.length,
    maxReplies,
    selectorsUsed: replySelectors.length
  });

  return replies;
}

// === Debug Function for Reply Detection
function debugReplyDetection() {
  console.log("=== GEMINI DEBUG: Reply Detection ===");
  
  const allArticles = document.querySelectorAll("article");
  console.log(`Total articles found: ${allArticles.length}`);
  
  allArticles.forEach((article, index) => {
    const textEl = article.querySelector("div[lang]") || article.querySelector("[data-testid='tweetText']");
    const usernameEl = article.querySelector("a[role='link'] span") || article.querySelector("[data-testid='User-Name'] span");

    if (textEl && usernameEl) {
      const text = textEl.innerText.trim();
      const username = usernameEl.innerText.replace("@", "").trim();

      console.log(`Article ${index}:`);
      console.log(`  Username: @${username}`);
      console.log(`  Text: "${text.substring(0, 100)}..."`);
      console.log(`  Element:`, article);
    }
  });
  
  // Check for specific reply indicators
  const replyButtons = document.querySelectorAll('[data-testid="reply"]');
  console.log(`Reply buttons found: ${replyButtons.length}`);
  
  const replyArticles = document.querySelectorAll('article:has([data-testid="reply"])');
  console.log(`Articles with reply buttons: ${replyArticles.length}`);
}

// Add debug function to window for manual testing
window.geminiDebug = debugReplyDetection;

// Helper function to extract numbers from text
function extractNumber(text) {
  if (!text) return 0;
  const match = text.match(/(\d+(?:\.\d+)?[KMB]?)/);
  if (!match) return 0;
  
  const num = parseFloat(match[1]);
  const suffix = match[1].slice(-1);
  
  switch (suffix) {
    case 'K': return num * 1000;
    case 'M': return num * 1000000;
    case 'B': return num * 1000000000;
    default: return num;
  }
}

// === Enhanced Generate Function with Preview & Multiple Options
async function handleGenerate({ tweet, tweetText, roomId, btn, showPreview = true }) {
  const originalText = btn.innerText;
  const startTime = Date.now();
  
  // Enhanced button states
  btn.innerText = "⏳ Generating...";
  btn.disabled = true;
  btn.style.opacity = "0.7";
  btn.style.cursor = "not-allowed";

  try {
    analytics.track('generate_start', { roomId, tweetLength: tweetText.length });
    
    const komentar = await getTweetReplies(tweet);

    // Get user data for userId
    const userData = await chrome.storage.local.get(['geminiUser']);
    if (!userData.geminiUser) {
      throw new Error('User not authenticated');
    }

    // Use direct API request with userId
    const response = await fetch(`${CONFIG.API_BASE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: tweetText,
        roomId,
        komentar,
        userId: userData.geminiUser.user_id,
        options: {
          showPreview: settings.get('showPreview'),
          maxLength: 280,
          includeEmojis: true
        }
      })
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

    const reply = data.reply || "Gagal generate 😅";
    const alternatives = data.alternatives || [];
    const generationTime = Date.now() - startTime;

    analytics.track('generate_success', { 
      roomId, 
      generationTime,
      replyLength: reply.length,
      alternativesCount: alternatives.length,
      tokensUsed: data.tokensUsed,
      remainingTokens: data.remainingTokens
    });

    if (showPreview && settings.get('showPreview')) {
      showReplyPreview(tweet, reply, alternatives, roomId);
    } else {
      insertReplyDirectly(tweet, reply);
    }

    btn.innerText = "✅ Done!";
    btn.style.background = CONFIG.THEME.success;
    
    // Show success notification with token info
    if (settings.get('notifications')) {
      showNotification(`Reply generated! Used ${data.tokensUsed} tokens. ${data.remainingTokens} remaining.`, "success");
    }

  } catch (error) {
    console.error("Gagal generate reply:", error);
    btn.innerText = "❌ Error";
    btn.style.background = CONFIG.THEME.error;
    
    analytics.track('generate_error', { 
      roomId, 
      error: error.message,
      generationTime: Date.now() - startTime
    });

    if (settings.get('notifications')) {
      showNotification("Failed to generate reply. Please try again.", "error");
    }
  } finally {
    setTimeout(() => {
      btn.innerText = originalText;
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.style.background = CONFIG.THEME.primary;
    }, 2000);
  }
}

// === Enhanced Reply Preview Modal
function showReplyPreview(tweet, reply, alternatives = [], roomId) {
  // Remove existing preview if any
  const existingPreview = document.querySelector('.gemini-reply-preview');
  if (existingPreview) existingPreview.remove();

  const preview = document.createElement('div');
  preview.className = 'gemini-reply-preview';
  preview.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 12px;
    padding: 20px;
    max-width: 500px;
    width: 90%;
    z-index: 2147483647;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  preview.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; color: ${CONFIG.THEME.text}; font-size: 16px;">💬 Generated Reply</h3>
      <button class="close-preview" style="background: none; border: none; color: ${CONFIG.THEME.text}; font-size: 20px; cursor: pointer;">×</button>
    </div>
    
    <div class="reply-content" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid ${CONFIG.THEME.primary};">
      <p style="margin: 0; color: ${CONFIG.THEME.text}; line-height: 1.4;">${reply}</p>
    </div>
    
    ${alternatives.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 10px 0; color: ${CONFIG.THEME.text}; font-size: 14px;">Alternative Options:</h4>
        <div class="alternatives" style="display: flex; flex-direction: column; gap: 8px;">
          ${alternatives.map((alt, i) => `
            <div class="alt-option" style="background: #1a1a1a; padding: 10px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s;" data-reply="${alt}">
              <p style="margin: 0; color: ${CONFIG.THEME.text}; font-size: 13px;">${alt}</p>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button class="use-reply" style="background: ${CONFIG.THEME.primary}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Use This Reply</button>
      <button class="regenerate" style="background: ${CONFIG.THEME.warning}; color: black; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Regenerate</button>
      <button class="cancel-preview" style="background: ${CONFIG.THEME.border}; color: ${CONFIG.THEME.text}; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
    </div>
  `;

  // Add event listeners
  preview.querySelector('.close-preview').onclick = () => preview.remove();
  preview.querySelector('.cancel-preview').onclick = () => preview.remove();
  
  preview.querySelector('.use-reply').onclick = () => {
    insertReplyDirectly(tweet, reply);
    preview.remove();
  };
  
  preview.querySelector('.regenerate').onclick = () => {
    preview.remove();
    const btn = tweet.querySelector('.gemini-room-btn');
    if (btn) handleGenerate({ tweet, tweetText: tweet.querySelector("div[lang]").innerText, roomId, btn, showPreview: false });
  };

  // Alternative options
  preview.querySelectorAll('.alt-option').forEach(option => {
    option.onclick = () => {
      const selectedReply = option.dataset.reply;
      insertReplyDirectly(tweet, selectedReply);
      preview.remove();
    };
    
    option.onmouseenter = () => {
      option.style.borderColor = CONFIG.THEME.primary;
      option.style.background = '#2a2a2a';
    };
    
    option.onmouseleave = () => {
      option.style.borderColor = 'transparent';
      option.style.background = '#1a1a1a';
    };
  });

  document.body.appendChild(preview);
  
  // Close on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      preview.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// === Smart Reply Insertion (Copy or Auto-Paste based on settings)
async function insertReplyDirectly(tweet, reply) {
  const autoPaste = settings.get('autoPaste');
  const openComposer = settings.get('openComposer');
  
  try {
    // Always copy to clipboard first
    await navigator.clipboard.writeText(reply);
    
    // Open reply composer if enabled
    if (openComposer) {
      const replyBtn = tweet.querySelector('[data-testid="reply"]');
      if (replyBtn) {
        replyBtn.click();
        
        // Auto-paste if enabled
        if (autoPaste) {
          setTimeout(() => {
            const input = document.querySelector('div[role="textbox"]');
            if (input) {
              input.focus();
              input.innerText = reply;
              
              // Trigger input event for Twitter's character counter
              const event = new Event('input', { bubbles: true });
              input.dispatchEvent(event);
            }
          }, 600);
          
          if (settings.get('notifications')) {
            showNotification("Reply pasted automatically!", "success");
          }
          
          analytics.track('reply_auto_pasted', { 
            replyLength: reply.length,
            autoPaste: true 
          });
        } else {
          if (settings.get('notifications')) {
            showNotification("Reply copied to clipboard! Paste it manually.", "success");
          }
          
          analytics.track('reply_copied', { 
            replyLength: reply.length,
            autoPaste: false 
          });
        }
      } else {
        // If no reply button found, just copy to clipboard
        if (settings.get('notifications')) {
          showNotification("Reply copied to clipboard!", "success");
        }
      }
    } else {
      // Just copy to clipboard without opening composer
      if (settings.get('notifications')) {
        showNotification("Reply copied to clipboard!", "success");
      }
      
      analytics.track('reply_copied_only', { 
        replyLength: reply.length,
        composerOpened: false 
      });
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    // Fallback: show the reply in a modal for manual copy
    showReplyModal(reply);
    
    analytics.track('reply_copy_failed', { 
      error: error.message,
      fallbackUsed: true 
    });
  }
}

// === Fallback Modal for Manual Copy
function showReplyModal(reply) {
  const modal = document.createElement('div');
  modal.className = 'gemini-reply-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 12px;
    padding: 20px;
    max-width: 500px;
    width: 90%;
    z-index: 2147483647;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; color: ${CONFIG.THEME.text}; font-size: 16px;">📋 Generated Reply</h3>
      <button class="close-modal" style="background: none; border: none; color: ${CONFIG.THEME.text}; font-size: 20px; cursor: pointer;">×</button>
    </div>
    
    <div class="reply-content" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid ${CONFIG.THEME.primary};">
      <p style="margin: 0; color: ${CONFIG.THEME.text}; line-height: 1.4; white-space: pre-wrap;">${reply}</p>
    </div>
    
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button class="copy-manual" style="background: ${CONFIG.THEME.primary}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">📋 Copy to Clipboard</button>
      <button class="close-modal" style="background: ${CONFIG.THEME.border}; color: ${CONFIG.THEME.text}; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Close</button>
    </div>
  `;

  // Event listeners
  modal.querySelector('.close-modal').onclick = () => modal.remove();
  
  modal.querySelector('.copy-manual').onclick = async () => {
    try {
      await navigator.clipboard.writeText(reply);
      showNotification("Reply copied to clipboard!", "success");
      modal.remove();
    } catch (error) {
      showNotification("Failed to copy. Please select and copy manually.", "error");
    }
  };

  document.body.appendChild(modal);
  
  // Close on escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// === Fallback Simple Login Modal
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
      background: #15202b;
      border: 1px solid #2f3336;
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
          background: #1d9bf0;
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
      console.log('[Gemini] Attempting login for:', email);
      const response = await fetch('https://autoreply-gt64.onrender.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      console.log('[Gemini] Login response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Gemini] Login response data:', data);
        
        if (data.user) {
          // Store user data
          await chrome.storage.local.set({ geminiUser: data.user });
          console.log('[Gemini] User data stored:', data.user);
          modal.remove();
          showNotification('Login successful! Welcome to Gemini Auto Reply!', 'success');
          
          // Notify content scripts about login
          chrome.runtime.sendMessage({ type: 'USER_LOGGED_IN', user: data.user });
          
          // Retry the original action
          if (originalAction) {
            originalAction();
          }
        } else {
          console.error('[Gemini] No user data in response:', data);
          alert('Login failed. Invalid response from server.');
        }
      } else {
        const errorData = await response.json();
        console.error('[Gemini] Login failed:', errorData);
        alert(errorData.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('[Gemini] Login error:', error);
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
      console.log('[Gemini] Attempting registration for:', email);
      const response = await fetch('https://autoreply-gt64.onrender.com/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      console.log('[Gemini] Register response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Gemini] Register response data:', data);
        
        if (data.user) {
          // Store user data
          await chrome.storage.local.set({ geminiUser: data.user });
          console.log('[Gemini] User data stored:', data.user);
          modal.remove();
          showNotification('Registration successful! Welcome to Gemini Auto Reply!', 'success');
          
          // Notify content scripts about login
          chrome.runtime.sendMessage({ type: 'USER_LOGGED_IN', user: data.user });
          
          // Retry the original action
          if (originalAction) {
            originalAction();
          }
        } else {
          console.error('[Gemini] No user data in response:', data);
          alert('Registration failed. Invalid response from server.');
        }
      } else {
        const errorData = await response.json();
        console.log('[Gemini] Register response data:', errorData);
        
        if (errorData.user) {
          // User exists, login instead
          await chrome.storage.local.set({ geminiUser: errorData.user });
          console.log('[Gemini] User already exists, logged in:', errorData.user);
          modal.remove();
          showNotification('User already exists! Logged in successfully.', 'success');
          
          // Notify content scripts about login
          chrome.runtime.sendMessage({ type: 'USER_LOGGED_IN', user: errorData.user });
          
          // Retry the original action
          if (originalAction) {
            originalAction();
          }
        } else {
          console.error('[Gemini] Registration failed:', errorData);
          alert(errorData.error || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('[Gemini] Registration error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('Registration failed. Please check your internet connection and try again.');
      } else {
        alert('Registration failed. Please try again.');
      }
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

// === Notification System
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
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add Enhanced CSS animations and styles
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
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 5px rgba(29, 155, 240, 0.3); }
    50% { box-shadow: 0 0 20px rgba(29, 155, 240, 0.6); }
  }
  
  .gemini-reply-wrapper {
    animation: fadeIn 0.3s ease-out;
  }
  
  .gemini-reply-wrapper:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }
  
  .gemini-room-btn:disabled {
    animation: pulse 1.5s infinite;
  }
  
  .gemini-room-btn {
    pointer-events: auto !important;
    cursor: pointer !important;
    user-select: none;
  }
  
  .gemini-room-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(29, 155, 240, 0.4);
  }
  
  .gemini-reply-wrapper button {
    pointer-events: auto !important;
    cursor: pointer !important;
    position: relative;
    z-index: 10;
  }
  
  .gemini-dropdown-portal {
    animation: fadeIn 0.2s ease-out;
  }
  
  .gemini-settings-panel {
    animation: fadeIn 0.3s ease-out;
  }
  
  .gemini-global-room-selector {
    animation: fadeIn 0.3s ease-out;
  }
  
  .gemini-global-room-selector:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(0,0,0,0.4);
  }
  
  /* Custom scrollbar for settings panel */
  .gemini-settings-panel::-webkit-scrollbar {
    width: 6px;
  }
  .gemini-settings-panel::-webkit-scrollbar-track {
    background: ${CONFIG.THEME.border};
    border-radius: 3px;
  }
  .gemini-settings-panel::-webkit-scrollbar-thumb {
    background: ${CONFIG.THEME.primary};
    border-radius: 3px;
  }
  .gemini-settings-panel::-webkit-scrollbar-thumb:hover {
    background: #1a8cd8;
  }
`;
document.head.appendChild(style);

// === Enhanced Dropdown Portal with Modern Styling
function createOptionsPortal(items, onSelect) {
  const menu = document.createElement("div");
  menu.className = "gemini-dropdown-portal";
  menu.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    display: none;
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 12px;
    min-width: 160px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    z-index: 2147483647;
    overflow: hidden;
    backdrop-filter: blur(10px);
    animation: fadeIn 0.2s ease-out;
  `;

  // Add room descriptions and icons
  const roomInfo = {
    rialo: { icon: "🏛️", desc: "Rialo Community" },
    lighter: { icon: "💡", desc: "Lighter Community" },
    mmt: { icon: "🚀", desc: "MMT Community" },
    cys: { icon: "🎯", desc: "Cysic Community" },
    mega: { icon: "⚡", desc: "Mega Community" },
    fgo: { icon: "🎮", desc: "FGO Community" },
    town: { icon: "🏘️", desc: "Town Community" }
  };

  items.forEach((id) => {
    const info = roomInfo[id] || { icon: "💬", desc: `${id} Community` };
    
    const row = document.createElement("div");
    row.className = "gemini-dropdown-item";
    row.style.cssText = `
      padding: 12px 16px;
      font-size: 13px;
      color: ${CONFIG.THEME.text};
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid ${CONFIG.THEME.border};
    `;
    
    row.innerHTML = `
      <span style="font-size: 16px;">${info.icon}</span>
      <div style="display: flex; flex-direction: column;">
        <span style="font-weight: 500;">${id}</span>
        <span style="font-size: 11px; opacity: 0.7;">${info.desc}</span>
      </div>
    `;
    
    row.addEventListener("mouseenter", () => {
      row.style.background = CONFIG.THEME.accent;
      row.style.transform = "translateX(4px)";
    });
    
    row.addEventListener("mouseleave", () => {
      row.style.background = "transparent";
      row.style.transform = "translateX(0)";
    });
    
    row.addEventListener("click", () => {
      analytics.track('room_selected', { roomId: id });
      onSelect(id);
    });
    
    menu.appendChild(row);
  });

  // Remove last border
  const lastItem = menu.lastElementChild;
  if (lastItem) lastItem.style.borderBottom = "none";

  document.body.appendChild(menu);
  return menu;
}

// === Global Room Selector (Single dropdown in header)
let globalRoomSelector = null;

function createGlobalRoomSelector() {
  if (globalRoomSelector) return globalRoomSelector;

  const selectedRoom = settings.get('selectedRoom') || CONFIG.ROOMS[0];

  // Create global room selector
  const selector = document.createElement("div");
  selector.className = "gemini-global-room-selector";
  selector.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
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

  // Room info mapping
  const roomInfo = {
    rialo: { icon: "🏛️", name: "Rialo" },
    lighter: { icon: "💡", name: "Lighter" },
    mmt: { icon: "🚀", name: "MMT" },
    cys: { icon: "🎯", name: "Cysic" },
    mega: { icon: "⚡", name: "Mega" },
    fgo: { icon: "🎮", name: "FGO" },
    town: { icon: "🏘️", name: "Town" }
  };

  const currentRoom = roomInfo[selectedRoom] || { icon: "💬", name: selectedRoom };

  selector.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">${currentRoom.icon}</span>
      <span style="color: ${CONFIG.THEME.text}; font-size: 14px; font-weight: 500;">${currentRoom.name}</span>
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
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
      <button class="gemini-settings-btn" style="
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
      " title="Settings">⚙️</button>
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
      " title="Analytics">📊</button>
    </div>
  `;

  // Create dropdown menu
  const menu = createOptionsPortal(CONFIG.ROOMS, (chosen) => {
    const room = roomInfo[chosen] || { icon: "💬", name: chosen };
    selector.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${room.icon}</span>
        <span style="color: ${CONFIG.THEME.text}; font-size: 14px; font-weight: 500;">${room.name}</span>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
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
        <button class="gemini-settings-btn" style="
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
        " title="Settings">⚙️</button>
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
        " title="Analytics">📊</button>
      </div>
    `;
    settings.set('selectedRoom', chosen);
    hideMenu();
    
    // Update all existing tweet interfaces
    updateAllTweetInterfaces();
    
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
    } else if (e.target.classList.contains('gemini-settings-btn')) {
      console.log('⚙️ Twitter Settings button clicked from room selector');
      showSettingsPanel();
    } else if (e.target.classList.contains('gemini-analytics-btn')) {
      console.log('📊 Twitter Analytics button clicked from room selector');
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

  analytics.track('global_room_selector_created', { selectedRoom });
  
  return selector;
}

// === Update all tweet interfaces when room changes
function updateAllTweetInterfaces() {
  const wrappers = document.querySelectorAll('.gemini-reply-wrapper');
  wrappers.forEach(wrapper => {
    const currentRoom = settings.get('selectedRoom') || CONFIG.ROOMS[0];
    // Room info mapping
  const roomInfo = {
    rialo: { icon: "🏛️", name: "Rialo" },
    lighter: { icon: "💡", name: "Lighter" },
    mmt: { icon: "🚀", name: "MMT" },
    cys: { icon: "🎯", name: "Cysic" },
    mega: { icon: "⚡", name: "Mega" },
    fgo: { icon: "🎮", name: "FGO" },
    town: { icon: "🏘️", name: "Town" }
  };
    
    const room = roomInfo[currentRoom] || { icon: "💬", name: currentRoom };
    
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

// === Simplified Tweet Reply Interface (No individual room selector)
function addReplyButtonToTweet(tweet) {
  if (tweet.querySelector(".gemini-reply-wrapper")) return;

  const textElement = tweet.querySelector("div[lang]");
  if (!textElement) return;

  const tweetText = textElement.innerText;
  const selectedRoom = settings.get('selectedRoom') || CONFIG.ROOMS[0];

  // Enhanced wrapper with modern styling (simplified)
  const wrapper = document.createElement("div");
  wrapper.className = "gemini-reply-wrapper";
  wrapper.style.cssText = `
    display: flex;
    gap: 12px;
    margin-top: 12px;
    flex-wrap: wrap;
    align-items: center;
    position: relative;
    padding: 12px;
    background: linear-gradient(135deg, ${CONFIG.THEME.secondary}88, ${CONFIG.THEME.secondary}44);
    border-radius: 12px;
    border: 1px solid ${CONFIG.THEME.border};
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    z-index: 1;
    pointer-events: auto;
  `;

  // Room info mapping
  const roomInfo = {
    rialo: { icon: "🏛️", name: "Rialo" },
    lighter: { icon: "💡", name: "Lighter" },
    mmt: { icon: "🚀", name: "MMT" },
    cys: { icon: "🎯", name: "Cysic" },
    mega: { icon: "⚡", name: "Mega" },
    fgo: { icon: "🎮", name: "FGO" },
    town: { icon: "🏘️", name: "Town" }
  };

  const currentRoom = roomInfo[selectedRoom] || { icon: "💬", name: selectedRoom };
  
  const roomDisplay = document.createElement("div");
  roomDisplay.className = "current-room-display";
  roomDisplay.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    background: ${CONFIG.THEME.border};
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    color: ${CONFIG.THEME.text};
  `;
  roomDisplay.innerHTML = `
    <span style="opacity: 0.7;">Room:</span>
    <span style="font-weight: 500;">${currentRoom.icon} ${currentRoom.name}</span>
  `;

  // Enhanced Generate Button with Multiple Options
  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  `;

  // Main Generate Button
  const genBtn = document.createElement("button");
  genBtn.innerText = "💬 Generate";
  genBtn.className = "gemini-room-btn";
  genBtn.style.cssText = `
    background: linear-gradient(135deg, ${CONFIG.THEME.primary}, #1a8cd8);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(29, 155, 240, 0.3);
    position: relative;
    z-index: 1;
    pointer-events: auto;
  `;

  // Hover effects for generate button
  genBtn.addEventListener('mouseenter', () => {
    genBtn.style.transform = 'translateY(-1px)';
    genBtn.style.boxShadow = '0 4px 16px rgba(29, 155, 240, 0.4)';
  });
  
  genBtn.addEventListener('mouseleave', () => {
    genBtn.style.transform = 'translateY(0)';
    genBtn.style.boxShadow = '0 2px 8px rgba(29, 155, 240, 0.3)';
  });

  genBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[Gemini] Generate button clicked!");
    
    // Check authentication with better error handling
    try {
      const userData = await chrome.storage.local.get(['geminiUser']);
      console.log('[Gemini] Current user data:', userData);
      
      if (!userData.geminiUser) {
        console.log('[Gemini] No user data found, showing login modal');
        showNotification("Please login to use AI features", "error");
        if (window.geminiAuthUI) {
          window.geminiAuthUI.showAuthModal();
        } else {
          showSimpleLoginModal();
        }
        return;
      }
      
      console.log('[Gemini] User authenticated:', userData.geminiUser.user_mail);
    } catch (error) {
      console.error('[Gemini] Error checking authentication:', error);
      showNotification("Authentication error. Please try again.", "error");
      return;
    }
    
    const roomId = settings.get('selectedRoom') || CONFIG.ROOMS[0];
    if (!roomId) {
      showNotification("Please select a room first!", "warning");
      return;
    }
    analytics.track('generate_button_clicked', { roomId, tweetLength: tweetText.length });
    await handleGenerate({ tweet, tweetText, roomId, btn: genBtn });
  });

  // Quick Actions Button
  const quickBtn = document.createElement("button");
  quickBtn.innerHTML = "⚡ Quick";
  quickBtn.title = "Generate without preview";
  quickBtn.style.cssText = `
    background: ${CONFIG.THEME.warning};
    color: black;
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    position: relative;
    z-index: 1;
    pointer-events: auto;
  `;

  quickBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[Gemini] Quick button clicked!");
    
    const roomId = settings.get('selectedRoom') || CONFIG.ROOMS[0];
    if (!roomId) {
      showNotification("Please select a room first!", "warning");
      return;
    }
    analytics.track('quick_generate_clicked', { roomId });
    handleGenerate({ tweet, tweetText, roomId, btn: quickBtn, showPreview: false });
  });

  // Settings Button
  const settingsBtn = document.createElement("button");
  settingsBtn.innerHTML = "⚙️";
  settingsBtn.title = "Extension Settings";
  settingsBtn.style.cssText = `
    background: ${CONFIG.THEME.border};
    color: ${CONFIG.THEME.text};
    border: none;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    position: relative;
  `;

  // Enhanced click handler with debug
  settingsBtn.addEventListener("click", (e) => {
    console.log('🔍 Twitter Settings button click event triggered');
    e.preventDefault();
    e.stopPropagation();
    console.log('⚙️ Twitter Settings button clicked - calling showSettingsPanel');
    try {
      showSettingsPanel();
      console.log('✅ showSettingsPanel called successfully');
    } catch (error) {
      console.error('❌ Error calling showSettingsPanel:', error);
    }
  });
  
  // Add mousedown event as backup
  settingsBtn.addEventListener('mousedown', (e) => {
    console.log('🔍 Twitter Settings button mousedown event');
    e.preventDefault();
    e.stopPropagation();
  });
  
  // Add mouseup event as backup
  settingsBtn.addEventListener('mouseup', (e) => {
    console.log('🔍 Twitter Settings button mouseup event');
    e.preventDefault();
    e.stopPropagation();
    console.log('⚙️ Twitter Settings button mouseup - calling showSettingsPanel');
    try {
      showSettingsPanel();
      console.log('✅ showSettingsPanel called successfully from mouseup');
    } catch (error) {
      console.error('❌ Error calling showSettingsPanel from mouseup:', error);
    }
  });

  // Debug Button (only show in development)
  const debugBtn = document.createElement("button");
  debugBtn.innerHTML = "🐛";
  debugBtn.title = "Debug Reply Detection";
  debugBtn.style.cssText = `
    background: ${CONFIG.THEME.error};
    color: white;
    border: none;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  debugBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[Gemini] Debug button clicked!");
    debugReplyDetection();
    showNotification("Debug info printed to console (F12)", "info");
  });

  buttonContainer.appendChild(genBtn);
  buttonContainer.appendChild(quickBtn);
  buttonContainer.appendChild(settingsBtn);
  buttonContainer.appendChild(debugBtn);

  wrapper.appendChild(roomDisplay);
  wrapper.appendChild(buttonContainer);

  // Sisipkan setelah bagian footer tweet
  const footer = tweet.querySelector('[role="group"]');
  if (footer && footer.parentElement) {
    footer.parentElement.appendChild(wrapper);
  } else {
    tweet.appendChild(wrapper); // fallback
  }

  // Cleanup observer untuk tweet yang dihapus
  const cleanupObserver = new MutationObserver(() => {
    if (!document.body.contains(wrapper)) {
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  analytics.track('tweet_interface_added', { 
    selectedRoom: selectedRoom,
    hasGlobalSelector: !!globalRoomSelector
  });
  
  console.log(`[Gemini Extension] Tweet interface added for room: ${selectedRoom}`);
}

// === Settings Panel
function showSettingsPanel() {
  console.log('🔧 Twitter showSettingsPanel called');
  
  // Remove existing settings panel
  const existingPanel = document.querySelector('.gemini-settings-panel');
  if (existingPanel) {
    console.log('🗑️ Removing existing Twitter settings panel');
    existingPanel.remove();
  }
  
  console.log('🆕 Creating new Twitter settings panel');

  const panel = document.createElement('div');
  panel.className = 'gemini-settings-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 16px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 2147483647;
    box-shadow: 0 25px 50px rgba(0,0,0,0.7);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const stats = analytics.getStats();
  
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: ${CONFIG.THEME.text}; font-size: 20px;">⚙️ Extension Settings</h2>
      <button class="close-settings" style="background: none; border: none; color: ${CONFIG.THEME.text}; font-size: 24px; cursor: pointer;">×</button>
    </div>
    
    <div style="display: grid; gap: 20px;">
      <!-- General Settings -->
      <div class="settings-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">General</h3>
        
        <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
          <label style="color: ${CONFIG.THEME.text}; font-size: 14px;">Show Reply Preview</label>
          <input type="checkbox" id="showPreview" ${settings.get('showPreview') ? 'checked' : ''} style="transform: scale(1.2);">
        </div>
        
        <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
          <label style="color: ${CONFIG.THEME.text}; font-size: 14px;">Enable Notifications</label>
          <input type="checkbox" id="notifications" ${settings.get('notifications') ? 'checked' : ''} style="transform: scale(1.2);">
        </div>
        
        <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
          <label style="color: ${CONFIG.THEME.text}; font-size: 14px;">Enable Analytics</label>
          <input type="checkbox" id="analytics" ${settings.get('analytics') ? 'checked' : ''} style="transform: scale(1.2);">
        </div>
        
        <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
          <label style="color: ${CONFIG.THEME.text}; font-size: 14px;">Auto-Paste Reply</label>
          <input type="checkbox" id="autoPaste" ${settings.get('autoPaste') ? 'checked' : ''} style="transform: scale(1.2);">
        </div>
        
        <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
          <label style="color: ${CONFIG.THEME.text}; font-size: 14px;">Open Reply Composer</label>
          <input type="checkbox" id="openComposer" ${settings.get('openComposer') ? 'checked' : ''} style="transform: scale(1.2);">
        </div>
      </div>
      
      <!-- Performance Settings -->
      <div class="settings-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">Performance</h3>
        
        <div class="setting-item" style="padding: 8px 0;">
          <label style="color: ${CONFIG.THEME.text}; font-size: 14px; display: block; margin-bottom: 8px;">Max Replies to Analyze</label>
          <input type="range" id="maxReplies" min="5" max="50" value="${settings.get('maxReplies')}" style="width: 100%;">
          <span id="maxRepliesValue" style="color: ${CONFIG.THEME.text}; font-size: 12px;">${settings.get('maxReplies')}</span>
        </div>
      </div>
      
      <!-- Authentication -->
      <div class="settings-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">🔐 Authentication</h3>
        
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="loginBtn" style="
            background: ${CONFIG.THEME.primary}; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 12px;
            flex: 1;
          ">🔑 Login/Register</button>
          <button id="userInfoBtn" style="
            background: ${CONFIG.THEME.success}; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 12px;
            flex: 1;
          ">👤 Account Info</button>
        </div>
      </div>
      
      <!-- Analytics -->
      <div class="settings-section">
        <h3 style="margin: 0 0 12px 0; color: ${CONFIG.THEME.text}; font-size: 16px;">📊 Usage Statistics</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          <div style="background: ${CONFIG.THEME.border}; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: ${CONFIG.THEME.primary}; font-size: 20px; font-weight: bold;">${stats.total}</div>
            <div style="color: ${CONFIG.THEME.text}; opacity: 0.8;">Total Events</div>
          </div>
          <div style="background: ${CONFIG.THEME.border}; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: ${CONFIG.THEME.success}; font-size: 20px; font-weight: bold;">${stats.last24h}</div>
            <div style="color: ${CONFIG.THEME.text}; opacity: 0.8;">Last 24h</div>
          </div>
        </div>
        
        <button id="exportData" style="background: ${CONFIG.THEME.primary}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 12px; width: 100%;">
          📤 Export Analytics Data
        </button>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button class="reset-settings" style="background: ${CONFIG.THEME.error}; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">Reset Settings</button>
      <button class="save-settings" style="background: ${CONFIG.THEME.success}; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">Save Settings</button>
    </div>
  `;

  // Event listeners
  panel.querySelector('.close-settings').onclick = () => panel.remove();
  
  panel.querySelector('#maxReplies').oninput = (e) => {
    panel.querySelector('#maxRepliesValue').textContent = e.target.value;
  };
  
  panel.querySelector('.save-settings').onclick = () => {
    settings.set('showPreview', panel.querySelector('#showPreview').checked);
    settings.set('notifications', panel.querySelector('#notifications').checked);
    settings.set('analytics', panel.querySelector('#analytics').checked);
    settings.set('autoPaste', panel.querySelector('#autoPaste').checked);
    settings.set('openComposer', panel.querySelector('#openComposer').checked);
    settings.set('maxReplies', parseInt(panel.querySelector('#maxReplies').value));
    
    showNotification("Settings saved successfully!", "success");
    panel.remove();
  };
  
  panel.querySelector('.reset-settings').onclick = () => {
    if (confirm('Are you sure you want to reset all settings?')) {
      settings.settings = settings.getDefaultSettings();
      settings.saveSettings();
      showNotification("Settings reset to default!", "success");
      panel.remove();
    }
  };
  
  panel.querySelector('#exportData').onclick = () => {
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
    a.download = `gemini-extension-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification("Analytics data exported!", "success");
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

  document.body.appendChild(panel);
  console.log('✅ Twitter Settings panel appended to body');
  
  // Close on escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      panel.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// === Analytics Panel for Twitter
function showAnalyticsPanel() {
  console.log('📊 Twitter showAnalyticsPanel called');
  
  // Remove existing panel if any
  const existingPanel = document.querySelector('.gemini-analytics-panel');
  if (existingPanel) {
    console.log('🗑️ Removing existing Twitter analytics panel');
    existingPanel.remove();
  }
  
  console.log('🆕 Creating new Twitter analytics panel');

  const panel = document.createElement('div');
  panel.className = 'gemini-analytics-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${CONFIG.THEME.secondary};
    border: 1px solid ${CONFIG.THEME.border};
    border-radius: 16px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 2147483647;
    box-shadow: 0 25px 50px rgba(0,0,0,0.7);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const stats = analytics.getStats();
  
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: ${CONFIG.THEME.text}; font-size: 20px;">📊 Analytics</h2>
      <button class="close-analytics" style="background: none; border: none; color: ${CONFIG.THEME.text}; font-size: 24px; cursor: pointer;">×</button>
    </div>
    
    <div style="display: grid; gap: 20px;">
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
            <div style="color: ${CONFIG.THEME.error}; font-size: 20px; font-weight: bold;">Twitter</div>
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
    a.download = `gemini-twitter-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification("Analytics data exported!", "success");
  };

  document.body.appendChild(panel);
  console.log('✅ Twitter Analytics panel appended to body');
  
  // Close on escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      panel.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// === Enhanced Initialization & Monitoring
const observer = new MutationObserver(() => {
  const tweets = document.querySelectorAll("article");
  tweets.forEach((tweet) => addReplyButtonToTweet(tweet));
});

// Enhanced initialization with better error handling
function initializeExtension() {
  try {
    // Track extension startup
    analytics.track('extension_initialized', {
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });

    // Create global room selector (only once)
    createGlobalRoomSelector();

    // Add interface to existing tweets
  document.querySelectorAll("article").forEach((tweet) => {
    addReplyButtonToTweet(tweet);
  });

    // Start monitoring for new tweets
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: false
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + G for quick generate on focused tweet
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        const focusedTweet = document.querySelector('article:focus-within') || 
                           document.querySelector('article:hover');
        if (focusedTweet) {
          const btn = focusedTweet.querySelector('.gemini-room-btn');
          if (btn) btn.click();
        }
      }
      
      // Ctrl/Cmd + Shift + S for settings
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        showSettingsPanel();
      }
    });

    console.log(`[Gemini Extension] ✅ Enhanced version initialized successfully!`);
    console.log(`[Gemini Extension] 📊 Analytics: ${settings.get('analytics') ? 'Enabled' : 'Disabled'}`);
    console.log(`[Gemini Extension] 🎨 Theme: ${settings.get('theme')}`);
    console.log(`[Gemini Extension] ⌨️  Shortcuts: Ctrl+Shift+G (Generate), Ctrl+Shift+S (Settings)`);
    
    // Show welcome notification
    if (settings.get('notifications')) {
      setTimeout(() => {
        showNotification("🚀 Gemini Extension Enhanced v2.0 loaded!", "success");
      }, 1000);
    }

  } catch (error) {
    console.error("[Gemini Extension] ❌ Initialization failed:", error);
    analytics.track('extension_init_error', { error: error.message });
  }
}

// Listen for authentication messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_LOGGED_IN') {
    console.log('[Gemini] User logged in:', message.user);
    showNotification(`Welcome ${message.user.user_mail}! You have ${message.user.user_token.toLocaleString()} tokens.`, 'success');
  }
});

// Check login status on initialization
async function checkLoginStatus() {
  try {
    const userData = await chrome.storage.local.get(['geminiUser']);
    if (userData.geminiUser) {
      console.log('[Gemini] User already logged in:', userData.geminiUser);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Gemini] Error checking login status:', error);
    return false;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Also initialize on page load for SPA navigation
window.addEventListener("load", initializeExtension);

// Handle page visibility changes (for SPA navigation)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Re-initialize if needed when page becomes visible
    setTimeout(initializeExtension, 500);
  }
});
