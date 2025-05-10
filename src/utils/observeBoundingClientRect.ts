/**
 * Efficiently listens to the bounding client rect data for the provided element.
 *
 * @param element The DOM element to observe.
 * @param callback A function that will be called with the element's
 *                 DOMRect data whenever it changes.
 * @returns A function that, when called, unbinds all listeners and cleans up.
 */
export function observeBoundingClientRect(
  element: Element,
  callback: (rect: DOMRect) => void
): () => void {
  if (!element) {
    console.warn(
      'observeBoundingClientRect: Provided element is null or undefined.'
    );
    return () => {}; // Return a no-op cleanup function
  }

  let animationFrameId: number | null = null;

  // This function gets the latest rect and calls the user's callback.
  // It's scheduled via requestAnimationFrame.
  const updateRect = () => {
    animationFrameId = null; // Clear the ID as we are about to run
    const newRect = element.getBoundingClientRect();
    callback(newRect);
  };

  // This function schedules an update via requestAnimationFrame.
  // If an update is already scheduled, it will be replaced by this new one.
  const scheduleUpdate = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(updateRect);
  };

  // 1. Observe element's own size changes
  const resizeObserver = new ResizeObserver(scheduleUpdate);
  resizeObserver.observe(element);

  // 2. Observe window resize events
  window.addEventListener('resize', scheduleUpdate, { passive: true });

  // 3. Observe scroll events on the document (capture phase to catch all scrolls)
  //    This is important because scrolling a parent can change the element's
  //    position relative to the viewport.
  document.addEventListener('scroll', scheduleUpdate, {
    capture: true,
    passive: true
  });

  // Initial call to provide the first bounding client rect
  scheduleUpdate();

  // Return the cleanup function
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    resizeObserver.disconnect();
    window.removeEventListener('resize', scheduleUpdate);
    document.removeEventListener('scroll', scheduleUpdate, { capture: true });
  };
}
