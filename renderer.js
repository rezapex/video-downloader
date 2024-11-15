const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('url-input');
  const downloadBtn = document.getElementById('download-btn');
  const transcriptBtn = document.getElementById('transcript-btn');
  const resetBtn = document.getElementById('reset-btn');
  const formatSelect = document.getElementById('format-select');
  const qualitySelect = document.getElementById('quality-select');
  const modeSwitch = document.getElementById('mode-switch');
  const container = document.querySelector('.container');
  const modeToggleSpan = document.querySelector('.mode-toggle span');

  // Create a status message element if it doesn't exist
  let statusMessage = document.getElementById('status-message');
  if (!statusMessage) {
    statusMessage = document.createElement('div');
    statusMessage.id = 'status-message';
    document.querySelector('.container').appendChild(statusMessage);
  }

  // Reset functionality
  function resetAll() {
    // Reset input fields
    urlInput.value = '';
    formatSelect.value = 'mp4';
    qualitySelect.value = 'auto';
    
    // Reset buttons
    transcriptBtn.textContent = 'Generate Transcript';
    
    // Clear status message
    statusMessage.textContent = '';
    statusMessage.style.color = '';
    
    // Reset transcript content
    transcriptContent = null;
  }

  resetBtn.addEventListener('click', resetAll);

  // Dark Mode Toggle
  modeSwitch.addEventListener('change', () => {
    if (modeSwitch.checked) {
      document.body.classList.add('dark-mode');
      modeToggleSpan.textContent = 'Dark Mode';
    } else {
      document.body.classList.remove('dark-mode');
      modeToggleSpan.textContent = 'Light Mode';
    }
  });

  // URL Validation Function
  function validateYouTubeURL(url) {
    // More permissive regex to match various YouTube URL formats
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(shorts\/|watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]+(\?.*)?$/;
    return youtubeRegex.test(url);
  }

  let transcriptContent = null;

  downloadBtn.addEventListener('click', async () => {
    const videoUrl = urlInput.value.trim();
    const format = formatSelect.value;
    const quality = qualitySelect.value;

    // Validate URL
    if (!videoUrl) {
      statusMessage.textContent = 'Please enter a YouTube URL';
      statusMessage.style.color = 'red';
      return;
    }

    if (!validateYouTubeURL(videoUrl)) {
      statusMessage.textContent = `Invalid YouTube URL: ${videoUrl}. Please check the URL and try again.`;
      statusMessage.style.color = 'red';
      return;
    }

    statusMessage.textContent = 'Downloading... Please wait';
    statusMessage.style.color = 'blue';

    try {
      // Send download request to main process with format and quality
      ipcRenderer.send('download-video', { 
        url: videoUrl, 
        format: format, 
        quality: quality 
      });
    } catch (error) {
      statusMessage.textContent = `Error initiating download: ${error.message}`;
      statusMessage.style.color = 'red';
      console.error('Download initiation error:', error);
    }
  });

  transcriptBtn.addEventListener('click', async () => {
    const videoUrl = urlInput.value.trim();

    // If transcript is already generated, copy to clipboard
    if (transcriptContent) {
      navigator.clipboard.writeText(transcriptContent)
        .then(() => {
          statusMessage.textContent = 'Transcript copied to clipboard';
          statusMessage.style.color = 'green';
        })
        .catch(err => {
          statusMessage.textContent = 'Failed to copy transcript';
          statusMessage.style.color = 'red';
          console.error('Clipboard copy error:', err);
        });
      return;
    }

    // Validate URL
    if (!videoUrl) {
      statusMessage.textContent = 'Please enter a YouTube URL';
      statusMessage.style.color = 'red';
      return;
    }

    if (!validateYouTubeURL(videoUrl)) {
      statusMessage.textContent = `Invalid YouTube URL: ${videoUrl}. Please check the URL and try again.`;
      statusMessage.style.color = 'red';
      return;
    }

    statusMessage.textContent = 'Generating Transcript... Please wait';
    statusMessage.style.color = 'blue';

    try {
      // Send transcript generation request to main process
      ipcRenderer.send('generate-transcript', videoUrl);
    } catch (error) {
      statusMessage.textContent = `Error generating transcript: ${error.message}`;
      statusMessage.style.color = 'red';
      console.error('Transcript generation error:', error);
    }
  });

  // Listen for download completion
  ipcRenderer.on('download-complete', (event, filePath) => {
    statusMessage.textContent = `Download complete! Saved to: ${filePath}`;
    statusMessage.style.color = 'green';
  });

  // Listen for download errors
  ipcRenderer.on('download-error', (event, errorMessage) => {
    statusMessage.textContent = `Download failed: ${errorMessage}`;
    statusMessage.style.color = 'red';
    console.error('Download error:', errorMessage);
  });

  // Listen for transcript generation completion
  ipcRenderer.on('transcript-complete', (event, content) => {
    transcriptContent = content;
    statusMessage.textContent = 'Transcript generated! Click "Generate Transcript" again to copy to clipboard';
    statusMessage.style.color = 'green';
    transcriptBtn.textContent = 'Copy Transcript';
  });

  // Listen for transcript generation errors
  ipcRenderer.on('transcript-error', (event, errorMessage) => {
    statusMessage.textContent = `Transcript generation failed: ${errorMessage}`;
    statusMessage.style.color = 'red';
    console.error('Transcript generation error:', errorMessage);
  });
});
