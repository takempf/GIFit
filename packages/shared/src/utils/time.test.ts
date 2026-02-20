import { describe, it, expect } from 'vitest';
import {
  toMilliseconds,
  toSeconds,
  snapToFrame,
  formatMilliseconds
} from './time';

describe('time utils', () => {
  describe('toMilliseconds', () => {
    it('converts seconds to milliseconds', () => {
      expect(toMilliseconds(1)).toBe(1000);
      expect(toMilliseconds(1.5)).toBe(1500);
      expect(toMilliseconds(0)).toBe(0);
    });

    it('rounds correctly to handle floating point drift', () => {
      // 1.0000000001 -> 1000
      expect(toMilliseconds(1.0000000001)).toBe(1000);
      // 0.9999999999 -> 1000
      expect(toMilliseconds(0.9999999999)).toBe(1000);
    });
  });

  describe('toSeconds', () => {
    it('converts milliseconds to seconds', () => {
      expect(toSeconds(1000)).toBe(1);
      expect(toSeconds(1500)).toBe(1.5);
      expect(toSeconds(0)).toBe(0);
    });
  });

  describe('snapToFrame', () => {
    it('snaps to the nearest frame at 10fps (100ms per frame)', () => {
      // Exact frame
      expect(snapToFrame(100, 10)).toBe(100);

      // Close to 100 -> 100
      expect(snapToFrame(90, 10)).toBe(100);
      expect(snapToFrame(110, 10)).toBe(100);
      expect(snapToFrame(149, 10)).toBe(100);

      // Close to 200 -> 200
      expect(snapToFrame(151, 10)).toBe(200);
    });

    it('snaps to the nearest frame at 30fps (~33.33ms per frame)', () => {
      // 1 frame = 33.333...
      // 2 frames = 66.666...
      // 3 frames = 100

      // 33 -> 33
      expect(snapToFrame(33, 30)).toBe(33);
      // 34 -> 33 (closer to 33.33)
      expect(snapToFrame(34, 30)).toBe(33);

      // 50 is middle of 33.33 and 66.66 -> 16.6 away from both.
      // 50 / 33.33 = 1.5 -> rounds to 2 -> 67
      expect(snapToFrame(50, 30)).toBe(67);

      expect(snapToFrame(100, 30)).toBe(100);
    });
  });

  describe('formatMilliseconds', () => {
    it('formats times without hours', () => {
      expect(formatMilliseconds(0)).toBe('0:00');
      expect(formatMilliseconds(5000)).toBe('0:05');
      expect(formatMilliseconds(65000)).toBe('1:05'); // 1m 5s
      expect(formatMilliseconds(59000)).toBe('0:59');
    });

    it('formats times with hours', () => {
      expect(formatMilliseconds(3600000)).toBe('1:00:00');
      expect(formatMilliseconds(3661000)).toBe('1:01:01');
    });

    it('floors seconds', () => {
      // 1500ms -> 1s -> 0:01
      expect(formatMilliseconds(1500)).toBe('0:01');
      expect(formatMilliseconds(1999)).toBe('0:01');
    });
  });
});
