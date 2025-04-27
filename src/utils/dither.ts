/**
 * Clamps a value between a minimum and maximum.
 */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

/**
 * Squares a number.
 */
const sqr = (a: number): number => a * a;

/**
 * Represents an RGB color tuple.
 */
type RgbColor = [number, number, number];

/**
 * Represents a color palette as an array of RGB colors.
 */
type Palette = RgbColor[];

/**
 * Calculates the flat array index for a given (x, y) coordinate in RGBA data.
 * Coordinates are clamped to be within image bounds.
 */
function getPixelIndex(
  x: number,
  y: number,
  width: number,
  height: number
): number {
  const clampedX = clamp(Math.floor(x), 0, width - 1);
  const clampedY = clamp(Math.floor(y), 0, height - 1);
  return (clampedY * width + clampedX) * 4; // 4 bytes per pixel (RGBA)
}

/**
 * Converts an RGB888 color to a single number representation using RGB565 bit packing.
 * Used as a key for caching nearest color lookups.
 */
function rgb888ToRgb565(r: number, g: number, b: number): number {
  // R: 8bit -> 5bit (>> 3), shift left 11
  // G: 8bit -> 6bit (>> 2), shift left 5
  // B: 8bit -> 5bit (>> 3)
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

/**
 * Finds the index of the color in the palette closest to the given RGB values.
 * Uses squared Euclidean distance for comparison.
 */
function findNearestColorIndex(
  r: number,
  g: number,
  b: number,
  palette: Palette
): number {
  let nearestIndex = 0;
  let minDistanceSq = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    let distanceSq = sqr(pr - r);
    if (distanceSq >= minDistanceSq) continue; // Early exit if R distance alone is too large
    distanceSq += sqr(pg - g);
    if (distanceSq >= minDistanceSq) continue; // Early exit if R+G distance is too large
    distanceSq += sqr(pb - b);

    if (distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq;
      nearestIndex = i;
      if (minDistanceSq === 0) break; // Exact match found
    }
  }
  return nearestIndex;
}

/**
 * Applies Floyd-Steinberg dithering to pixel data.
 * Modifies the input pixel array in place and returns it.
 *
 * @param pixels The RGBA pixel data (e.g., from ImageData.data).
 * @param width The width of the image.
 * @param height The height of the image.
 * @param palette An array of [R, G, B] colors representing the target palette.
 * @returns The modified pixel data array with dithering applied.
 */
export default function floydSteinberg(
  pixels: Uint8ClampedArray, // Use Uint8ClampedArray for automatic clamping
  width: number,
  height: number,
  palette: Palette
): Uint8ClampedArray {
  // Cache for nearest color lookups (key: rgb565 value, value: palette index)
  // Using undefined allows checking if a key exists vs. having a value of 0
  const cache: (number | undefined)[] = new Array(65536); // 2^16 for rgb565

  const currentError: [number, number, number] = [0, 0, 0];

  // Helper to distribute error fraction to a neighbor pixel
  const distributeError = (
    x: number,
    y: number,
    error: [number, number, number],
    fraction: number
  ): void => {
    // Check bounds before calculating index to avoid unnecessary clamping inside getPixelIndex
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const index = getPixelIndex(x, y, width, height);
      pixels[index + 0] += error[0] * fraction;
      pixels[index + 1] += error[1] * fraction;
      pixels[index + 2] += error[2] * fraction;
      // Alpha channel (index + 3) remains unchanged
    }
  };

  for (let y = 0; y < height; y++) {
    // Serpentine scanning: process rows left-to-right, then right-to-left, etc.
    const leftToRight = y % 2 === 0;

    for (let i = 0; i < width; i++) {
      // Get the actual x-coordinate based on scan direction
      const x = leftToRight ? i : width - 1 - i;
      const index = getPixelIndex(x, y, width, height);

      // Get original color (potentially already modified by diffused error)
      const oldR = pixels[index + 0];
      const oldG = pixels[index + 1];
      const oldB = pixels[index + 2];

      // Find nearest color in palette, using cache if possible
      const cacheKey = rgb888ToRgb565(oldR, oldG, oldB);
      let paletteIndex = cache[cacheKey];
      if (paletteIndex === undefined) {
        paletteIndex = findNearestColorIndex(oldR, oldG, oldB, palette);
        cache[cacheKey] = paletteIndex;
      }

      const [newR, newG, newB] = palette[paletteIndex];

      // Set the current pixel to the new palette color
      pixels[index + 0] = newR;
      pixels[index + 1] = newG;
      pixels[index + 2] = newB;
      pixels[index + 3] = 255; // Set alpha to fully opaque (as in original)

      // Calculate quantization error for this pixel
      currentError[0] = oldR - newR;
      currentError[1] = oldG - newG;
      currentError[2] = oldB - newB;

      // Distribute error to neighbors according to Floyd-Steinberg pattern
      if (leftToRight) {
        distributeError(x + 1, y, currentError, 7 / 16); // Right
        distributeError(x - 1, y + 1, currentError, 3 / 16); // Below Left
        distributeError(x, y + 1, currentError, 5 / 16); // Below
        distributeError(x + 1, y + 1, currentError, 1 / 16); // Below Right
      } else {
        // Reversed pattern for right-to-left scan
        distributeError(x - 1, y, currentError, 7 / 16); // Left
        distributeError(x + 1, y + 1, currentError, 3 / 16); // Below Right
        distributeError(x, y + 1, currentError, 5 / 16); // Below
        distributeError(x - 1, y + 1, currentError, 1 / 16); // Below Left
      }
    }
  }

  return pixels;
}
