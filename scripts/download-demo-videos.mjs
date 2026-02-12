import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const VIDEOS_DIR = path.resolve('landing/public/videos');

// Small CC0 videos from Pexels (direct download links for SD quality)
// These are all Creative Commons Zero (CC0) licensed
const VIDEOS = [
  {
    name: 'ocean.mp4',
    // Ocean waves - Pexels CC0
    url: 'https://videos.pexels.com/video-files/1093662/1093662-sd_640_360_30fps.mp4'
  },
  {
    name: 'city.mp4',
    // City traffic time lapse - Pexels CC0
    url: 'https://videos.pexels.com/video-files/1721294/1721294-sd_640_360_25fps.mp4'
  },
  {
    name: 'nature.mp4',
    // Nature forest - Pexels CC0
    url: 'https://videos.pexels.com/video-files/2491284/2491284-sd_640_360_24fps.mp4'
  }
];

async function downloadVideo(video) {
  const filePath = path.join(VIDEOS_DIR, video.name);

  if (fs.existsSync(filePath)) {
    console.log(`[skip] ${video.name} already exists`);
    return;
  }

  console.log(`[download] ${video.name} from ${video.url}`);

  const response = await fetch(video.url);

  if (!response.ok) {
    throw new Error(`Failed to download ${video.name}: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(filePath);
  await pipeline(response.body, fileStream);

  const stats = fs.statSync(filePath);
  console.log(`[done] ${video.name} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
}

async function main() {
  // Ensure directory exists
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });

  console.log(`Downloading demo videos to ${VIDEOS_DIR}...`);

  for (const video of VIDEOS) {
    try {
      await downloadVideo(video);
    } catch (error) {
      console.error(`Failed to download ${video.name}:`, error.message);
    }
  }

  console.log('Done!');
}

main();
