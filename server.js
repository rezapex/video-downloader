const express = require('express');
const ytdl = require('ytdl-core');
const path = require('path');
const { getDownloadOptions } = require('./constants/download-config');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/download', async (req, res) => {
  const { url, format, quality } = req.body;

  if (!url || !format || !quality) {
    return res.status(400).send('Missing required parameters');
  }

  try {
    const downloadOptions = getDownloadOptions(format, quality, url);
    const videoStream = ytdl(url, downloadOptions);

    res.setHeader('Content-Disposition', `attachment; filename="video.${format}"`);
    videoStream.pipe(res);
  } catch (error) {
    consol a    1e.error('Error downloading video:', error);
    res.status(500).send('Error downloading video');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
