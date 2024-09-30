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
        chrome.runtime.sendMessage({ action: "captureTab" }, response => {
            if (response && response.dataUrl) {
                getColors(response.dataUrl)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject('Failed to capture tab');
            }
        });
    });
}

// This line is necessary for the script to be executable
captureColors().then(colors => colors).catch(error => ({ error: error.toString() }));
