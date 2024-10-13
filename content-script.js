function getColors(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      const colorThief = new ColorThief();
      const palette = colorThief.getPalette(img, 5);
      resolve(palette);
    };
    img.onerror = function () {
      reject('Failed to load image data');
    };
    img.src = dataUrl;
  });
}

// This function will be called from popup.js
function captureColors() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'captureTab' }, (response) => {
      if (response && response.dataUrl) {
        getColors(response.dataUrl).then(resolve).catch(reject);
      } else {
        reject('Failed to capture tab');
      }
    });
  });
}

// This line is necessary for the script to be executable
captureColors()
  .then((colors) => colors)
  .catch((error) => ({ error: error.toString() }));
let isEyedropperActive = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activateEyedropper') {
    isEyedropperActive = true;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('click', pickColor);
    sendResponse({ success: true });
  }
  return true;
});

function pickColor(event) {
  if (!isEyedropperActive) return;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = document.documentElement.scrollWidth;
  canvas.height = document.documentElement.scrollHeight;

  html2canvas(document.body).then((renderedCanvas) => {
    context.drawImage(renderedCanvas, 0, 0);
    const x = event.clientX + window.scrollX;
    const y = event.clientY + window.scrollY;
    const pixel = context.getImageData(x, y, 1, 1).data;
    const color = { r: pixel[0], g: pixel[1], b: pixel[2] };

    chrome.runtime.sendMessage({ action: 'colorPicked', color: color });

    // Clean up
    isEyedropperActive = false;
    document.body.style.cursor = 'default';
    document.removeEventListener('click', pickColor);
  });
}