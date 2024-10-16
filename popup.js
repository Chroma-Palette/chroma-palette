// Add these functions at the beginning of your file
function captureVisibleTab() {
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      resolve(dataUrl);
    });
  });
}

let pickedColors = [];
const MAX_PICKED_COLORS = 6;

function createColorPickerModal(imageDataUrl) {
  const modal = document.createElement('div');
  modal.id = 'colorPickerModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Pick Colors</h3>
      <p class="picker-instruction">Click on the image below to pick colors (max 6)</p>
      <div class="image-container">
        <img id="screenshotImage" src="${imageDataUrl}" alt="Screenshot">
      </div>
      <div id="pickedColorsContainer"></div>
      <div id="colorPreview"></div>
      <button id="finishPicking">Finish Picking</button>
      <button id="closeModal">Close</button>
    </div>
  `;
  document.body.appendChild(modal);

  const img = modal.querySelector('#screenshotImage');
  const colorPreview = modal.querySelector('#colorPreview');
  const pickedColorsContainer = modal.querySelector('#pickedColorsContainer');
  const finishPickingButton = modal.querySelector('#finishPicking');
  const closeButton = modal.querySelector('#closeModal');

  updatePickedColorsDisplay();

  img.addEventListener('click', (e) => {
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const color = getColorFromImage(e, img);
      if (pickedColors.length < MAX_PICKED_COLORS) {
        pickedColors.push(color);
        updatePickedColorsDisplay();
      }
      colorPreview.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    }
  });

  finishPickingButton.addEventListener('click', () => {
    displayColors(pickedColors.map(color => [color.r, color.g, color.b]));
    savePalette(pickedColors.map(color => [color.r, color.g, color.b]));
    document.body.removeChild(modal);
    pickedColors = []; // Reset picked colors
  });

  closeButton.addEventListener('click', () => {
    document.body.removeChild(modal);
    pickedColors = []; // Reset picked colors
  });
}

function updatePickedColorsDisplay() {
  const container = document.querySelector('#pickedColorsContainer');
  container.innerHTML = '';
  
  pickedColors.forEach((color, index) => {
    const colorBox = document.createElement('div');
    colorBox.className = 'picked-color-box';
    colorBox.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    colorBox.addEventListener('click', () => removePickedColor(index));
    container.appendChild(colorBox);
  });

  for (let i = pickedColors.length; i < MAX_PICKED_COLORS; i++) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'picked-color-box empty';
    emptyBox.textContent = '+';
    container.appendChild(emptyBox);
  }
}

function removePickedColor(index) {
  pickedColors.splice(index, 1);
  updatePickedColorsDisplay();
}

function getColorFromImage(event, img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0, img.width, img.height);

  const rect = img.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const imageData = ctx.getImageData(x, y, 1, 1);
  
  return {
    r: imageData.data[0],
    g: imageData.data[1],
    b: imageData.data[2]
  };
}



// Add this function at the beginning of your file
function keepPopupOpen() {
  chrome.action.setPopup({ popup: 'popup.html' });
}

/**
 * This script handles the main functionality of the Chroma Palette 🎨  extension.
 * It manages color extraction, display, and user interactions.
 */

let extractedPalettes = [];

/**
 * Captures the visible tab and extracts colors from it.
 * Handles potential errors during the process.
 */
function getPageColors() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function (dataUrl) {
      if (chrome.runtime.lastError) {
        displayError(chrome.runtime.lastError.message);
      } else {
        const img = new Image();
        img.onload = function () {
          const colorThief = new ColorThief();
          const colors = colorThief.getPalette(img, 6);
          displayColors(colors);
          savePalette(colors);
        };
        img.onerror = function () {
          displayError("Failed to load image data");
        };
        img.src = dataUrl;
      }
    });
  });
}

// Add this to your existing message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'colorPicked') {
    const color = request.color;
    const colors = [[color.r, color.g, color.b]];
    displayColors(colors);
    savePalette(colors);
    resetUIAfterColorPick();
  }
});

/**
 * Converts RGB color values to a hex code string.
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @return {string} Hex color code
 */
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/**
 * Copies the given text to clipboard and shows feedback.
 * @param {string} text - Text to copy
 * @param {HTMLElement} colorBox - The color box element that was clicked
 */
function copyToClipboard(text, colorBox, colors) {
  navigator.clipboard.writeText(text).then(() => {
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'copy-feedback';
    feedbackElement.textContent = 'Copied!';
    colorBox.appendChild(feedbackElement);
    setTimeout(() => colorBox.removeChild(feedbackElement), 1500);
    createConfetti(colors);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

/**
 * Displays an error message in the popup interface.
 * @param {string} message - The error message to display
 */
function displayError(message) {
  const palette = document.getElementById('palette');
  palette.innerHTML = `
          <div class="error-message">
              <p>Error: ${formatErrorMessage(message)}</p>
              <p class="error-hint">Please try again in a few moments.</p>
          </div>
      `;
  palette.classList.remove('grid');
}

/**
 * Formats error messages for user-friendly display.
 * @param {string} message - The original error message
 * @return {string} Formatted error message
 */
function formatErrorMessage(message) {
  if (message.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS")) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  return message;
}


function createConfetti(colors) {
  const confettiContainer = document.createElement('div');
  confettiContainer.style.position = 'fixed';
  confettiContainer.style.top = '0';
  confettiContainer.style.left = '0';
  confettiContainer.style.width = '100%';
  confettiContainer.style.height = '100%';
  confettiContainer.style.pointerEvents = 'none';
  document.body.appendChild(confettiContainer);

  const confettiCount = 50;
  const gravity = 0.5;
  const terminalVelocity = 5;
  const drag = 0.075;
  const confettis = [];

  for (let i = 0; i < confettiCount; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const confetti = {
      color: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      dimensions: {
        x: Math.random() * 10 + 5,
        y: Math.random() * 10 + 5,
      },
      position: {
        x: Math.random() * window.innerWidth,
        y: -20,
      },
      rotation: Math.random() * 360,
      scale: {
        x: 1,
        y: 1,
      },
      velocity: {
        x: Math.random() * 6 - 3,
        y: Math.random() * -15 - 15,
      },
    };
    confettis.push(confetti);
  }

  function updateConfetti() {
    confettiContainer.innerHTML = '';
    confettis.forEach((confetti, index) => {
      confetti.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();
      confetti.velocity.y += gravity;
      confetti.velocity.x *= drag;
      confetti.velocity.y = Math.min(confetti.velocity.y, terminalVelocity);
      confetti.position.x += confetti.velocity.x;
      confetti.position.y += confetti.velocity.y;
      confetti.scale.y = Math.cos((confetti.position.y + confetti.rotation) * 0.1);

      const confettiElement = document.createElement('div');
      confettiElement.style.position = 'absolute';
      confettiElement.style.width = `${confetti.dimensions.x}px`;
      confettiElement.style.height = `${confetti.dimensions.y}px`;
      confettiElement.style.backgroundColor = confetti.color;
      confettiElement.style.transform = `translate3d(${confetti.position.x}px, ${confetti.position.y}px, 0) rotate(${confetti.rotation}deg) scale(${confetti.scale.x}, ${confetti.scale.y})`;
      confettiContainer.appendChild(confettiElement);

      if (confetti.position.y >= window.innerHeight) {
        confettis.splice(index, 1);
      }
    });

    if (confettis.length > 0) {
      requestAnimationFrame(updateConfetti);
    } else {
      document.body.removeChild(confettiContainer);
    }
  }

  requestAnimationFrame(updateConfetti);
}

function createRipple(event) {
  const button = event.currentTarget;
  const rippleContainer = button.nextElementSibling;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
  circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
  circle.classList.add("ripple");

  const ripple = rippleContainer.getElementsByClassName("ripple")[0];

  if (ripple) {
    ripple.remove();
  }

  rippleContainer.appendChild(circle);
}


function createBubble() {
  const bubbleContainer = document.querySelector('.bubble-container');
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');

  const size = Math.random() * 30 + 10;
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;
  bubble.style.left = `${Math.random() * 100}%`;
  bubble.style.animationDuration = `${Math.random() * 2 + 2}s`;

  bubbleContainer.appendChild(bubble);

  setTimeout(() => {
    bubble.remove();
  }, 4000);
}

function startBubbleAnimation() {
  for (let i = 0; i < 10; i++) {
    setTimeout(createBubble, i * 300);
  }
}

function loadPalette(id) {
  const palette = extractedPalettes.find(p => p.id === id);
  if (palette) {
    showMainView();
    displayColors(palette.colors);
  }
}

function savePalette(colors) {
  const newPalette = {
    id: Date.now(),
    colors: colors,
    date: new Date().toLocaleString()
  };
  extractedPalettes.push(newPalette);
  localStorage.setItem('palettes', JSON.stringify(extractedPalettes));
}

function deletePalette(id) {
  extractedPalettes = extractedPalettes.filter(palette => palette.id !== id);
  localStorage.setItem('palettes', JSON.stringify(extractedPalettes));
  showHistoryView(); // Refresh the history view
}


function showHistoryView() {
  const content = document.querySelector('.content');
  content.innerHTML = `
    <h1>Color History</h1>
    <div id="historyList"></div>
    <button id="backButton">Back to Palette</button>
  `;

  const historyList = document.getElementById('historyList');
  extractedPalettes.forEach(palette => {
    const paletteElement = document.createElement('div');
    paletteElement.className = 'history-palette';
    paletteElement.innerHTML = `
      <div class="history-colors">
        ${palette.colors.map(color => `
          <div class="history-color" style="background-color: rgb(${color.join(',')})"></div>
        `).join('')}
      </div>
      <div class="history-actions">
        <div class="history-date">${palette.date}</div>
        <button class="load-palette" data-id="${palette.id}">Load</button>
        <button class="delete-palette" data-id="${palette.id}">Delete</button>
      </div>
    `;
    paletteElement.querySelector('.load-palette').addEventListener('click', (e) => {
      e.stopPropagation();
      loadPalette(palette.id);
    });
    paletteElement.querySelector('.delete-palette').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePalette(palette.id);
    });
    historyList.appendChild(paletteElement);
  });

  document.getElementById('backButton').addEventListener('click', showMainView);
}

function showMainView() {
  const content = document.querySelector('.content');
  content.innerHTML = `
    <h1>Chroma Palette 🎨</h1>
    <p class="instruction-text">Click on any color to copy its HEX code.</p>
    <div id="palette">
      <p class="initial-text">
        Click the <b>Extract Palette</b> button below to extract colors from
        the current page's visible area, use the <b>Color Picker</b> to select a specific color,
        or load & extract from history.
      </p>
    </div>
    <button id="analyzeButton">Extract Palette 🎨</button>
    <button id="colorPickerButton">Color Picker 🔍</button>
    <button id="exportButton">Export Palette 📤</button>
    <button id="historyButton">View History 📜</button>
    <button id="buyMeACoffeeButton">
      <a href="https://www.buymeacoffee.com/bymayanksingh" target="_blank">
        Buy me a Coffee ☕
      </a>
    </button>
  `;

  // Reattach event listeners
  attachEventListeners();
}

function loadPalettes() {
  const storedPalettes = localStorage.getItem('palettes');
  if (storedPalettes) {
    extractedPalettes = JSON.parse(storedPalettes);
  }
}

// Call this function when the popup loads
document.addEventListener('DOMContentLoaded', () => {
  keepPopupOpen();
  loadPalettes();
  attachEventListeners();
});


function attachEventListeners() {
  const analyzeButton = document.getElementById('analyzeButton');
  if (analyzeButton) {
    analyzeButton.addEventListener('click', () => {
      startBubbleAnimation();
      getPageColors();
    });
  }

  const exportButton = document.getElementById('exportButton');
  if (exportButton) {
    exportButton.addEventListener('click', showExportOptions);
  }

  // Prevent the popup from closing when clicking outside of it
  window.addEventListener('blur', keepPopupOpen);

  const historyButton = document.getElementById('historyButton');
  if (historyButton) {
    historyButton.addEventListener('click', showHistoryView);
  }

  const colorPickerButton = document.getElementById('colorPickerButton');
  if (colorPickerButton) {
    colorPickerButton.addEventListener('click', activateColorPicker);
  }
}

function activateColorPicker() {
  captureVisibleTab().then((dataUrl) => {
    createColorPickerModal(dataUrl);
  });
}

function updateUIForActiveColorPicker() {
  const colorPickerButton = document.getElementById('colorPickerButton');
  if (colorPickerButton) {
    colorPickerButton.textContent = 'Picking Color...';
    colorPickerButton.disabled = true;
  }
  
  const palette = document.getElementById('palette');
  if (palette) {
    palette.innerHTML = '<p class="instruction-text">Click anywhere on the page to pick a color.</p>';
  }
}

function resetUIAfterColorPick() {
  const colorPickerButton = document.getElementById('colorPickerButton');
  if (colorPickerButton) {
    colorPickerButton.textContent = 'Color Picker 🔍';
    colorPickerButton.disabled = false;
  }
}

/**
 * Displays the extracted colors in the popup interface.
 * @param {Array} colors - Array of RGB color arrays.
 */
function displayColors(colors) {
  const palette = document.getElementById('palette');
  if (!palette) {
    console.error('Palette element not found');
    return;
  }

  palette.innerHTML = '';
  palette.classList.add('grid');

  colors.forEach((color) => {
    const colorBox = document.createElement('div');
    colorBox.className = 'color-box';
    colorBox.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

    const colorInfo = document.createElement('div');
    colorInfo.className = 'color-info';

    const hexText = document.createElement('div');
    const hexCode = rgbToHex(color[0], color[1], color[2]);
    hexText.textContent = hexCode;
    hexText.className = 'color-hex';

    const colorName = document.createElement('div');
    colorName.textContent = getColorName(color);
    colorName.className = 'color-name';

    colorInfo.appendChild(hexText);
    colorInfo.appendChild(colorName);
    colorBox.appendChild(colorInfo);
    colorBox.addEventListener('click', () =>
      copyToClipboard(hexCode, colorBox, colors)
    );
    palette.appendChild(colorBox);
  });

  // Show export button after colors are displayed
  const exportButton = document.getElementById('exportButton');
  if (exportButton) {
    exportButton.style.display = 'block';
  }
}

function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToCmyk(r, g, b) {
  let c, m, y, k;
  r = r / 255;
  g = g / 255;
  b = b / 255;

  k = Math.min(1 - r, 1 - g, 1 - b);
  c = (1 - r - k) / (1 - k) || 0;
  m = (1 - g - k) / (1 - k) || 0;
  y = (1 - b - k) / (1 - k) || 0;

  return [Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100)];
}

/**
 * Gets the name of the color closest to the given RGB values.
 * @param {Array} rgb - Array of RGB values [r, g, b].
 * @return {string} The name of the closest color.
 */
function getColorName(rgb) {
  const color = ntc.name(rgbToHex(rgb[0], rgb[1], rgb[2]));
  return color[1]; // Returns the color name
}

function closeExportOptions() {
  const exportOptions = document.getElementById('exportOptions');
  if (exportOptions) {
    exportOptions.remove();
  }
}


function showExportOptions() {
  const exportOptions = document.createElement('div');
  exportOptions.id = 'exportOptions';
  exportOptions.innerHTML = `
      <div class="export-header">
        <h3>Export</h3>
        <button id="closeExportOptions" class="close-button">&times;</button>
      </div>
      <button id="exportCSV">CSV</button>
      <button id="exportJSON">JSON</button>
      <button id="exportPNG">PNG</button>
      <button id="exportJPG">JPG</button>
    `;
  document.body.appendChild(exportOptions);

  document
    .getElementById('exportCSV')
    .addEventListener('click', () => exportPalette('csv'));
  document
    .getElementById('exportJSON')
    .addEventListener('click', () => exportPalette('json'));
  document
    .getElementById('exportPNG')
    .addEventListener('click', () => exportPalette('png'));
  document
    .getElementById('exportJPG')
    .addEventListener('click', () => exportPalette('jpg'));

  // Add event listener for the close button
  document
    .getElementById('closeExportOptions')
    .addEventListener('click', closeExportOptions);
}


function exportPalette(format) {
  const colors = Array.from(document.querySelectorAll('.color-box')).map(box => {
    const rgb = box.style.backgroundColor.match(/\d+/g).map(Number);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    const name = box.querySelector('.color-name').textContent;
    const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    const cmyk = rgbToCmyk(rgb[0], rgb[1], rgb[2]);
    return { rgb, hex, name, hsl, cmyk };
  });

  switch (format) {
    case 'csv':
      exportCSV(colors);
      break;
    case 'json':
      exportJSON(colors);
      break;
    case 'png':
    case 'jpg':
      exportImage(colors, format);
      break;
  }
}

function exportCSV(colors) {
  let csv = 'Name,Hex,R,G,B,H,S,L,C,M,Y,K\n';
  colors.forEach(color => {
    csv += `${color.name},${color.hex},${color.rgb.join(',')},${color.hsl.join(',')},${color.cmyk.join(',')}\n`;
  });
  downloadFile(csv, 'palette.csv', 'text/csv');
}


function exportJSON(colors) {
  const json = JSON.stringify(colors, null, 2);
  downloadFile(json, 'palette.json', 'application/json');
}

function exportImage(colors, format) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const boxSize = 100;
  const padding = 10;

  canvas.width = colors.length * (boxSize + padding) + padding;
  canvas.height = boxSize + 2 * padding;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  colors.forEach((color, index) => {
    const x = index * (boxSize + padding) + padding;
    const y = padding;

    ctx.fillStyle = color.hex;
    ctx.fillRect(x, y, boxSize, boxSize);

    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.fillText(color.hex, x + 5, y + boxSize - 25);
    ctx.fillText(color.name, x + 5, y + boxSize - 10);
  });

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palette.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, `image/${format}`);
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}