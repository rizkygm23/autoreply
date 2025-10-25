// auth-helper.js - Authentication Helper for Content Scripts

// === Authentication Manager ===
class AuthManager {
  constructor() {
    this.user = null;
    this.apiBaseUrl = "https://autoreply-gt64.onrender.com";
    this.loadUser();
  }

  // Load user from localStorage
  loadUser() {
    try {
      const stored = localStorage.getItem('geminiUser');
      this.user = stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load user:', error);
      this.user = null;
    }
  }

  // Save user to localStorage
  saveUser(user) {
    try {
      this.user = user;
      localStorage.setItem('geminiUser', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to save user:', error);
    }
  }

  // Clear user data
  clearUser() {
    this.user = null;
    localStorage.removeItem('geminiUser');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.user && this.user.user_id;
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Get user ID
  getUserId() {
    return this.user ? this.user.user_id : null;
  }

  // Get user tokens
  getUserTokens() {
    return this.user ? this.user.user_token : 0;
  }

  // Update user tokens
  updateUserTokens(newTokenCount) {
    if (this.user) {
      this.user.user_token = newTokenCount;
      this.saveUser(this.user);
    }
  }

  // === API Methods ===
  async register(email) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.saveUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error, user: data.user };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async login(email) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.saveUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async getUserInfo() {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/user/${this.getUserId()}`);
      const data = await response.json();
      
      if (response.ok) {
        this.saveUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Get user info error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // === Payment Methods ===
  async createPayment(txHash, dollarValue, tokenValue) {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.getUserId(),
          txHash,
          dollarValue,
          tokenValue
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create payment error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async confirmPayment(txHash) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/payment/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash })
      });

      const data = await response.json();
      
      if (data.success && data.payment) {
        // Update user tokens
        const newTokenCount = this.getUserTokens() + data.payment.valueToken;
        this.updateUserTokens(newTokenCount);
      }
      
      return data;
    } catch (error) {
      console.error('Confirm payment error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // === Enhanced API Request with Authentication ===
  async authenticatedRequest(endpoint, options = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const defaultOptions = {
      headers: { 
        'Content-Type': 'application/json',
        'X-User-ID': this.getUserId().toString()
      },
      ...options
    };

    // Add userId to request body if it's a POST request
    if (options.method === 'POST' && options.body) {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      body.userId = this.getUserId();
      defaultOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, defaultOptions);
    const data = await response.json();

    // Update user tokens if response includes token info
    if (data.remainingTokens !== undefined) {
      this.updateUserTokens(data.remainingTokens);
    }

    return { response, data };
  }
}

// === Authentication UI Components ===
class AuthUI {
  constructor(authManager) {
    this.authManager = authManager;
    this.currentModal = null;
  }

  // Show login/register modal
  showAuthModal() {
    if (this.currentModal) {
      this.currentModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'gemini-auth-modal';
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
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #e7e9ea; margin: 0; font-size: 20px;">🚀 Gemini Auto Reply</h2>
          <p style="color: #888; margin: 8px 0 0 0; font-size: 14px;">Sign in to use AI features</p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #e7e9ea; margin-bottom: 8px; font-size: 14px;">Email Address</label>
          <input type="email" id="authEmail" placeholder="your@email.com" style="
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
          <button id="loginBtn" style="
            flex: 1;
            background: #1d9bf0;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Login</button>
          <button id="registerBtn" style="
            flex: 1;
            background: #00ba7c;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Register</button>
        </div>
        
        <div style="text-align: center; color: #888; font-size: 12px;">
          <p>New users get 200,000 free tokens!</p>
          <p>Each AI request costs 100 tokens</p>
        </div>
        
        <button id="closeAuth" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: #888;
          font-size: 20px;
          cursor: pointer;
        ">×</button>
      </div>
    `;

    // Event listeners
    modal.querySelector('#closeAuth').onclick = () => modal.remove();
    modal.querySelector('#loginBtn').onclick = () => this.handleLogin(modal);
    modal.querySelector('#registerBtn').onclick = () => this.handleRegister(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
    this.currentModal = modal;
    
    // Focus email input
    setTimeout(() => {
      modal.querySelector('#authEmail').focus();
    }, 100);
  }

  async handleLogin(modal) {
    const email = modal.querySelector('#authEmail').value.trim();
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    const loginBtn = modal.querySelector('#loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;

    try {
      const result = await this.authManager.login(email);
      
      if (result.success) {
        modal.remove();
        this.showUserInfo();
        this.showNotification('Login successful!', 'success');
      } else {
        alert(result.error || 'Login failed');
      }
    } catch (error) {
      alert('Login failed. Please try again.');
    } finally {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  }

  async handleRegister(modal) {
    const email = modal.querySelector('#authEmail').value.trim();
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    const registerBtn = modal.querySelector('#registerBtn');
    const originalText = registerBtn.textContent;
    registerBtn.textContent = 'Registering...';
    registerBtn.disabled = true;

    try {
      const result = await this.authManager.register(email);
      
      if (result.success) {
        modal.remove();
        this.showUserInfo();
        this.showNotification('Registration successful! Welcome to Gemini Auto Reply!', 'success');
      } else if (result.user) {
        // User already exists, login instead
        this.authManager.saveUser(result.user);
        modal.remove();
        this.showUserInfo();
        this.showNotification('Welcome back!', 'success');
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error) {
      alert('Registration failed. Please try again.');
    } finally {
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;
    }
  }

  // Show user info panel
  showUserInfo() {
    if (this.currentModal) {
      this.currentModal.remove();
    }

    const user = this.authManager.getCurrentUser();
    if (!user) return;

    const modal = document.createElement('div');
    modal.className = 'gemini-user-info';
    modal.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 16px;
      z-index: 2147483646;
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 300px;
    `;

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="color: #e7e9ea; margin: 0; font-size: 16px;">👤 Account</h3>
        <button id="closeUserInfo" style="
          background: none;
          border: none;
          color: #888;
          font-size: 18px;
          cursor: pointer;
        ">×</button>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Email</div>
        <div style="color: #e7e9ea; font-size: 14px;">${user.user_mail}</div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Tokens</div>
        <div style="color: #00ba7c; font-size: 18px; font-weight: bold;">${user.user_token.toLocaleString()}</div>
      </div>
      
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button id="topUpBtn" style="
          flex: 1;
          background: #1d9bf0;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        ">💳 Top Up</button>
        <button id="logoutBtn" style="
          flex: 1;
          background: #f4212e;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        ">🚪 Logout</button>
      </div>
      
      <div style="text-align: center; color: #888; font-size: 11px;">
        <p>Need more tokens? Send USDC to rizkygm23.eth</p>
        <p>Minimum: $5 (5,000 tokens)</p>
      </div>
    `;

    // Event listeners
    modal.querySelector('#closeUserInfo').onclick = () => modal.remove();
    modal.querySelector('#logoutBtn').onclick = () => {
      this.authManager.clearUser();
      modal.remove();
      this.showNotification('Logged out successfully', 'info');
    };
    modal.querySelector('#topUpBtn').onclick = () => {
      modal.remove();
      this.showTopUpModal();
    };

    document.body.appendChild(modal);
    this.currentModal = modal;
  }

  // Show top-up modal
  showTopUpModal() {
    if (this.currentModal) {
      this.currentModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'gemini-topup-modal';
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
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #e7e9ea; margin: 0; font-size: 20px;">💳 Top Up Tokens</h2>
          <p style="color: #888; margin: 8px 0 0 0; font-size: 14px;">Send USDC to get more tokens</p>
        </div>
        
        <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <div style="color: #888; font-size: 12px; margin-bottom: 8px;">Send USDC to:</div>
          <div style="color: #1d9bf0; font-size: 16px; font-weight: bold; word-break: break-all;">rizkygm23.eth</div>
          <div style="color: #888; font-size: 12px; margin-top: 8px;">Network: Arbitrum</div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #e7e9ea; margin-bottom: 8px; font-size: 14px;">Transaction Hash</label>
          <input type="text" id="txHash" placeholder="0x..." style="
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
          <label style="display: block; color: #e7e9ea; margin-bottom: 8px; font-size: 14px;">Amount (USD)</label>
          <input type="number" id="amount" placeholder="5" min="5" step="1" style="
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
          <button id="submitPayment" style="
            flex: 1;
            background: #00ba7c;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Submit Payment</button>
          <button id="cancelTopUp" style="
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
          <p>Rate: 1,000 tokens per $1</p>
          <p>Minimum payment: $5 (5,000 tokens)</p>
        </div>
        
        <button id="closeTopUp" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: #888;
          font-size: 20px;
          cursor: pointer;
        ">×</button>
      </div>
    `;

    // Event listeners
    modal.querySelector('#closeTopUp').onclick = () => modal.remove();
    modal.querySelector('#cancelTopUp').onclick = () => modal.remove();
    modal.querySelector('#submitPayment').onclick = () => this.handlePaymentSubmission(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
    this.currentModal = modal;
  }

  async handlePaymentSubmission(modal) {
    const txHash = modal.querySelector('#txHash').value.trim();
    const amount = parseFloat(modal.querySelector('#amount').value);

    if (!txHash) {
      alert('Please enter transaction hash');
      return;
    }

    if (!amount || amount < 5) {
      alert('Minimum payment is $5');
      return;
    }

    const submitBtn = modal.querySelector('#submitPayment');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
      const tokenValue = amount * 1000; // 1000 tokens per $1
      const result = await this.authManager.createPayment(txHash, amount, tokenValue);
      
      if (result.success) {
        modal.remove();
        this.showNotification('Payment submitted! It will be confirmed shortly.', 'success');
      } else {
        alert(result.error || 'Payment submission failed');
      }
    } catch (error) {
      alert('Payment submission failed. Please try again.');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#00ba7c' : type === 'error' ? '#f4212e' : '#1d9bf0'};
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
}

// === Global Auth Manager Instance ===
window.geminiAuth = new AuthManager();
window.geminiAuthUI = new AuthUI(window.geminiAuth);

// === Auto-show auth modal if not authenticated ===
if (!window.geminiAuth.isAuthenticated()) {
  setTimeout(() => {
    window.geminiAuthUI.showAuthModal();
  }, 1000);
}
