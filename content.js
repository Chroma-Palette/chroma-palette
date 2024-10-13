/**
 * This content script is injected into web pages to interact with their content.
 * It handles color extraction from the visible area of the page.
 */

console.log('Content script loaded');

// Notify the extension that the content script has been loaded successfully
chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });

/**
 * Listens for messages from the extension's background script or popup.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === 'getColors') {
    getPageColors();
    sendResponse({ status: 'Colors request received' });
  } else if (request.action === 'activateEyedropper') {
    // Code to activate the eyedropper tool
    // For example, you might want to set up an event listener for mouse clicks
    // to capture the color of the pixel where the user clicks.
    sendResponse({ success: true });
  }
  return true; // Indicates that the response will be sent asynchronously
});

/**
 * Extracts colors from the visible area of the webpage.
 * Uses html2canvas to capture the page and ColorThief for color extraction.
 */
function getPageColors() {
  console.log('Getting page colors');

  // Capture the visible part of the page
  html2canvas(document.body)
    .then((canvas) => {
      const colorThief = new ColorThief();
      const colorPalette = colorThief.getPalette(canvas, 5);
      console.log('Color palette:', colorPalette);
      // Send the extracted color palette back to the extension
      chrome.runtime.sendMessage({ action: 'gotColors', colors: colorPalette });
    })
    .catch((error) => {
      console.error('Error capturing page:', error);
      // Notify the extension of the error
      chrome.runtime.sendMessage({
        action: 'error',
        message: 'Failed to capture page',
      });
    });
}
