// background.js - Service Worker for Gemini Extension Enhanced

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🚀 Gemini Extension Enhanced v2.0 installed!');
    
    // Set default settings
    chrome.storage.local.set({
      geminiExtensionSettings: {
        autoGenerate: false,
        showPreview: true,
        maxReplies: 20,
        selectedRoom: 'rialo',
        theme: 'dark',
        notifications: true,
        analytics: true
      }
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  } else if (details.reason === 'update') {
    console.log('🔄 Gemini Extension Enhanced updated to v2.0!');
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup or inject content script
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Show extension info
      if (window.geminiExtension) {
        window.geminiExtension.showSettingsPanel();
      } else {
        alert('Gemini Extension Enhanced v2.0\n\nFeatures:\n• AI-powered replies\n• Multiple room personalities\n• Reply previews\n• Analytics dashboard\n• Keyboard shortcuts\n\nPress Ctrl+Shift+S for settings!');
      }
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'GET_SETTINGS':
      chrome.storage.local.get(['geminiExtensionSettings'], (result) => {
        sendResponse(result.geminiExtensionSettings || {});
      });
      return true; // Keep message channel open for async response
      
    case 'SAVE_SETTINGS':
      chrome.storage.local.set({
        geminiExtensionSettings: request.settings
      }, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'GET_ANALYTICS':
      chrome.storage.local.get(['geminiAnalytics'], (result) => {
        sendResponse(result.geminiAnalytics || []);
      });
      return true;
      
    case 'SAVE_ANALYTICS':
      chrome.storage.local.set({
        geminiAnalytics: request.analytics
      }, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'SHOW_NOTIFICATION':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Gemini Extension',
        message: request.message
      });
      sendResponse({ success: true });
      break;
      
    case 'EXPORT_DATA':
      // Handle data export
      const exportData = {
        settings: request.settings,
        analytics: request.analytics,
        exportDate: new Date().toISOString(),
        version: '2.0.0'
      };
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: `gemini-extension-data-${new Date().toISOString().split('T')[0]}.json`,
        saveAs: true
      });
      
      sendResponse({ success: true });
      break;
  }
});

// Periodic cleanup of old analytics data
chrome.alarms.create('cleanupAnalytics', { 
  periodInMinutes: 60 * 24 // Daily cleanup
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupAnalytics') {
    chrome.storage.local.get(['geminiAnalytics'], (result) => {
      const analytics = result.geminiAnalytics || [];
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      // Keep only last 7 days of data
      const filteredAnalytics = analytics.filter(event => 
        event.timestamp > oneWeekAgo
      );
      
      if (filteredAnalytics.length !== analytics.length) {
        chrome.storage.local.set({
          geminiAnalytics: filteredAnalytics
        });
        console.log(`🧹 Cleaned up ${analytics.length - filteredAnalytics.length} old analytics events`);
      }
    });
  }
});

// Context menu for quick actions
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'geminiGenerateReply',
    title: 'Generate AI Reply',
    contexts: ['selection'],
    documentUrlPatterns: [
      'https://x.com/*',
      'https://twitter.com/*',
      'https://discord.com/channels/*'
    ]
  });
  
  chrome.contextMenus.create({
    id: 'geminiOpenSettings',
    title: 'Open Gemini Settings',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://x.com/*',
      'https://twitter.com/*',
      'https://discord.com/channels/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'geminiGenerateReply':
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (selectedText) => {
          // Find the tweet/message containing the selected text
          const elements = document.querySelectorAll('article, [id^="chat-messages-"] > div');
          for (const element of elements) {
            if (element.textContent.includes(selectedText)) {
              const btn = element.querySelector('.gemini-room-btn');
              if (btn) {
                btn.click();
                break;
              }
            }
          }
        },
        args: [info.selectionText]
      });
      break;
      
    case 'geminiOpenSettings':
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          if (window.geminiExtension && window.geminiExtension.showSettingsPanel) {
            window.geminiExtension.showSettingsPanel();
          }
        }
      });
      break;
  }
});

// Handle tab updates for SPA navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isSupportedSite = tab.url.includes('x.com') || 
                           tab.url.includes('twitter.com') || 
                           tab.url.includes('discord.com/channels');
    
    if (isSupportedSite) {
      // Update extension icon to show it's active
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          "16": "icon.png",
          "48": "icon.png",
          "128": "icon.png"
        }
      });
      
      chrome.action.setTitle({
        tabId: tabId,
        title: "Gemini Extension Enhanced - Active"
      });
    }
  }
});

console.log('🔧 Gemini Extension Enhanced background script loaded');
