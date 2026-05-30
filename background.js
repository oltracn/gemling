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

// On install, set default state
chrome.runtime.onInstalled.addListener(() => {
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
