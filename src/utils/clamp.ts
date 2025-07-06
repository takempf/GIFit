export function clamp(minimum: number, maximum: number, value: number): number {
  if (minimum > maximum) {
    throw new Error('Minimum value cannot be greater than maximum value.');
  }

  return Math.min(maximum, Math.max(minimum, value));
}
