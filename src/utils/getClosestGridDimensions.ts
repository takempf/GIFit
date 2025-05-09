export function getClosestGridDimensions(
  targetWidth: number,
  targetHeight: number,
  length: number
): [number, number] {
  if (length <= 0) {
    return [0, 0];
  }
  if (targetWidth <= 0 || targetHeight <= 0) {
    // Invalid target aspect ratio, cannot meaningfully proceed.
    // Fallback: try to make it as square as possible.
    const side = Math.ceil(Math.sqrt(length));
    // This case could also throw an error or have a more specific fallback.
    // For now, let's find factors for a square-like arrangement.
    for (let c = side; c <= length; c++) {
      const r = Math.ceil(length / c);
      if (c * r >= length) {
        // Should always be true with ceil
        // This isn't ideal as it doesn't use targetWidth/Height
        // but it's a fallback if they are invalid.
        // A better square-ish approach:
        let bestC = Math.ceil(Math.sqrt(length));
        let bestR = Math.ceil(length / bestC);
        // Ensure bestC is the larger one if not perfectly square, for consistency
        if (bestC < bestR) [bestC, bestR] = [bestR, bestC];
        return [bestC, bestR];
      }
    }
    return [length, 1]; // Absolute fallback
  }

  const targetAspectRatio = targetWidth / targetHeight;

  let bestCols = length; // Initialize with a valid but likely suboptimal layout
  let bestRows = 1;
  let minAspectRatioDiff = Infinity;
  let minArea = bestCols * bestRows; // Area for the best found dimensions

  // Iterate through possible numbers of columns
  // We can go up to 'length' for columns (which means 1 row)
  for (let cols = 1; cols <= length; cols++) {
    // Calculate the minimum number of rows needed for these columns
    const rows = Math.ceil(length / cols);
    const currentArea = cols * rows;

    // This combination is valid if it can hold all items
    // (which it will due to Math.ceil)

    const currentAspectRatio = cols / rows;
    const aspectRatioDiff = Math.abs(currentAspectRatio - targetAspectRatio);

    if (aspectRatioDiff < minAspectRatioDiff) {
      minAspectRatioDiff = aspectRatioDiff;
      bestCols = cols;
      bestRows = rows;
      minArea = currentArea;
    } else if (aspectRatioDiff === minAspectRatioDiff) {
      // If aspect ratio difference is the same,
      // prefer the one with fewer empty spots (smaller total area)
      if (currentArea < minArea) {
        bestCols = cols;
        bestRows = rows;
        minArea = currentArea;
      }
    }
  }

  // The problem asks for [width_like_factor, height_like_factor].
  // Our 'cols' is width-like and 'rows' is height-like.
  return [bestCols, bestRows];
}
