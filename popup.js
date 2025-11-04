// popup.js - Enhanced Popup Interface

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Popup DOM loaded, initializing...');
  
  // Check if required elements exist
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  console.log('🔍 Initial element check:');
  console.log('- loginBtn exists:', !!loginBtn);
  console.log('- registerBtn exists:', !!registerBtn);
  
  try {
    console.log('📊 Loading analytics...');
    await loadAnalytics();
    console.log('✅ Analytics loaded');
  } catch (error) {
    console.error('❌ Error loading analytics:', error);
    console.log('📊 Skipping analytics, continuing...');
  }
  
  try {
    console.log('🔐 Checking auth status...');
    await checkAuthStatus();
    console.log('✅ Auth status checked');
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
  }
  
  // Wait a bit for DOM to be fully ready
  setTimeout(() => {
    console.log('⏰ Setting up event listeners after timeout...');
    setupEventListeners();
  }, 100);
});

// Load analytics data and display stats
async function loadAnalytics() {
  try {
    console.log('📊 Sending GET_ANALYTICS message...');
    
    // Add timeout to prevent hanging
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: 'GET_ANALYTICS' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);
    
    console.log('📊 Analytics response:', response);
    const analytics = response || [];
    
    // Calculate stats
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    const totalEvents = analytics.length;
    const todayEvents = analytics.filter(event => event.timestamp >= todayStart).length;
    
    // Update UI - check if elements exist first
    const totalEventsEl = document.getElementById('totalEvents');
    const todayEventsEl = document.getElementById('todayEvents');
    
    if (totalEventsEl) {
      totalEventsEl.textContent = totalEvents;
    }
    if (todayEventsEl) {
      todayEventsEl.textContent = todayEvents;
    }
    
    console.log('📊 Analytics stats:', { totalEvents, todayEvents });
    
  } catch (error) {
    console.error('❌ Failed to load analytics:', error);
    console.log('📊 Using fallback analytics (0 stats)');
    
    const totalEventsEl = document.getElementById('totalEvents');
    const todayEventsEl = document.getElementById('todayEvents');
    
    if (totalEventsEl) {
      totalEventsEl.textContent = '0';
    }
    if (todayEventsEl) {
      todayEventsEl.textContent = '0';
    }
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    console.log('🔐 Getting user data from storage...');
    const userData = await chrome.storage.local.get(['geminiUser']);
    console.log('🔐 User data:', userData);
    
    if (userData.geminiUser) {
      console.log('✅ User logged in, showing user info');
      showUserInfo(userData.geminiUser);
    } else {
      console.log('❌ No user data, showing login form');
      showLoginForm();
    }
  } catch (error) {
    console.error('❌ Failed to check auth status:', error);
    showLoginForm();
  }
}

// Show login form
function showLoginForm() {
  console.log('📝 Showing login form...');
  const authForm = document.getElementById('authForm');
  const userInfo = document.getElementById('userInfo');
  
  if (authForm) {
    authForm.style.display = 'block';
    console.log('✅ Auth form shown');
  } else {
    console.error('❌ Auth form element not found');
  }
  
  if (userInfo) {
    userInfo.style.display = 'none';
    console.log('✅ User info hidden');
  } else {
    console.error('❌ User info element not found');
  }
}

// Show user info
function showUserInfo(user) {
  console.log('👤 Showing user info for:', user.user_mail);
  const authForm = document.getElementById('authForm');
  const userInfo = document.getElementById('userInfo');
  
  if (authForm) {
    authForm.style.display = 'none';
    console.log('✅ Auth form hidden');
  } else {
    console.error('❌ Auth form element not found');
  }
  
  if (userInfo) {
    userInfo.style.display = 'block';
    console.log('✅ User info shown');
    
    const userEmail = document.getElementById('userEmail');
    const userTokens = document.getElementById('userTokens');
    
    if (userEmail) {
      userEmail.textContent = user.user_mail;
    }
    if (userTokens) {
      userTokens.textContent = `${user.user_token.toLocaleString()} tokens`;
    }
    
    // Start real-time token update
    startTokenUpdateInterval();
  } else {
    console.error('❌ User info element not found');
  }
}

