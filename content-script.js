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
    sendResponse({ success: true });
    document.addEventListener('click', pickColor);
  }
});

function pickColor(event) {
  if (!isEyedropperActive) return;

  const x = event.clientX;
  const y = event.clientY;

  // Use a canvas to get the color at the clicked position
  html2canvas(document.body).then(canvas => {
    const ctx = canvas.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

    // Send the color back to the popup
    chrome.runtime.sendMessage({ action: 'colorPicked', color: { r: pixel[0], g: pixel[1], b: pixel[2] } });

    // Clean up
    isEyedropperActive = false;
    document.removeEventListener('click', pickColor);
  });
}
