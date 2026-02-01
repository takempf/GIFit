/**
 * Detects the most prominent video element on the page.
 * Criteria:
 * 1. Connected to DOM
 * 2. Visible (CSS)
 * 3. Physical dimensions > 0
 * 4. In Viewport
 * 5. Largest visible area in viewport wins
 */
export function findBestVideo(
  videos: ArrayLike<HTMLVideoElement>
): HTMLVideoElement | null {
  const videoList = Array.from(videos);
  let bestVideo: HTMLVideoElement | null = null;
  let maxVisibleArea = 0;

  for (const video of videoList) {
    if (!video.isConnected) continue;

    const rect = video.getBoundingClientRect();
    const style = window.getComputedStyle(video);

    // 1. Check if it takes up physical space
    const hasDimensions = rect.width > 0 && rect.height > 0;

    // 2. Check strict CSS visibility
    const isVisibleCSS =
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      parseFloat(style.opacity) > 0;

    // 3. Check if video metadata is loaded
    const hasMetadata = video.readyState > 0;

    if (!hasDimensions || !isVisibleCSS || !hasMetadata) continue;

    // 4. Calculate visible area in viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const intersectionLeft = Math.max(0, rect.left);
    const intersectionRight = Math.min(viewportWidth, rect.right);
    const intersectionTop = Math.max(0, rect.top);
    const intersectionBottom = Math.min(viewportHeight, rect.bottom);

    const width = Math.max(0, intersectionRight - intersectionLeft);
    const height = Math.max(0, intersectionBottom - intersectionTop);

    const visibleArea = width * height;

    if (visibleArea > maxVisibleArea) {
      maxVisibleArea = visibleArea;
      bestVideo = video;
    }
  }

  return bestVideo;
}
