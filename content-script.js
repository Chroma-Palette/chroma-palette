let isPickerActive = false;
let pickerOverlay;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activateColorPicker') {
    activateColorPicker();
  }
  return true;
});

function activateColorPicker() {
  isPickerActive = true;
  document.body.style.cursor = 'crosshair';

  pickerOverlay = document.createElement('div');
  pickerOverlay.style.position = 'fixed';
  pickerOverlay.style.top = '0';
  pickerOverlay.style.left = '0';
  pickerOverlay.style.width = '100%';
  pickerOverlay.style.height = '100%';
  pickerOverlay.style.zIndex = '9999';
  pickerOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
  document.body.appendChild(pickerOverlay);

  pickerOverlay.addEventListener('click', handleColorPick);
  pickerOverlay.addEventListener('mousemove', updatePickerPreview);
}

function handleColorPick(event) {
  const color = getColorAtPoint(event.clientX, event.clientY);
  chrome.runtime.sendMessage({ action: 'colorPicked', color: color });
  deactivateColorPicker();
}

function updatePickerPreview(event) {
  const color = getColorAtPoint(event.clientX, event.clientY);
  pickerOverlay.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
}


function getColorAtPoint(x, y) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1;
  canvas.height = 1;

  // Replace drawWindow with a more compatible method
  context.drawImage(window.document.documentElement, -x, -y);

  const imageData = context.getImageData(0, 0, 1, 1);
  return {
    r: imageData.data[0],
    g: imageData.data[1],
    b: imageData.data[2]
  };
}

function deactivateColorPicker() {
  isPickerActive = false;
  document.body.style.cursor = 'default';
  if (pickerOverlay) {
    pickerOverlay.removeEventListener('click', handleColorPick);
    pickerOverlay.removeEventListener('mousemove', updatePickerPreview);
    document.body.removeChild(pickerOverlay);
    pickerOverlay = null;
  }
}

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


captureColors()
  .then((colors) => colors)
  .catch((error) => ({ error: error.toString() }));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  return true;
});