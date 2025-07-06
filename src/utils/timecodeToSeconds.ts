export function timecodeToSeconds(timeString: string): number {
  // Multipliers for seconds, minutes, hours
  const multipliers = [1, 60, 3600];
  const totalSeconds = timeString
    .split(':') // Split into segments (e.g., ['HH', 'MM', 'SS'])
    .reverse() // Reverse to process seconds first (e.g., ['SS', 'MM', 'HH'])
    .reduce((accumulator: number, segment: string, index: number): number => {
      // Ensure we only process seconds, minutes, and hours
      if (index >= multipliers.length) {
        return accumulator; // Ignore segments beyond hours
      }

      // Parse segment to a number, default to 0 if invalid
      const value = parseFloat(segment) || 0;

      // Add the segment's value in seconds to the accumulator
      return accumulator + value * multipliers[index];
    }, 0); // Start accumulation from 0 seconds

  return totalSeconds;
}
