import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Generate small demo videos using ffmpeg with lavfi (built-in test patterns)
const VIDEOS_DIR = path.resolve('landing/public/videos');
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// Check if ffmpeg is available
try {
  execSync('ffmpeg -version', { stdio: 'pipe' });
  console.log('ffmpeg found!\n');
} catch {
  console.error('ffmpeg not found. Trying alternative approach...');
  process.exit(1);
}

const videos = [
  {
    name: 'ocean.mp4',
    label: 'Blue Gradient',
    // Generate a smooth blue gradient animation (simulates ocean)
    filter: 'color=c=0x1a5276:s=640x360:d=8,format=yuv420p[bg];' +
      'sine=frequency=0.5:sample_rate=30:duration=8[wave];' +
      '[bg]geq=r=\'clip(26+20*sin(2*PI*N/90+X/50),0,255)\':' +
      'g=\'clip(82+30*sin(2*PI*N/60+X/40),0,255)\':' +
      'b=\'clip(118+40*sin(2*PI*N/45+Y/30),0,255)\'[v]',
    args: '-filter_complex "color=c=0x1a5276:s=640x360:d=8:r=24,format=yuv420p,geq=r=\'clip(26+20*sin(2*PI*N/72+X/50)\\,0\\,255)\':g=\'clip(82+30*sin(2*PI*N/48+X/40)\\,0\\,255)\':b=\'clip(118+40*sin(2*PI*N/36+Y/30)\\,0\\,255)\'" -c:v libx264 -preset ultrafast -crf 28 -t 8 -y'
  },
  {
    name: 'city.mp4',
    label: 'Warm Gradient',
    // Generate a warm amber/orange gradient animation (simulates city lights)
    args: '-filter_complex "color=c=0x784212:s=640x360:d=8:r=24,format=yuv420p,geq=r=\'clip(120+60*sin(2*PI*N/60+X/30)\\,0\\,255)\':g=\'clip(66+40*sin(2*PI*N/90+Y/40)\\,0\\,255)\':b=\'clip(18+20*sin(2*PI*N/120+X/60)\\,0\\,255)\'" -c:v libx264 -preset ultrafast -crf 28 -t 8 -y'
  },
  {
    name: 'nature.mp4',
    label: 'Green Gradient',
    // Generate a green gradient animation (simulates nature)
    args: '-filter_complex "color=c=0x1e8449:s=640x360:d=8:r=24,format=yuv420p,geq=r=\'clip(30+25*sin(2*PI*N/90+Y/40)\\,0\\,255)\':g=\'clip(132+50*sin(2*PI*N/60+X/35)\\,0\\,255)\':b=\'clip(73+30*sin(2*PI*N/72+Y/45)\\,0\\,255)\'" -c:v libx264 -preset ultrafast -crf 28 -t 8 -y'
  }
];

for (const video of videos) {
  const outPath = path.join(VIDEOS_DIR, video.name);
  console.log(`Generating ${video.name} (${video.label})...`);
  
  try {
    const cmd = `ffmpeg ${video.args} "${outPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    
    const stats = fs.statSync(outPath);
    console.log(`  Done! ${(stats.size / 1024).toFixed(0)} KB\n`);
  } catch (err) {
    console.error(`  Failed: ${err.stderr?.toString().slice(-200) || err.message}\n`);
  }
}

console.log('Video generation complete!');
