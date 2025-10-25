// popup.js - Enhanced Popup Interface

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Popup DOM loaded, initializing...');
  await loadAnalytics();
  await checkAuthStatus();
  
  // Wait a bit for DOM to be fully ready
  setTimeout(() => {
    setupEventListeners();
  }, 100);
});

// Load analytics data and display stats
async function loadAnalytics() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ANALYTICS' });
    const analytics = response || [];
    
    // Calculate stats
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    const totalEvents = analytics.length;
    const todayEvents = analytics.filter(event => event.timestamp >= todayStart).length;
    
    // Update UI
    document.getElementById('totalEvents').textContent = totalEvents;
    document.getElementById('todayEvents').textContent = todayEvents;
    
  } catch (error) {
    console.error('Failed to load analytics:', error);
    document.getElementById('totalEvents').textContent = '0';
    document.getElementById('todayEvents').textContent = '0';
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const userData = await chrome.storage.local.get(['geminiUser']);
    if (userData.geminiUser) {
      showUserInfo(userData.geminiUser);
    } else {
      showLoginForm();
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    showLoginForm();
  }
}

// Show login form
function showLoginForm() {
  document.getElementById('authForm').style.display = 'block';
  document.getElementById('userInfo').style.display = 'none';
}

// Show user info
function showUserInfo(user) {
  document.getElementById('authForm').style.display = 'none';
  document.getElementById('userInfo').style.display = 'block';
  
  document.getElementById('userEmail').textContent = user.user_mail;
  document.getElementById('userTokens').textContent = `${user.user_token.toLocaleString()} tokens`;
}

// Handle login
async function handleLogin() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  const loginBtn = document.getElementById('loginBtn');
  const originalText = loginBtn.textContent;
  loginBtn.textContent = '⏳ Logging in...';
  loginBtn.disabled = true;

  try {
    const response = await fetch('https://autoreply-gt64.onrender.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
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
    console.error('Login error:', error);
    alert('Login failed. Please try again.');
  } finally {
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
  }
}

// Handle register
async function handleRegister() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  
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
    const response = await fetch('https://autoreply-gt64.onrender.com/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
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
    console.error('Registration error:', error);
    alert('Registration failed. Please try again.');
  } finally {
    registerBtn.textContent = originalText;
    registerBtn.disabled = false;
  }
}

// Handle logout
async function handleLogout() {
  await chrome.storage.local.remove(['geminiUser']);
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
  
  if (loginBtn) {
    console.log('✅ Adding login button listener');
    loginBtn.addEventListener('click', handleLogin);
  } else {
    console.error('❌ Login button not found');
  }
  
  if (registerBtn) {
    console.log('✅ Adding register button listener');
    registerBtn.addEventListener('click', handleRegister);
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

  // Settings button
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          if (window.geminiExtension && window.geminiExtension.showSettingsPanel) {
            window.geminiExtension.showSettingsPanel();
          } else {
            alert('Please navigate to Twitter/X or Discord to access settings!');
          }
        }
      });
    });
    window.close();
  });
  
  // Analytics button
  document.getElementById('viewAnalytics').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          if (window.geminiExtension && window.geminiExtension.showSettingsPanel) {
            window.geminiExtension.showSettingsPanel();
            // Focus on analytics section
            setTimeout(() => {
              const analyticsSection = document.querySelector('.gemini-settings-panel .settings-section:last-child');
              if (analyticsSection) {
                analyticsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
      } else {
            alert('Please navigate to Twitter/X or Discord to view analytics!');
          }
        }
      });
    });
    window.close();
  });
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
