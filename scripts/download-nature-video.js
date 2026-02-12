import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const VIDEOS_DIR = path.resolve('landing/public/videos');
const filePath = path.join(VIDEOS_DIR, 'nature.mp4');

// Alternative nature video - Pexels CC0 (waterfall/forest scene)
const url = 'https://videos.pexels.com/video-files/857251/857251-sd_640_360_25fps.mp4';

async function main() {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });

  // Remove failed file if exists
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  console.log(`Downloading nature.mp4 from ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(filePath);
  await pipeline(response.body, fileStream);

  const stats = fs.statSync(filePath);
  console.log(`Done! nature.mp4 (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
}

main();
