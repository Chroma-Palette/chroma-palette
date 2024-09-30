chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureTab") {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, dataUrl => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ dataUrl: dataUrl });
            }
        });
        return true; // Indicates that the response is sent asynchronously
    }
});