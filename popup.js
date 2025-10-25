// popup.js - Enhanced Popup Interface

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadAnalytics();
  setupEventListeners();
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

// Setup event listeners
function setupEventListeners() {
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
