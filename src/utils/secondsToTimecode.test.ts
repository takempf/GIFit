import { describe, it, expect } from 'vitest';
import { secondsToTimecode } from './secondsToTimecode';

describe('secondsToTimecode', () => {
  it('should convert 0 seconds', () => {
    expect(secondsToTimecode(0)).toBe('0:00');
  });

  it('should convert seconds less than a minute', () => {
    expect(secondsToTimecode(5)).toBe('0:05');
    expect(secondsToTimecode(59)).toBe('0:59');
  });

  it('should convert seconds to minutes and seconds', () => {
    expect(secondsToTimecode(60)).toBe('1:00');
    expect(secondsToTimecode(61)).toBe('1:01');
    expect(secondsToTimecode(114)).toBe('1:54');
    expect(secondsToTimecode(599)).toBe('9:59'); // Less than 10 minutes
    expect(secondsToTimecode(600)).toBe('10:00'); // Exactly 10 minutes
    expect(secondsToTimecode(601)).toBe('10:01');
  });

  it('should convert seconds to hours, minutes, and seconds', () => {
    expect(secondsToTimecode(3600)).toBe('1:00:00');
    expect(secondsToTimecode(3661)).toBe('1:01:01');
    expect(secondsToTimecode(3600 + 59 * 60 + 59)).toBe('1:59:59'); // 1h 59m 59s
    expect(secondsToTimecode(7200)).toBe('2:00:00');
    expect(secondsToTimecode(3600 * 10 + 12 * 60 + 34)).toBe('10:12:34');
  });

  it('should handle floating point seconds by flooring', () => {
    expect(secondsToTimecode(5.9)).toBe('0:05');
    expect(secondsToTimecode(61.001)).toBe('1:01');
    expect(secondsToTimecode(61.999)).toBe('1:01');
    expect(secondsToTimecode(3661.5)).toBe('1:01:01');
  });

  it('should handle negative numbers by clamping to 0', () => {
    expect(secondsToTimecode(-1)).toBe('0:00');
    expect(secondsToTimecode(-60)).toBe('0:00');
    expect(secondsToTimecode(-0.001)).toBe('0:00');
  });

  it('should ensure minutes are padded in HH:MM:SS format but not in M:SS', () => {
    expect(secondsToTimecode(3605)).toBe('1:00:05'); // 1h 0m 5s
    expect(secondsToTimecode(5)).toBe('0:05');       // 0h 0m 5s
    expect(secondsToTimecode(65)).toBe('1:05');       // 0h 1m 5s
  });
});
