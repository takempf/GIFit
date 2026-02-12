import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const VIDEOS_DIR = path.resolve('landing/public/videos');

// Google-hosted sample videos (from the official Google HTML5 video samples)
// These are reliable, publicly accessible, and small
const VIDEOS = [
  {
    name: 'ocean.mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    label: 'Blazes'
  },
  {
    name: 'city.mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    label: 'Escapes'
  },
  {
    name: 'nature.mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    label: 'Joyrides'
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
