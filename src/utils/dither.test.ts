import { describe, it, expect } from 'vitest';
import floydSteinberg from './dither'; // Default export

// Helper to create a Uint8ClampedArray for a solid color image
function createImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return data;
}

// Helper to get a pixel's RGBA value
function getPixel(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
}

describe('floydSteinberg dithering', () => {
  const black: [number, number, number] = [0, 0, 0];
  const white: [number, number, number] = [255, 255, 255];
  const red: [number, number, number] = [255, 0, 0];
  const green: [number, number, number] = [0, 255, 0];
  const blue: [number, number, number] = [0, 0, 255];

  it('should not change pixels if color is already in palette (1x1)', () => {
    const palette: [number, number, number][] = [black, white];
    const pixels = createImageData(1, 1, 0, 0, 0); // Black pixel
    const originalPixels = Uint8ClampedArray.from(pixels);

    const dithered = floydSteinberg(pixels, 1, 1, palette);

    expect(dithered[0]).toBe(originalPixels[0]); // R
    expect(dithered[1]).toBe(originalPixels[1]); // G
    expect(dithered[2]).toBe(originalPixels[2]); // B
    expect(dithered[3]).toBe(255); // Alpha should be opaque
  });

  it('should map color to the closest one if not in palette (1x1)', () => {
    const palette: [number, number, number][] = [black, white];
    const pixels = createImageData(1, 1, 120, 120, 120); // Gray pixel

    const dithered = floydSteinberg(pixels, 1, 1, palette); // Should map to black (0,0,0) as 120 is closer to 0 than 255

    expect(dithered[0]).toBe(0);
    expect(dithered[1]).toBe(0);
    expect(dithered[2]).toBe(0);
    expect(dithered[3]).toBe(255);
  });

  it('should map color to the only color in palette (1x1)', () => {
    const palette: [number, number, number][] = [red];
    const pixels = createImageData(1, 1, 10, 20, 30);

    const dithered = floydSteinberg(pixels, 1, 1, palette);

    expect(dithered[0]).toBe(255);
    expect(dithered[1]).toBe(0);
    expect(dithered[2]).toBe(0);
    expect(dithered[3]).toBe(255);
  });

  it('should set alpha to 255 for all pixels', () => {
    const palette: [number, number, number][] = [black, white];
    const pixels = createImageData(2, 2, 100, 100, 100, 100); // Original alpha 100

    const dithered = floydSteinberg(pixels, 2, 2, palette);

    for (let i = 0; i < dithered.length; i += 4) {
      expect(dithered[i + 3]).toBe(255);
    }
  });

  it('should ensure all output pixels are colors from the palette (2x2)', () => {
    const palette: [number, number, number][] = [red, green, blue];
    const pixels = createImageData(2, 2, 100, 150, 200); // A color not in palette

    const dithered = floydSteinberg(pixels, 2, 2, palette);

    for (let i = 0; i < dithered.length; i += 4) {
      const pixelColor: [number, number, number] = [
        dithered[i],
        dithered[i + 1],
        dithered[i + 2]
      ];
      // Check if this pixelColor is one of the palette colors
      const isInPalette = palette.some(
        (paletteColor) =>
          paletteColor[0] === pixelColor[0] &&
          paletteColor[1] === pixelColor[1] &&
          paletteColor[2] === pixelColor[2]
      );
      expect(isInPalette).toBe(true);
    }
  });

  it('should dither a 2x1 gray image with black and white palette', () => {
    const palette: [number, number, number][] = [black, white];
    // Mid-gray, should cause dithering. Exact value 128 would be between 0 and 255.
    // Let's use 128. Error = 128 - 0 = 128 (if first pixel becomes black)
    // or 128 - 255 = -127 (if first pixel becomes white)
    // findNearestColor(128,128,128) with [0,0,0] and [255,255,255] palette will choose [0,0,0]
    // So, oldR=128, newR=0. errorR = 128.
    const pixels = createImageData(2, 1, 128, 128, 128);
    // Pixels: [128,128,128,255,  128,128,128,255]

    const dithered = floydSteinberg(pixels, 2, 1, palette);

    // Pixel (0,0) - Scanned first (left-to-right)
    // Original: [128, 128, 128]. Nearest in [black, white] is white [255,255,255] (128 is closer to 255 than 0).
    // Error: [128-255, 128-255, 128-255] = [-127, -127, -127].
    // Pixel (0,0) becomes white.
    expect(getPixel(dithered, 0, 0, 2)).toEqual([255, 255, 255, 255]);

    // Error distribution from (0,0) to (1,0) (right):
    // Original (1,0) was [128,128,128].
    // Error from (0,0) is [-127, -127, -127]. Fraction is 7/16.
    // Propagated error component: -127 * (7/16) = -55.5625.
    // Modified (1,0) before quantization:
    // R = 128 - 55.5625 = 72.4375
    // G = 128 - 55.5625 = 72.4375
    // B = 128 - 55.5625 = 72.4375
    // Nearest color to [72.4375, ...] in [black, white] palette is black [0,0,0].
    // Pixel (1,0) becomes black.
    expect(getPixel(dithered, 1, 0, 2)).toEqual([0, 0, 0, 255]);
  });

  // More complex error distribution tests would be very fragile due to floating point math
  // and the exact sequence of operations. The above test gives some confidence.
});
