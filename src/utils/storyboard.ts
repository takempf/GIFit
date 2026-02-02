/**
 * Utilities for parsing YouTube storyboard specs and calculating image frames.
 */

export interface StoryboardLevel {
  width: number;
  height: number;
  count: number;
  cols: number;
  rows: number;
  interval: number;
  name: string;
  signature: string;
}

/**
 * Parses a single level string from the storyboard spec.
 * Format: "Width#Height#Count#Cols#Rows#Interval#Name#Signature"
 */
export function parseLevel(levelStr: string): StoryboardLevel | null {
  const parts = levelStr.split('#');
  if (parts.length < 8) return null;

  return {
    width: parseInt(parts[0], 10),
    height: parseInt(parts[1], 10),
    count: parseInt(parts[2], 10),
    cols: parseInt(parts[3], 10),
    rows: parseInt(parts[4], 10),
    interval: parseInt(parts[5], 10), // ms
    name: parts[6],
    signature: parts[7]
  };
}

/**
 * Parses the full pipe-separated storyboard spec string.
 * Format: "URL_TEMPLATE|LEVEL_1|LEVEL_2|..."
 */
export function parseStoryboardSpec(spec: string) {
  const parts = spec.split('|');
  if (parts.length < 2) return null;

  const baseUrl = parts.shift();
  // The last level is typically the highest quality
  const levels = parts
    .map(parseLevel)
    .filter((l): l is StoryboardLevel => l !== null);

  if (!baseUrl || levels.length === 0) return null;

  console.log('Parsed Storyboard Spec:', { baseUrl, levels: levels[0] }); // Log first level

  return {
    baseUrl,
    levels
  };
}

/**
 * Calculates the URL and coordinates for a specific time in the storyboard.
 * Prefers the highest quality level available.
 */
export function getStoryboardFrame(
  spec: { baseUrl: string; levels: StoryboardLevel[] },
  timeMs: number
) {
  // Use the last level (highest quality usually)
  const levelIndex = spec.levels.length - 1;
  const level = spec.levels[levelIndex];

  // Calculate which image index contains the frame
  const frameIndex = Math.floor(timeMs / level.interval);
  if (frameIndex >= level.count) return null;

  // Calculate the sheet index (M0, M1, M2...)
  const imagesPerSheet = level.cols * level.rows;
  const sheetIndex = Math.floor(frameIndex / imagesPerSheet);

  // Calculate position within the sheet
  const indexInSheet = frameIndex % imagesPerSheet;
  const col = indexInSheet % level.cols;
  const row = Math.floor(indexInSheet / level.cols);

  // Construct URL
  // $L = level index (0, 1, 2, etc.)
  // $N = sheet file (M0, M1, M2, etc.)
  // Using single pass replacement to avoid issues with special characters
  const constructedUrl = spec.baseUrl.replace(/(\$L|\$N)/g, (match) => {
    if (match === '$L') return String(levelIndex);
    if (match === '$N') return `M${sheetIndex}`;
    return match;
  });

  const separator = constructedUrl.includes('?') ? '&' : '?';
  const url = `${constructedUrl}${separator}sigh=${encodeURIComponent(level.signature)}`;

  return {
    url,
    levelName: level.name,
    x: col * level.width,
    y: row * level.height,
    width: level.width,
    height: level.height,
    sheetWidth: level.width * level.cols,
    sheetHeight: level.height * level.rows
  };
}
