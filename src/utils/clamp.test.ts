import { describe, it, expect } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  it('should return the value if it is within the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('should return the min value if the value is less than the min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('should return the max value if the value is greater than the max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('should work with negative ranges', () => {
    expect(clamp(-15, -10, -5)).toBe(-10);
    expect(clamp(-7, -10, -5)).toBe(-7);
    expect(clamp(0, -10, -5)).toBe(-5); // This should be -5 if value > max
    expect(clamp(-2, -10, -5)).toBe(-5); // Test value greater than max
    expect(clamp(-12, -10, -5)).toBe(-10); // Test value less than min
  });

  it('should handle min and max being equal', () => {
    expect(clamp(5, 5, 5)).toBe(5);
    expect(clamp(0, 5, 5)).toBe(5);
    expect(clamp(10, 5, 5)).toBe(5);
  });

  it('should handle floating point numbers correctly', () => {
    expect(clamp(3.14, 0.0, 5.0)).toBe(3.14);
    expect(clamp(-1.0, 0.0, 5.0)).toBe(0.0);
    expect(clamp(6.0, 0.0, 5.0)).toBe(5.0);
  });

  it('should handle cases where min > max (should logically still clamp to min or max based on implementation)', () => {
    // Math.max(10, Math.min(5, 0)) -> Math.max(10, 0) -> 10. This means it effectively uses the "min" as the floor.
    expect(clamp(5, 10, 0)).toBe(10); // value < max (0), but min (10) is greater, so Math.max(10, Math.min(5,0)) = Math.max(10,0) = 10
    expect(clamp(15, 10, 0)).toBe(10); // value > min (10) and > max (0), Math.max(10, Math.min(15,0)) = Math.max(10,0) = 10
    expect(clamp(-5, 10, 0)).toBe(10); // value < max (0) and < min (10), Math.max(10, Math.min(-5,0)) = Math.max(10,-5) = 10
  });
});
