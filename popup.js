/**
 * This script handles the main functionality of the Chroma Palette 🎨  extension.
 * It manages color extraction, display, and user interactions.
 */


document.addEventListener('DOMContentLoaded', () => {
  const analyzeButton = document.getElementById('analyzeButton');
  analyzeButton.addEventListener('click', () => {
    startBubbleAnimation();
    getPageColors();
  });

  // Add event listener for the new export button
  const exportButton = document.getElementById('exportButton');
  exportButton.addEventListener('click', showExportOptions);

  const eyedropperButton = document.getElementById('eyedropperButton');
  eyedropperButton.addEventListener('click', activateEyedropper);
});
  
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
                  };
                  img.onerror = function () {
                      displayError("Failed to load image data");
                  };
                  img.src = dataUrl;
              }
          });
      });
  }


// Existing functions...

function activateEyedropper() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "activateEyedropper" });
    });
    window.close(); // Close the popup to allow interaction with the page
  }
  
  // Add this function to handle messages from the content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "colorPicked") {
      const color = request.color;
      displayColors([[color.r, color.g, color.b]]);
    }
  });
  
  /**
   * Displays the extracted colors in the popup interface.
   * @param {Array} colors - Array of RGB color arrays.
   */
  function displayColors(colors) {
    const palette = document.getElementById('palette');
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
    document.getElementById('exportButton').style.display = 'block';
  }
  
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
  
  
  /**
   * Displays the extracted colors in the popup interface.
   * @param {Array} colors - Array of RGB color arrays.
   */
  function displayColors(colors) {
    const palette = document.getElementById('palette');
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
    document.getElementById('exportButton').style.display = 'block';
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
      return { rgb, hex, name };
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
    let csv = 'Name,Hex,R,G,B\n';
    colors.forEach(color => {
      csv += `${color.name},${color.hex},${color.rgb.join(',')}\n`;
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
      ctx.fillText(color.hex, x + 5, y + boxSize - 5);
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