import { vi } from 'vitest';

export const createMockVideoElement = (
  currentTime = 0,
  duration = 100,
  videoWidth = 1280,
  videoHeight = 720,
  readyState = 1
) => {
  const videoElement = document.createElement('video');
  vi.spyOn(videoElement, 'pause').mockImplementation(() => {});
  vi.spyOn(videoElement, 'addEventListener').mockImplementation(() => {});
  vi.spyOn(videoElement, 'removeEventListener').mockImplementation(() => {});

  Object.defineProperties(videoElement, {
    currentTime: { writable: true, value: currentTime },
    duration: { writable: true, value: duration },
    videoWidth: { writable: true, value: videoWidth },
    videoHeight: { writable: true, value: videoHeight },
    paused: { writable: true, value: true },
    readyState: { writable: true, value: readyState } // 1 = HAVE_METADATA
  });
  return videoElement;
};
