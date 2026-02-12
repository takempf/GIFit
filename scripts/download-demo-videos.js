import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const VIDEOS_DIR = path.resolve('landing/public/videos');

// Using Pixabay CDN - all videos are public domain (Pixabay License)
const VIDEOS = [
  {
    name: 'ocean.mp4',
    url: 'https://cdn.pixabay.com/video/2020/07/30/45684-446787644_tiny.mp4',
    label: 'Ocean Waves'
  },
  {
    name: 'city.mp4',
    url: 'https://cdn.pixabay.com/video/2016/09/12/5104-183787916_tiny.mp4',
    label: 'City Timelapse'
  },
  {
    name: 'nature.mp4',
    url: 'https://cdn.pixabay.com/video/2019/07/09/25060-347740808_tiny.mp4',
    label: 'Nature'
  }
];

async function downloadVideo(video) {
  const filePath = path.join(VIDEOS_DIR, video.name);

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 10000) {
      console.log(`Skipping ${video.name} - already exists (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
      return true;
    }
    fs.unlinkSync(filePath);
  }

  console.log(`Downloading ${video.name} (${video.label}) from ${video.url}...`);

  try {
    const response = await fetch(video.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': '*/*',
      }
    });

    if (!response.ok) {
      console.error(`Failed to download ${video.name}: ${response.status} ${response.statusText}`);
      return false;
    }

    const fileStream = fs.createWriteStream(filePath);
    await pipeline(response.body, fileStream);

    const stats = fs.statSync(filePath);
    console.log(`Done! ${video.name} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
    return true;
  } catch (err) {
    console.error(`Error downloading ${video.name}: ${err.message}`);
    return false;
  }
}

async function main() {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });

  console.log(`Downloading demo videos to ${VIDEOS_DIR}...\n`);

  let success = 0;
  for (const video of VIDEOS) {
    const ok = await downloadVideo(video);
    if (ok) success++;
  }

  console.log(`\nDownloaded ${success}/${VIDEOS.length} videos.`);
}

main();
