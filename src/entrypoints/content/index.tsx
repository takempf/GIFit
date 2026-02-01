import { defineContentScript } from '#imports';
import { browser } from 'wxt/browser';
import GifService from '@/features/generator/services/GifService';
import { log } from '@/utils/logger';
import { ExtensionMessage } from '@/types';
import { findBestVideo } from '@/utils/videoDetection';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',
  async main(ctx) {
    log('Running content script');

    let activeVideoElement: HTMLVideoElement | null = null;
    const gifService = new GifService();

    /**
     * securely gets the video element, ensuring it is connected to the DOM.
     * Uses findBestVideo to select the most prominent visible video.
     */
    const getVideoElement = (): HTMLVideoElement | null => {
      const allVideos = document.querySelectorAll('video');
      const bestVideo = findBestVideo(allVideos);

      if (bestVideo) {
        if (activeVideoElement !== bestVideo) {
          log('Found new best video element', bestVideo);
        }
        activeVideoElement = bestVideo;
        return activeVideoElement;
      }

      // Fallback: If no "best" (visible/prominent) video is found,
      // determine if we should fallback to *any* video or `activeVideoElement`.
      // For now, based on "Ensure its' visible", we return null if nothing matches logic.
      // However, if we have a connected activeVideoElement, maybe we return it?
      // Strict interpretation: "Ensure its' visible" -> return null if not.

      log('No suitable video element found');
      return null;
    };

    // --- Mutation Observer ---
    // Watch for new video elements appearing in the DOM (e.g. SPA navigation)
    // We mainly use this to log detection or hint, but getVideoElement is the authority.
    const observer = new MutationObserver((mutations) => {
      let foundNew = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLVideoElement) {
            foundNew = true;
            break;
          }
          if (node instanceof Element) {
            if (node.querySelector('video')) {
              foundNew = true;
              break;
            }
          }
        }
        if (foundNew) break;
      }

      if (foundNew) {
        log('New video element detected in DOM via MutationObserver');
        // We don't blindly set activeVideoElement anymore, we let getVideoElement find it when needed.
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check - Removed to prefer on-demand checking when popup opens
    // getVideoElement();

    // --- Service Event Listeners ---
    gifService.on(
      'FRAMES_PROGRESS',
      (progress, frameCount, thumbnailDataUrl) => {
        browser.runtime
          .sendMessage({
            type: 'GIF_PROGRESS',
            progress,
            frameCount,
            thumbnailDataUrl
          })
          .catch((error) => {
            log('Failed to send GIF_PROGRESS message:', error);
          });
      }
    );

    gifService.on('COMPLETE', (data) => {
      browser.runtime
        .sendMessage({ type: 'GIF_COMPLETE', data })
        .catch((error) => {
          log('Failed to send GIF_COMPLETE message:', error);
        });
    });

    gifService.on('ERROR', (error) => {
      browser.runtime
        .sendMessage({ type: 'GIF_ERROR', error: error.message })
        .catch((error) => {
          log('Failed to send GIF_ERROR message:', error);
        });
    });

    // --- Message Listener ---
    browser.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        // Handle async message processing
        const handleMessage = async () => {
          try {
            log('Content Script received message:', message.type);

            if (message.type === 'START_GIF') {
              const video = getVideoElement();
              if (!video) {
                log('No active video element found to start GIF');
                sendResponse({ success: false, error: 'No video found' });
                return;
              }
              gifService.createGif(message.config, video);
              sendResponse({ success: true });
            } else if (message.type === 'STOP_GIF') {
              gifService.abort();
              sendResponse({ success: true });
            } else if (message.type === 'GET_VIDEO_METADATA') {
              log('Handling GET_VIDEO_METADATA');
              const video = getVideoElement();

              if (video) {
                // Check if metadata is loaded
                if (video.readyState < 1) {
                  log('Video metadata not loaded yet (readyState < 1)');
                  sendResponse(null);
                  return;
                }

                log('Selected video element:', video);
                log(
                  `Video details: id="${video.id}", class="${video.className}", src="${video.currentSrc}"`
                );

                const metadata = {
                  duration: video.duration,
                  width: video.videoWidth,
                  height: video.videoHeight,
                  currentTime: video.currentTime
                };
                log('Returning video metadata:', metadata);
                sendResponse(metadata);
                return;
              }
              log('No video found for GET_VIDEO_METADATA');
              sendResponse(null);
              return;
            } else if (message.type === 'SEEK_VIDEO') {
              const video = getVideoElement();

              if (video) {
                const seekPromise = new Promise<void>((resolve) => {
                  const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    // Wait for the next frame to be painted
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        resolve();
                      });
                    });
                  };
                  video.addEventListener('seeked', onSeeked, { once: true });
                  // Safety timeout
                  setTimeout(() => {
                    video.removeEventListener('seeked', onSeeked);
                    resolve();
                  }, 2000);
                });
                video.currentTime = message.time;
                await seekPromise;
                sendResponse(true); // Acknowledgement
                return;
              }
              sendResponse(false);
              return;
            } else if (message.type === 'PAUSE_VIDEO') {
              const video = getVideoElement();
              if (video) {
                video.pause();
                sendResponse(true); // Acknowledgement
                return;
              }
              sendResponse(false);
              return;
            } else if (message.type === 'CAPTURE_VISIBLE_FRAME') {
              const video = getVideoElement();
              if (video) {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  sendResponse(canvas.toDataURL());
                  return;
                }
              }
              sendResponse(null);
              return;
            }
          } catch (error) {
            log('Error in message listener:', error);
            if (error instanceof Error) {
              sendResponse({ error: error.message });
            } else {
              sendResponse({ error: 'Unknown error' });
            }
          }
        };

        handleMessage();
        return true; // Keep the message channel open for async response
      }
    );

    // --- Video Detection matches ---
    // We can rely on MutationObserver mostly, but location change is a good fallback hint
    const updateVideoElement = () => {
      // Just run the getter to refresh if needed
      getVideoElement();
    };

    ctx.addEventListener(window, 'wxt:locationchange', (event) => {
      log('URL changed, checking for video element', event);
      // Give it a moment for the new page/video to load
      setTimeout(updateVideoElement, 500);
      setTimeout(updateVideoElement, 2000);
    });
  }
});
