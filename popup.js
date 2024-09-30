/**
 * This script handles the main functionality of the Chromatic extension.
 * It manages color extraction, display, and user interactions.
 */

/**
 * Initializes the extension's popup interface.
 * Sets up event listeners for the analyze button.
 */
document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyzeButton');
    analyzeButton.addEventListener('click', getPageColors);
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

/**
 * Displays the extracted colors in the popup interface.
 * @param {Array} colors - Array of RGB color arrays.
 */
function displayColors(colors) {
    const palette = document.getElementById('palette');
    palette.innerHTML = '';
    palette.classList.add('grid');
    colors.forEach(color => {
        const colorBox = document.createElement('div');
        colorBox.className = 'color-box';
        colorBox.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

        const colorInfo = document.createElement('div');
        colorInfo.className = 'color-info';

        const hexText = document.createElement('div');
        const hexCode = rgbToHex(color[0], color[1], color[2]);
        hexText.textContent = hexCode;
        hexText.className = 'color-hex';

        colorInfo.appendChild(hexText);
        colorBox.appendChild(colorInfo);
        colorBox.addEventListener('click', () => copyToClipboard(hexCode, colorBox));
        palette.appendChild(colorBox);
    });
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
function copyToClipboard(text, colorBox) {
    navigator.clipboard.writeText(text).then(() => {
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'copy-feedback';
        feedbackElement.textContent = 'Copied!';
        colorBox.appendChild(feedbackElement);
        setTimeout(() => colorBox.removeChild(feedbackElement), 1500);
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