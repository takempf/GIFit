/**
 * Converts a total number of seconds into a variable-length timecode string.
 * Omits the hour segment if zero. Formats as H:MM:SS, M:SS, or potentially S
 * if less than a minute (though the requirement implies M:SS minimum).
 * Ensures the seconds segment and the first minute segment are always visible.
 * Handles potential floating point inputs by flooring the total seconds.
 * Clamps negative inputs to 0.
 *
 * Examples:
 * 3661 -> "1:01:01"
 * 114  -> "1:54"
 * 5    -> "0:05"
 * 0    -> "0:00"
 *
 * @param totalSeconds - The total number of seconds (can be float or negative).
 * @returns The timecode string, omitting zero-hour segment.
 */
export function secondsToTimecode(totalSeconds: number): string {
  // Ensure seconds are non-negative and handle potential floats
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  // Calculate hours, minutes, and remaining seconds
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  // Always format seconds to two digits
  const ss = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    // If hours exist, format minutes to two digits and include hours
    const mm = minutes.toString().padStart(2, '0');
    const hh = hours.toString(); // No padding needed for hours
    return `${hh}:${mm}:${ss}`;
  } else {
    // If no hours, show minutes (no padding) and seconds
    const mm = minutes.toString(); // No padding needed for minutes here
    return `${mm}:${ss}`;
  }
}
