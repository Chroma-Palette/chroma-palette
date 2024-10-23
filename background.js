chrome.action.onClicked.addListener((tab) => {
  chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'keepPopupOpen') {
    chrome.action.setPopup({ popup: 'popup.html' });
    sendResponse({ status: 'Popup set to stay open' });
  }
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureTab') {
      captureVisibleTab(sendResponse);
      return true; // Indicates that the response will be sent asynchronously
    }
  });
  
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
  

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      // You could add logic here to update the extension icon or state
      // based on the current tab, if needed
    }
  });
  

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Extension installed');
      // You could add logic here for first-time setup
    } else if (details.reason === 'update') {
      console.log('Extension updated');
      // You could add logic here to handle version updates
    }
  });
  