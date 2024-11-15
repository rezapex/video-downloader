// Download Configuration for Web Application
export const DOWNLOAD_FORMATS = ['mp4', 'mp3'];

export const DOWNLOAD_QUALITIES = [
  '144', '240', '360', '480', 
  '720', '1080', '1440', '2160'
];

export function getDownloadOptions(format, quality, url) {
  // Simplified download configuration for web use
  return {
    format: format,
    quality: quality,
    url: url,
    headers: {
      'referer': 'youtube.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  };
}

export function getConversionOptions() {
  return {
    videoCodec: 'libx264',
    videoCRF: '23',
    audioCodec: 'aac',
    audioBitrate: '128k'
  };
}
