const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = 'block';
      
      window.opener.postMessage({ 
        type: 'imageUploaded', 
        file: file,
        imageData: e.target.result
      }, '*');
    };
    reader.readAsDataURL(file);
  }
  window.close();
});