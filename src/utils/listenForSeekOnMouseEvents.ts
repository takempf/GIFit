export function listenForSeekOnMouseEvents(
  videoElement: HTMLVideoElement,
  callback: (newTime: number) => void
): () => void {
  let mousedownTime: number; // Variable to store currentTime at mousedown

  const handleWindowMouseUp = () => {
    // This listener is added with { once: true }, so it will automatically
    // be removed after execution. No need for manual removeEventListener here.
    const mouseupTime = videoElement.currentTime;

    if (mouseupTime !== mousedownTime) {
      callback(mouseupTime);
    }
  };

  const handleVideoMouseDown = () => {
    mousedownTime = videoElement.currentTime;

    // Listen for the *next* mouseup event anywhere on the window.
    // The { once: true } option ensures this listener fires only once
    // and is then automatically removed, preventing memory leaks or
    // multiple firings.
    window.addEventListener('mouseup', handleWindowMouseUp, { once: true });
  };

  // Attach the mousedown listener to the video element.
  videoElement.addEventListener('mousedown', handleVideoMouseDown);

  // Optional: To make this utility fully manageable, you might want it
  // to return a cleanup function that removes the 'mousedown' listener.
  // For example:
  return () => {
    videoElement.removeEventListener('mousedown', handleVideoMouseDown);
    // If handleWindowMouseUp was active and hadn't fired,
    // it might also need to be removed, but {once: true} simplifies this.
  };
}