// Start real-time token update
function startTokenUpdateInterval() {
  // Clear existing interval
  if (window.tokenUpdateInterval) {
    clearInterval(window.tokenUpdateInterval);
  }
  
  // Update every 5 seconds
  window.tokenUpdateInterval = setInterval(async () => {
    try {
      console.log('🔄 Updating token balance...');
      const userData = await chrome.storage.local.get(['geminiUser']);
      if (userData.geminiUser) {
        const userTokens = document.getElementById('userTokens');
        if (userTokens) {
          userTokens.textContent = `${userData.geminiUser.user_token.toLocaleString()} tokens`;
          console.log('✅ Token balance updated:', userData.geminiUser.user_token);
        }
      }
    } catch (error) {
      console.error('❌ Error updating token balance:', error);
    }
  }, 5000); // Update every 5 seconds
}

// Stop token update interval
function stopTokenUpdateInterval() {
  if (window.tokenUpdateInterval) {
    clearInterval(window.tokenUpdateInterval);
    window.tokenUpdateInterval = null;
  }
}

// Handle login
async function handleLogin() {
  console.log('🔑 Login button clicked');
  
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  
  console.log('📧 Email:', email);
  console.log('🔒 Password length:', password.length);
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  const loginBtn = document.getElementById('loginBtn');
  const originalText = loginBtn.textContent;
  loginBtn.textContent = '⏳ Logging in...';
  loginBtn.disabled = true;

  try {
    console.log('🌐 Sending login request...');
    const response = await fetch('https://autoreply-gt64.onrender.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (response.ok) {
      // Store user data
      await chrome.storage.local.set({ geminiUser: data.user });
      showUserInfo(data.user);
      showNotification('Login successful! Welcome to Gemini Auto Reply!', 'success');
      
      // Notify content scripts about login
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'USER_LOGGED_IN', 
          user: data.user 
        });
      });
    } else {
      alert(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    alert('Login failed. Please try again.');
  } finally {
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
  }
}

// Handle register
async function handleRegister() {
  console.log('📝 Register button clicked');
  
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  
  console.log('📧 Email:', email);
  console.log('🔒 Password length:', password.length);
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters long');
    return;
  }

  const registerBtn = document.getElementById('registerBtn');
  const originalText = registerBtn.textContent;
  registerBtn.textContent = '⏳ Registering...';
  registerBtn.disabled = true;

  try {
    console.log('🌐 Sending register request...');
    const response = await fetch('https://autoreply-gt64.onrender.com/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (response.ok) {
      // Store user data
      await chrome.storage.local.set({ geminiUser: data.user });
      showUserInfo(data.user);
      showNotification('Registration successful! Welcome to Gemini Auto Reply!', 'success');
      
      // Notify content scripts about login
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'USER_LOGGED_IN', 
          user: data.user 
        });
      });
    } else if (data.user) {
      // User exists, login instead
      await chrome.storage.local.set({ geminiUser: data.user });
      showUserInfo(data.user);
      showNotification('User already exists! Logged in successfully.', 'success');
      
      // Notify content scripts about login
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'USER_LOGGED_IN', 
          user: data.user 
        });
      });
    } else {
      alert(data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    alert('Registration failed. Please try again.');
  } finally {
    registerBtn.textContent = originalText;
    registerBtn.disabled = false;
  }
}

