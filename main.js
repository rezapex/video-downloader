const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const { spawn, execSync } = require('child_process');
const { YoutubeTranscript } = require('youtube-transcript');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Check if yt-dlp is installed
function isYtDlpInstalled() {
  try {
    execSync('yt-dlp --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Validate YouTube URL
function isValidYouTubeURL(url) {
  try {
    // More permissive regex to match various YouTube URL formats
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(shorts\/|watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]+(\?.*)?$/;
    const match = youtubeRegex.test(url);
    
    console.log('URL Validation:', {
      url: url,
      isValid: match
    });

    return match;
  } catch (error) {
    console.error('URL Validation Error:', error);
    return false;
  }
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&]+)/);
  return match ? match[1] : null;
}

// Decode HTML entities
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&nbsp;': ' '
  };
  
  // First replace &amp; to handle double-encoded entities
  text = text.replace(/&amp;/g, '&');
  
  // Replace all other entities
  return text.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      // Handle numeric entities
      const code = entity[1].toLowerCase() === 'x' ?
        parseInt(entity.slice(2), 16) :
        parseInt(entity.slice(1), 10);
      return String.fromCharCode(code);
    } else {
      // Handle named entities
      return entities[match] || match;
    }
  });
}

// Video download handler
ipcMain.on('download-video', async (event, downloadOptions) => {
  const { url: videoUrl, format, quality } = downloadOptions;

  console.log('Download Request:', { videoUrl, format, quality });

  // Check if yt-dlp is installed
  if (!isYtDlpInstalled()) {
    console.error('yt-dlp is not installed');
    event.reply('download-error', 'yt-dlp is not installed. Please install it using "pip install yt-dlp" or "brew install yt-dlp".');
    return;
  }

  try {
    // Validate URL
    if (!isValidYouTubeURL(videoUrl)) {
      console.error('Invalid YouTube URL:', videoUrl);
      event.reply('download-error', `Invalid YouTube URL: ${videoUrl}`);
      return;
    }

    // Additional validation using ytdl-core
    let info;
    try {
      info = await ytdl.getInfo(videoUrl);
    } catch (infoError) {
      console.error('Video Info Error:', infoError);
      event.reply('download-error', `Could not fetch video info: ${infoError.message}`);
      return;
    }

    const videoTitle = info.videoDetails.title
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50); // Limit filename length

    // Choose download directory
    const downloadDir = app.getPath('downloads');
    const finalDownloadPath = path.join(downloadDir, `${videoTitle}.${format}`);

    // Use yt-dlp for downloading with more flexible format selection
    const ytDlpArgs = [
      videoUrl,
      '-f', 'best', // Use best available format
      '-o', finalDownloadPath
    ];

    // Add quality filter if specified
    if (quality !== 'auto') {
      ytDlpArgs[1] = `best[height<=${quality}]`;
    }

    console.log('yt-dlp Arguments:', ytDlpArgs);

    const ytDlpProcess = spawn('yt-dlp', ytDlpArgs);

    ytDlpProcess.on('close', (code) => {
      console.log('Download Process Closed:', { code });
      if (code === 0) {
        event.reply('download-complete', finalDownloadPath);
      } else {
        event.reply('download-error', `Download failed. The video might not be available in the selected quality.`);
      }
    });

    ytDlpProcess.on('error', (err) => {
      console.error('yt-dlp spawn error:', err);
      event.reply('download-error', `Failed to start download: ${err.message}`);
    });

    ytDlpProcess.stderr.on('data', (data) => {
      console.error(`yt-dlp error: ${data}`);
    });

  } catch (error) {
    console.error('Download error:', error);
    event.reply('download-error', error.message || 'Unknown download error');
  }
});

// Transcript generation handler
ipcMain.on('generate-transcript', async (event, videoUrl) => {
  console.log('Transcript Request:', { videoUrl });

  try {
    // Validate URL
    if (!isValidYouTubeURL(videoUrl)) {
      console.error('Invalid YouTube URL:', videoUrl);
      event.reply('transcript-error', `Invalid YouTube URL: ${videoUrl}`);
      return;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      event.reply('transcript-error', 'Could not extract video ID from URL');
      return;
    }

    try {
      // Get transcript using youtube-transcript package
      const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Convert transcript array to clean text and decode HTML entities
      const plainText = transcriptArray
        .map(item => decodeHtmlEntities(item.text.trim()))
        .filter(text => text) // Remove empty strings
        .join(' ');

      if (plainText) {
        event.reply('transcript-complete', plainText);
      } else {
        event.reply('transcript-error', 'No transcript content found');
      }
    } catch (transcriptError) {
      console.error('Transcript fetch error:', transcriptError);
      event.reply('transcript-error', 'No transcript available for this video');
    }

  } catch (error) {
    console.error('Transcript generation error:', error);
    event.reply('transcript-error', `Failed to generate transcript: ${error.message}`);
  }
});
