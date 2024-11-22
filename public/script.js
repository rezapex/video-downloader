document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('url-input');
  const formatSelect = document.getElementById('format-select');
  const qualitySelect = document.getElementById('quality-select');
  const downloadBtn = document.getElementById('download-btn');
  const transcriptBtn = document.getElementById('transcript-btn');
  const resetBtn = document.getElementById('reset-btn');
  const statusMessage = document.getElementById('status-message');
  const modeSwitch = document.getElementById('mode-switch');
  const container = document.querySelector('.container');
  const modeToggleSpan = document.querySelector('.mode-toggle span');

  // Validate YouTube URL input
  function validateYouTubeURL(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(shorts\/|watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]+(\?.*)?$/;
    return youtubeRegex.test(url);
  }

  // Send requests to the server for downloading videos and generating transcripts
  async function sendRequest(endpoint, data) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  }

  // Display status messages based on server responses
  function displayStatusMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'red' : 'green';
  }

  // Handle download button click
  downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const format = formatSelect.value;
    const quality = qualitySelect.value;

    if (!validateYouTubeURL(url)) {
      displayStatusMessage('Invalid YouTube URL', true);
      return;
    }

    displayStatusMessage('Downloading... Please wait');

    try {
      const response = await sendRequest('/download', { url, format, quality });
      displayStatusMessage(`Download complete! File saved as ${response.filename}`);
    } catch (error) {
      displayStatusMessage(`Download failed: ${error.message}`, true);
    }
  });

  // Handle transcript button click
  transcriptBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();

    if (!validateYouTubeURL(url)) {
      displayStatusMessage('Invalid YouTube URL', true);
      return;
    }

    displayStatusMessage('Generating transcript... Please wait');

    try {
      const response = await sendRequest('/transcript', { url });
      displayStatusMessage('Transcript generated! Click to copy to clipboard');
      transcriptBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(response.transcript);
        displayStatusMessage('Transcript copied to clipboard');
      });
    } catch (error) {
      displayStatusMessage(`Transcript generation failed: ${error.message}`, true);
    }
  });

  // Handle reset button click
  resetBtn.addEventListener('click', () => {
    urlInput.value = '';
    formatSelect.value = 'mp4';
    qualitySelect.value = 'auto';
    statusMessage.textContent = '';
  });

  // Handle dark mode toggle
  modeSwitch.addEventListener('change', () => {
    if (modeSwitch.checked) {
      document.body.classList.add('dark-mode');
      modeToggleSpan.textContent = 'Dark Mode';
    } else {
      document.body.classList.remove('dark-mode');
      modeToggleSpan.textContent = 'Light Mode';
    }
  });
});
