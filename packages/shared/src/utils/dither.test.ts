import { describe, it, expect } from 'vitest';
import floydSteinberg from './dither';

describe('floydSteinberg', () => {
  it('should return a Uint8ClampedArray', () => {
    const width = 2;
    const height = 2;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(0);
    const palette: [number, number, number][] = [
      [0, 0, 0],
      [255, 255, 255]
    ];

    const result = floydSteinberg(pixels, width, height, palette);
    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(result.length).toBe(pixels.length);
  });

  it('should not throw errors for empty input', () => {
    const width = 0;
    const height = 0;
    const pixels = new Uint8ClampedArray(0);
    const palette: [number, number, number][] = [[0, 0, 0]];

    expect(() => floydSteinberg(pixels, width, height, palette)).not.toThrow();
  });

  it('should map pixels to the nearest palette color', () => {
    // 2x1 image with 2 pixels
    const width = 2;
    const height = 1;
    // Pixel 1: close to black (10, 10, 10)
    // Pixel 2: close to white (240, 240, 240)
    const pixels = new Uint8ClampedArray([10, 10, 10, 255, 240, 240, 240, 255]);

    // Palette: Black and White
    const palette: [number, number, number][] = [
      [0, 0, 0],
      [255, 255, 255]
    ];

    const result = floydSteinberg(pixels, width, height, palette);

    // First pixel should be black (0, 0, 0)
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(0);
    expect(result[3]).toBe(255);

    // Second pixel should be white (255, 255, 255) because of dithering/closeness
    // Note: Dithering might affect the second pixel based on the error from the first
    // Error from first: (10-0)=10, (10-0)=10, (10-0)=10
    // Distributed to right neighbor (7/16 * 10 = ~4.375)
    // Second pixel becomes (240+4, 240+4, 240+4) = (244, 244, 244)
    // Still closest to 255.
    expect(result[4]).toBe(255);
    expect(result[5]).toBe(255);
    expect(result[6]).toBe(255);
    expect(result[7]).toBe(255);
  });
});
