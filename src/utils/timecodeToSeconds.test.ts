import { describe, it, expect } from 'vitest';
import { timecodeToSeconds } from './timecodeToSeconds';

describe('timecodeToSeconds', () => {
  it('should convert valid SS format', () => {
    expect(timecodeToSeconds('05')).toBe(5);
    expect(timecodeToSeconds('5')).toBe(5);
    expect(timecodeToSeconds('00')).toBe(0);
    expect(timecodeToSeconds('59')).toBe(59);
  });

  it('should convert valid MM:SS format', () => {
    expect(timecodeToSeconds('01:05')).toBe(65);
    expect(timecodeToSeconds('1:05')).toBe(65);
    expect(timecodeToSeconds('00:00')).toBe(0);
    expect(timecodeToSeconds('10:00')).toBe(600);
    expect(timecodeToSeconds('09:59')).toBe(599);
    expect(timecodeToSeconds('59:59')).toBe(3599);
  });

  it('should convert valid HH:MM:SS format', () => {
    expect(timecodeToSeconds('01:01:05')).toBe(3665);
    expect(timecodeToSeconds('1:1:5')).toBe(3665);
    expect(timecodeToSeconds('00:00:00')).toBe(0);
    expect(timecodeToSeconds('10:00:00')).toBe(36000);
    expect(timecodeToSeconds('01:59:59')).toBe(7199);
  });

  it('should handle floating point seconds in the last segment', () => {
    expect(timecodeToSeconds('05.5')).toBe(5.5);
    expect(timecodeToSeconds('01:05.25')).toBe(65.25);
    expect(timecodeToSeconds('01:01:05.75')).toBe(3665.75);
    expect(timecodeToSeconds('0:0.5')).toBe(0.5);
  });

  it('should handle partial timecodes (interpreting from right to left)', () => {
    // The function processes segments from right to left (SS, then MM, then HH)
    expect(timecodeToSeconds('30')).toBe(30); // Interpreted as 30 seconds
    expect(timecodeToSeconds('10:30')).toBe(10 * 60 + 30); // 10 minutes, 30 seconds
    expect(timecodeToSeconds('01:10:30')).toBe(1 * 3600 + 10 * 60 + 30); // 1 hour, 10 minutes, 30 seconds
  });

  it('should return 0 for empty or completely invalid string', () => {
    expect(timecodeToSeconds('')).toBe(0);
    expect(timecodeToSeconds('abc')).toBe(0); // parseFloat('abc') is NaN, || 0 results in 0
    expect(timecodeToSeconds(':')).toBe(0); // split results in ['', ''], parseFloat('') is NaN
  });

  it('should handle invalid segments by treating them as 0', () => {
    // '01' is hours, 'aa' (0) is minutes, '05' is seconds
    expect(timecodeToSeconds('01:aa:05')).toBe(1 * 3600 + 0 * 60 + 5);
    expect(timecodeToSeconds('bb:10:05')).toBe(0 * 3600 + 10 * 60 + 5); // 'bb' becomes 0
    expect(timecodeToSeconds('01:10:cc')).toBe(1 * 3600 + 10 * 60 + 0); // 'cc' becomes 0
    expect(timecodeToSeconds('xx:yy:zz')).toBe(0);
  });

  it('should handle more than 3 segments by ignoring leftmost ones', () => {
    expect(timecodeToSeconds('04:01:01:05')).toBe(1 * 3600 + 1 * 60 + 5); // Ignores '04'
    expect(timecodeToSeconds('junk:01:01:05')).toBe(3665); // 'junk' ignored
  });

  it('should handle timecodes with large numbers in segments correctly based on their position', () => {
    expect(timecodeToSeconds('70')).toBe(70); // 70 seconds
    expect(timecodeToSeconds('01:70')).toBe(1 * 60 + 70); // 1 minute, 70 seconds = 130 seconds
    expect(timecodeToSeconds('01:01:70')).toBe(1 * 3600 + 1 * 60 + 70); // 1 hour, 1 minute, 70 seconds = 3730 seconds
  });

  it('should handle timecodes with leading/trailing spaces in segments if parseFloat handles them', () => {
    // parseFloat handles leading/trailing spaces
    expect(timecodeToSeconds(' 01:01:05 ')).toBe(3665);
    expect(timecodeToSeconds('01 : 01 : 05')).toBe(3665);
  });
});
