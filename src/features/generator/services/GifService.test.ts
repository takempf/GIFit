import { describe, it, expect } from 'vitest';
import { areFramesEqual } from './GifService';

// Polyfill ImageData for JSDOM
class ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace = 'srgb';

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}
global.ImageData = ImageData as any;

describe('areFramesEqual', () => {
  const width = 2;
  const height = 2;

  const createRedFrame = () => {
    const data = new Uint8ClampedArray([
      255,
      0,
      0,
      255, // Red
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255
    ]);
    return new ImageData(data, width, height);
  };

  const createBlueFrame = () => {
    const data = new Uint8ClampedArray([
      0,
      0,
      255,
      255, // Blue
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255
    ]);
    return new ImageData(data, width, height);
  };

  const createSlightlyDifferentRedFrame = (diff: number) => {
    const data = new Uint8ClampedArray([
      255 - diff,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255
    ]);
    return new ImageData(data, width, height);
  };

  it('should return true for identical frames', () => {
    const frame1 = createRedFrame();
    const frame2 = createRedFrame();
    expect(areFramesEqual(frame1, frame2)).toBe(true);
  });

  it('should return false for completely different frames', () => {
    const frame1 = createRedFrame();
    const frame2 = createBlueFrame();
    expect(areFramesEqual(frame1, frame2)).toBe(false);
  });

  it('should return true for frames with differences within threshold', () => {
    const frame1 = createRedFrame();
    const frame2 = createSlightlyDifferentRedFrame(5); // Diff 5
    // MSE for one channel diff of 5: 5^2 / 3 = 25/3 = 8.33
    expect(areFramesEqual(frame1, frame2, 9.0)).toBe(true);
  });

  it('should return false for frames with differences exceeding threshold', () => {
    const frame1 = createRedFrame();
    const frame2 = createSlightlyDifferentRedFrame(50);
    // MSE: (50^2) / 16 = 2500 / 16 = 156.25
    expect(areFramesEqual(frame1, frame2, 20.0)).toBe(false);
  });
});
