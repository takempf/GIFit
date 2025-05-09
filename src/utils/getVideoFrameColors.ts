interface HSLColor {
  h: number; // Hue (0-360)
  s: number; // Saturation (0-1)
  l: number; // Lightness (0-1)
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Thresholds for categorization (0-1 range for HSL values)
const LIGHTNESS_DARK_THRESHOLD = 0.33; // Pixels with L < this are "dark"
const LIGHTNESS_BRIGHT_THRESHOLD = 0.66; // Pixels with L >= this are "bright"
// Pixels between DARK and BRIGHT thresholds are "medium"
const SATURATION_THRESHOLD = 0.4; // Pixels with S > this are considered "saturated"

/**
 * Converts an RGB color value to HSL.
 * Assumes r, g, and b are contained in the set [0, 255].
 * Returns h, s, and l in the set [0, 1].
 */
export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

/**
 * Extracts mean dark, medium, bright, and saturated/dominant colors from a video frame.
 * @param videoElement The HTMLVideoElement to process.
 * @param sampleDensity Process every Nth pixel (e.g., 1 for all, 10 for 1/10th). Higher is faster but less accurate.
 * @returns A Promise resolving to an array of 4 RGB color strings:
 *          [dark, medium, bright, saturatedDominant]
 *          Defaults to 'rgb(0,0,0)' for categories with no pixels.
 */
export function getVideoFrameColors(
  videoElement: HTMLVideoElement,
  sampleDensity: number = 5 // Default to sampling every 5th pixel for performance
): string[] {
  if (
    !videoElement ||
    videoElement.readyState < videoElement.HAVE_CURRENT_DATA ||
    videoElement.videoWidth === 0 ||
    videoElement.videoHeight === 0
  ) {
    console.warn('Video not ready or has no dimensions.');
    const defaultColor = 'rgb(0,0,0)';
    return [defaultColor, defaultColor, defaultColor, defaultColor];
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Could not get 2D context from canvas');
  }

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  // Draw the current video frame to the canvas
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  let imageData: ImageData;
  try {
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  } catch (error) {
    console.error('Error getting image data (tainted canvas?):', error);
    const defaultColor = 'rgb(0,0,0)';
    return [defaultColor, defaultColor, defaultColor, defaultColor];
  }

  const data = imageData.data;

  const darkPixels: RGBColor[] = [];
  const mediumPixels: RGBColor[] = [];
  const brightPixels: RGBColor[] = [];
  const saturatedPixels: RGBColor[] = [];

  // Iterate over pixels, respecting sampleDensity
  // Each pixel is 4 values (R,G,B,A)
  for (let i = 0; i < data.length; i += 4 * Math.max(1, sampleDensity)) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // We can ignore alpha (data[i+3]) for color analysis unless transparency is key

    const hsl = rgbToHsl(r, g, b);

    // Categorize by lightness
    if (hsl.l < LIGHTNESS_DARK_THRESHOLD) {
      darkPixels.push({ r, g, b });
    } else if (hsl.l < LIGHTNESS_BRIGHT_THRESHOLD) {
      mediumPixels.push({ r, g, b });
    } else {
      brightPixels.push({ r, g, b });
    }

    // Categorize by saturation
    if (hsl.s > SATURATION_THRESHOLD) {
      saturatedPixels.push({ r, g, b });
    }
  }

  // Helper to calculate mean color from an array of RGBColor objects
  const calculateMeanColor = (pixels: RGBColor[]): string => {
    if (pixels.length === 0) {
      return 'rgb(0,0,0)'; // Default if no pixels in category
    }
    let sumR = 0,
      sumG = 0,
      sumB = 0;
    for (const pixel of pixels) {
      sumR += pixel.r;
      sumG += pixel.g;
      sumB += pixel.b;
    }
    const count = pixels.length;
    return `rgb(${Math.round(sumR / count)}, ${Math.round(
      sumG / count
    )}, ${Math.round(sumB / count)})`;
  };

  return [
    calculateMeanColor(darkPixels),
    calculateMeanColor(mediumPixels),
    calculateMeanColor(brightPixels),
    calculateMeanColor(saturatedPixels) // This is mean of "saturated" pixels
  ];
}
