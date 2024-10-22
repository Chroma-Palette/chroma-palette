const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    window.opener.postMessage({ type: 'paletteImported', file: file }, '*');
    window.close();
  }
});