// Handle logout
async function handleLogout() {
  console.log('🚪 Logging out...');
  await chrome.storage.local.remove(['geminiUser']);
  stopTokenUpdateInterval();
  showLoginForm();
  showNotification('Logged out successfully', 'info');
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: ${type === 'success' ? '#00ba7c' : type === 'error' ? '#f4212e' : '#1d9bf0'};
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 1000;
    max-width: 200px;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  console.log('🔧 Setting up event listeners...');
  
  // Check if elements exist before adding listeners
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const topUpBtn = document.getElementById('topUpBtn');
  const passwordInput = document.getElementById('passwordInput');
  
  console.log('🔍 Element check:');
  console.log('- loginBtn:', loginBtn);
  console.log('- registerBtn:', registerBtn);
  console.log('- logoutBtn:', logoutBtn);
  console.log('- topUpBtn:', topUpBtn);
  console.log('- passwordInput:', passwordInput);
  
  if (loginBtn) {
    console.log('✅ Adding login button listener');
    loginBtn.addEventListener('click', (e) => {
      console.log('🔑 Login button clicked via event listener');
      e.preventDefault();
      handleLogin();
    });
  } else {
    console.error('❌ Login button not found');
  }
  
  if (registerBtn) {
    console.log('✅ Adding register button listener');
    registerBtn.addEventListener('click', (e) => {
      console.log('📝 Register button clicked via event listener');
      e.preventDefault();
      handleRegister();
    });
  } else {
    console.error('❌ Register button not found');
  }
  
  if (logoutBtn) {
    console.log('✅ Adding logout button listener');
    logoutBtn.addEventListener('click', handleLogout);
  } else {
    console.error('❌ Logout button not found');
  }
  
  if (topUpBtn) {
    console.log('✅ Adding top-up button listener');
    topUpBtn.addEventListener('click', () => {
      showNotification('Top-up feature coming soon! Send USDC to rizkygm23.eth', 'info');
    });
      } else {
    console.error('❌ Top-up button not found');
  }
  
  if (passwordInput) {
    console.log('✅ Adding password input listener');
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  } else {
    console.error('❌ Password input not found');
  }

  // Settings button - Show settings in popup
  const settingsBtn = document.getElementById('openSettings');
  if (settingsBtn) {
    console.log('✅ Settings button found, adding listener');
    settingsBtn.addEventListener('click', () => {
      console.log('⚙️ Settings button clicked');
      showSettingsInPopup();
    });
  } else {
    console.error('❌ Settings button not found');
  }
  
  // Analytics button - Show analytics in popup
  const analyticsBtn = document.getElementById('viewAnalytics');
  if (analyticsBtn) {
    console.log('✅ Analytics button found, adding listener');
    analyticsBtn.addEventListener('click', () => {
      console.log('📊 Analytics button clicked');
      showAnalyticsInPopup();
    });
  } else {
    console.error('❌ Analytics button not found');
  }
}

// Show settings in popup
function showSettingsInPopup() {
  console.log('⚙️ Showing settings in popup');
  
  // Hide other sections
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('analyticsSection').style.display = 'none';
  
  // Show settings section
  const settingsSection = document.getElementById('settingsSection');
  if (!settingsSection) {
    createSettingsSection();
  } else {
    settingsSection.style.display = 'block';
  }
}

// Show analytics in popup
function showAnalyticsInPopup() {
  console.log('📊 Showing analytics in popup');
  
  // Hide other sections
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('settingsSection').style.display = 'none';
  
  // Show analytics section
  const analyticsSection = document.getElementById('analyticsSection');
  if (!analyticsSection) {
    createAnalyticsSection();
  } else {
    analyticsSection.style.display = 'block';
    loadAnalyticsData();
  }
}

// Create settings section
function createSettingsSection() {
  const settingsHTML = `
    <div class="settings-section" id="settingsSection">
      <div class="section-title">⚙️ Settings</div>
      <div class="settings-content">
        <div class="setting-item">
          <label>Auto-paste replies</label>
          <input type="checkbox" id="autoPasteSetting" checked>
        </div>
        <div class="setting-item">
          <label>Open reply composer</label>
          <input type="checkbox" id="openComposerSetting" checked>
        </div>
        <div class="setting-item">
          <label>Show notifications</label>
          <input type="checkbox" id="showNotificationsSetting" checked>
        </div>
        <div class="setting-item">
          <label>Debug mode</label>
          <input type="checkbox" id="debugModeSetting">
        </div>
        <div class="settings-actions">
          <button class="btn" id="saveSettingsBtn">💾 Save Settings</button>
          <button class="btn btn-secondary" id="backToMainBtn">← Back</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('authContent').insertAdjacentHTML('afterend', settingsHTML);
  
  // Add event listeners
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('backToMainBtn').addEventListener('click', showMainView);
  
  // Load current settings
  loadSettings();
}

// Create analytics section
function createAnalyticsSection() {
  const analyticsHTML = `
    <div class="analytics-section" id="analyticsSection">
      <div class="section-title">📊 Analytics</div>
      <div class="analytics-content">
        <div class="analytics-stats">
          <div class="stat-item">
            <div class="stat-label">Total Requests</div>
            <div class="stat-value" id="totalRequests">0</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Today's Requests</div>
            <div class="stat-value" id="todayRequests">0</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Tokens Used</div>
            <div class="stat-value" id="tokensUsed">0</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Success Rate</div>
            <div class="stat-value" id="successRate">0%</div>
          </div>
        </div>
        <div class="analytics-actions">
          <button class="btn" id="refreshAnalyticsBtn">🔄 Refresh</button>
          <button class="btn btn-secondary" id="backToMainBtn2">← Back</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('authContent').insertAdjacentHTML('afterend', analyticsHTML);
  
  // Add event listeners
  document.getElementById('refreshAnalyticsBtn').addEventListener('click', loadAnalyticsData);
  document.getElementById('backToMainBtn2').addEventListener('click', showMainView);
}

