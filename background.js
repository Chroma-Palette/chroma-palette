/**
 * This background script runs continuously and manages the extension's core functionality.
 * It handles communication between the popup and content scripts, and manages tab capturing.
 */

/**
 * Listens for messages from the popup or content scripts.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureTab') {
      captureVisibleTab(sendResponse);
      return true; // Indicates that the response will be sent asynchronously
    }
  });
  
  /**
   * Captures the visible area of the current tab.
   * @param {function} sendResponse - Callback function to send the captured image data
   */
  function captureVisibleTab(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, function (dataUrl) {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl: dataUrl });
        }
      });
    });
  }
  
  /**
   * Listens for tab updates to refresh the extension icon if needed.
   */
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      // You could add logic here to update the extension icon or state
      // based on the current tab, if needed
    }
  });
  
  /**
   * Listens for installation or update of the extension.
   */
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Extension installed');
      // You could add logic here for first-time setup
    } else if (details.reason === 'update') {
      console.log('Extension updated');
      // You could add logic here to handle version updates
    }
  });
  