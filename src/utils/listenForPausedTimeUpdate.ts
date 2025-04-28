/**
 * Listens for time updates on a video element ONLY when it's paused,
 * firing a callback with the current time.
 *
 * This specifically addresses the case where the user might scrub (change time)
 * while the video is in a paused state.
 *
 * @param videoElement The HTMLVideoElement to monitor.
 * @param callback The function to call when a time update occurs while paused.
 *                 Receives the video's current time (number) as an argument.
 * @returns A cleanup function that removes the event listener. Call this
 *          when the element is destroyed or you no longer need the listener.
 */
export function listenForPausedTimeUpdate(
  videoElement: HTMLVideoElement,
  callback: (currentTime: number) => void
): () => void {
  // Define the handler function
  const handleTimeUpdate = () => {
    // Check if the video is paused *at the moment* the timeupdate event fires
    if (videoElement.paused) {
      callback(videoElement.currentTime);
    }
  };

  // Add the event listener for time changes
  videoElement.addEventListener('timeupdate', handleTimeUpdate);

  // Define and return the cleanup function
  const cleanup = () => {
    videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    // console.log("Paused time update listener removed."); // Optional: for debugging
  };

  return cleanup;
}