// Show main view
function showMainView() {
  console.log('🏠 Showing main view');
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('settingsSection').style.display = 'none';
  document.getElementById('analyticsSection').style.display = 'none';
}

// Load settings
function loadSettings() {
  chrome.storage.local.get(['geminiSettings'], (result) => {
    const settings = result.geminiSettings || {
      autoPaste: true,
      openComposer: true,
      showNotifications: true,
      debugMode: false
    };
    
    document.getElementById('autoPasteSetting').checked = settings.autoPaste;
    document.getElementById('openComposerSetting').checked = settings.openComposer;
    document.getElementById('showNotificationsSetting').checked = settings.showNotifications;
    document.getElementById('debugModeSetting').checked = settings.debugMode;
  });
}

// Save settings
function saveSettings() {
  const settings = {
    autoPaste: document.getElementById('autoPasteSetting').checked,
    openComposer: document.getElementById('openComposerSetting').checked,
    showNotifications: document.getElementById('showNotificationsSetting').checked,
    debugMode: document.getElementById('debugModeSetting').checked
  };
  
  chrome.storage.local.set({ geminiSettings: settings }, () => {
    showNotification('Settings saved successfully!', 'success');
  });
}

// Load analytics data
async function loadAnalyticsData() {
  try {
    console.log('📊 Loading analytics data...');
    
    // Get user data for token info
    const userData = await chrome.storage.local.get(['geminiUser']);
    if (userData.geminiUser) {
      const user = userData.geminiUser;
      document.getElementById('tokensUsed').textContent = (200000 - user.user_token).toLocaleString();
    }
    
    // Get analytics from background
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ANALYTICS' });
      const analytics = response || [];
      
      const totalRequests = analytics.length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayRequests = analytics.filter(event => event.timestamp >= todayStart).length;
      
      const successRequests = analytics.filter(event => event.type === 'reply_generated' && event.success).length;
      const successRate = totalRequests > 0 ? Math.round((successRequests / totalRequests) * 100) : 0;
      
      document.getElementById('totalRequests').textContent = totalRequests;
      document.getElementById('todayRequests').textContent = todayRequests;
      document.getElementById('successRate').textContent = successRate + '%';
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      document.getElementById('totalRequests').textContent = '0';
      document.getElementById('todayRequests').textContent = '0';
      document.getElementById('successRate').textContent = '0%';
    }
    
  } catch (error) {
    console.error('Error loading analytics data:', error);
  }
}

// Handle keyboard shortcuts in popup
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 's':
        e.preventDefault();
        document.getElementById('openSettings').click();
        break;
      case 'a':
        e.preventDefault();
        document.getElementById('viewAnalytics').click();
        break;
    }
  }
});

// Add some interactive feedback
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-1px)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0)';
  });
});

// Show loading state when buttons are clicked
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const originalText = this.innerHTML;
    this.innerHTML = '⏳ Loading...';
    this.disabled = true;
    
    setTimeout(() => {
      this.innerHTML = originalText;
      this.disabled = false;
    }, 1000);
  });
});

console.log('🚀 Gemini Extension Enhanced popup loaded');
