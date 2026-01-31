/**
 * Calculates the start and end time of the frame at the given timestamp.
 *
 * @param timeSeconds The time in seconds
 * @param fps The framerate
 * @returns [frameStartTime, frameEndTime] in seconds
 */
export function getFrameTimeBounds(
  timeSeconds: number,
  fps: number
): [number, number] {
  if (fps <= 0) return [timeSeconds, timeSeconds];

  const timeMs = timeSeconds * 1000;
  const frameDurMs = 1000 / fps;

  // Use a small epsilon to handle floating point inaccuracies
  // If we are extremely close to a frame boundary, we want to be consistent.
  // Using integer math (ms) helps reducing float issues.

  const frameIndex = Math.floor((timeMs + 0.1) / frameDurMs);

  const startMs = frameIndex * frameDurMs;
  const endMs = (frameIndex + 1) * frameDurMs;

  return [startMs / 1000, endMs / 1000];
}
