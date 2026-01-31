/**
 * Converts seconds (float) to milliseconds (integer).
 * Rounds to the nearest integer to handle potential floating point drift.
 */
export function toMilliseconds(seconds: number): number {
  return Math.round(seconds * 1000);
}

/**
 * Converts milliseconds (integer) to seconds (float).
 */
export function toSeconds(milliseconds: number): number {
  return milliseconds / 1000;
}

/**
 * Snaps a time in milliseconds to the nearest frame based on fps.
 * Performed using integer math.
 */
export function snapToFrame(timeMs: number, fps: number): number {
  if (fps <= 0) return timeMs;
  const msPerFrame = 1000 / fps;
  const frameIndex = Math.round(timeMs / msPerFrame);
  return Math.round(frameIndex * msPerFrame);
}

/**
 * Formats milliseconds into a timecode string "M:SS" or "H:MM:SS".
 * Always shows at least one digit for minutes and two digits for seconds.
 *
 * Examples:
 * 65000 -> "1:05"
 * 5000  -> "0:05"
 * 3661000 -> "1:01:01"
 */
export function formatMilliseconds(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000); // Floor to match typical timecode display
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const ss = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const mm = minutes.toString().padStart(2, '0');
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/**
 * Calculates the start time of the last frame in a range.
 * Useful for previewing the "end" of a GIF, which is visually the last frame.
 */
export function calculateLastFramePreview(
  startMs: number,
  durationMs: number,
  framerate: number
): number {
  if (framerate <= 0) return startMs;
  // Calculate total frames
  const frameCount = Math.ceil((durationMs / 1000) * framerate);
  // Last frame is the one before the "end"
  const lastFrameRelativeIndex = Math.max(0, frameCount - 1);
  return startMs + (lastFrameRelativeIndex / framerate) * 1000;
}
