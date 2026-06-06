// background.js

// Dynamic pixel manipulation to set the action icon to grayscale
async function updateActionIcon(isEnabled) {
  if (isEnabled) {
    try {
      await chrome.action.setIcon({
        path: {
          "16": "assets/icon16.png",
          "32": "assets/icon32.png",
          "48": "assets/icon48.png",
          "128": "assets/icon128.png"
        }
      });
    } catch (err) {
      console.error('[Gemling Background] Failed to reset native icon:', err);
    }
    return;
  }

  const sizes = [16, 32, 48, 128];
  const imageDataDict = {};
  
  try {
    for (const size of sizes) {
      const response = await fetch(chrome.runtime.getURL(`assets/icon${size}.png`));
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0, size, size); // Explicitly scale to fill canvas
      
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Classic luminance formula
        const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i]     = avg; // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
      }
      imageDataDict[size] = imageData;
    }
    
    await chrome.action.setIcon({ imageData: imageDataDict });
  } catch (err) {
    console.error('[Gemling Background] Failed to update grayscale icon:', err);
  }
}

// Register headers modification rule on install and startup to allow iframes
async function registerNetRequestRules() {
  if (chrome.declarativeNetRequest) {
    const ruleId = 1;
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [{
          id: ruleId,
          priority: 1,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "X-Frame-Options", operation: "remove" },
              { header: "Content-Security-Policy", operation: "remove" }
            ]
          },
          condition: {
            urlFilter: "||gemini.google.com/*",
            resourceTypes: ["sub_frame"]
          }
        }]
      });
      console.log('[Gemling Background] Registered declarativeNetRequest rules');
    } catch (err) {
      console.error('[Gemling Background] Failed to register declarativeNetRequest rules:', err);
    }
  }
}

// On install, set default state
chrome.runtime.onInstalled.addListener(() => {
  registerNetRequestRules();
  chrome.storage.local.get({ isEnabled: true }, (result) => {
    updateActionIcon(result.isEnabled);
    chrome.action.setTitle({
      title: result.isEnabled ? 'Gemling (已启用)' : 'Gemling (已停用)'
    });
  });
});

// On startup, ensure rules are registered and icon state is restored
chrome.runtime.onStartup.addListener(() => {
  registerNetRequestRules();
  chrome.storage.local.get({ isEnabled: true }, (result) => {
    updateActionIcon(result.isEnabled);
    chrome.action.setTitle({
      title: result.isEnabled ? 'Gemling (已启用)' : 'Gemling (已停用)'
    });
  });
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get({ isEnabled: true }, (result) => {
    const nextState = !result.isEnabled;
    chrome.storage.local.set({ isEnabled: nextState }, () => {
      updateActionIcon(nextState);
      chrome.action.setTitle({
        title: nextState ? 'Gemling (已启用)' : 'Gemling (已停用)'
      });
      
      // Notify active tabs
      chrome.tabs.query({ url: 'https://gemini.google.com/*' }, (tabs) => {
        for (const targetTab of tabs) {
          if (targetTab.id) {
            chrome.tabs.sendMessage(targetTab.id, { action: 'toggle-gemling', isEnabled: nextState }).catch(() => {
              // Ignore errors for tabs where content script isn't loaded
            });
          }
        }
      });
    });
  });
});

// Handle messages for bulk exporting and image fetching
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open-export-tab') {
    chrome.tabs.create({
      url: `https://gemini.google.com/app/${message.convId}?gemling-export=true`,
      active: true,
      openerTabId: sender.tab ? sender.tab.id : undefined
    }, (tab) => {
      sendResponse({ tabId: tab.id });
    });
    return true; // async sendResponse
  }
  
  if (message.action === 'close-tab') {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id);
    }
  }

  if (message.action === 'fetch-image') {
    fetch(message.url)
      .then(res => {
        const mimeType = res.headers.get('content-type') || 'image/png';
        return res.arrayBuffer().then(buf => ({ buf, mimeType }));
      })
      .then(({ buf, mimeType }) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        sendResponse({ status: 'success', base64: base64, mimeType: mimeType });
      })
      .catch(err => {
        sendResponse({ status: 'error', error: err.message });
      });
    return true; // async sendResponse
  }
});
