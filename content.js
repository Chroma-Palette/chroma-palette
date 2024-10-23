console.log('Content script loaded');

chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === 'getColors') {
    getPageColors();
    sendResponse({ status: 'Colors request received' });
  }
  return true;
});


function getPageColors() {
  console.log('Getting page colors');

  html2canvas(document.body)
    .then((canvas) => {
      const colorThief = new ColorThief();
      const colorPalette = colorThief.getPalette(canvas, 5);
      console.log('Color palette:', colorPalette);
      chrome.runtime.sendMessage({ action: 'gotColors', colors: colorPalette });
    })
    .catch((error) => {
      console.error('Error capturing page:', error);
      chrome.runtime.sendMessage({
        action: 'error',
        message: 'Failed to capture page',
      });
    });
}
