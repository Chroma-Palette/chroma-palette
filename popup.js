document.addEventListener('DOMContentLoaded', () => {
    const palette = document.getElementById('palette');
    const analyzeButton = document.getElementById('analyzeButton');

    analyzeButton.addEventListener('click', getPageColors);
});

function getPageColors() {
    const palette = document.getElementById('palette');
    palette.innerHTML = '<p class="initial-text">Extracting colors...</p>';
    palette.classList.remove('grid');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, function (dataUrl) {
            if (chrome.runtime.lastError) {
                palette.innerHTML = `<p class="initial-text">Error: ${chrome.runtime.lastError.message}</p>`;
            } else {
                analyzeColors(dataUrl);
            }
        });
    });
}

function analyzeColors(dataUrl) {
    const img = new Image();
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = getPalette(imageData.data, 6);
        displayColors(colors);
    };
    img.onerror = function () {
        document.getElementById('palette').innerHTML = '<p class="initial-text">Error: Failed to load image data</p>';
    };
    img.src = dataUrl;
}

function getPalette(pixels, colorCount) {
    const colorMap = {};
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const rgb = `${r},${g},${b}`;
        colorMap[rgb] = (colorMap[rgb] || 0) + 1;
    }
    return Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount)
        .map(([color]) => color.split(',').map(Number));
}

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

        const rgbText = document.createElement('div');
        rgbText.textContent = `RGB(${color[0]}, ${color[1]}, ${color[2]})`;
        rgbText.className = 'color-rgb';

        const copyFeedback = document.createElement('div');
        copyFeedback.className = 'copy-feedback';
        copyFeedback.textContent = 'Copied!';

        colorInfo.appendChild(hexText);
        colorInfo.appendChild(rgbText);
        colorBox.appendChild(colorInfo);
        colorBox.appendChild(copyFeedback);
        colorBox.addEventListener('click', (event) => {
            event.stopPropagation();
            copyToClipboard(hexCode, colorBox);
        });
        palette.appendChild(colorBox);
    });
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function copyToClipboard(text, colorBox) {
    navigator.clipboard.writeText(text).then(() => {
        const feedbackElement = colorBox.querySelector('.copy-feedback');
        feedbackElement.style.opacity = '1';
        setTimeout(() => {
            feedbackElement.style.opacity = '0';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}