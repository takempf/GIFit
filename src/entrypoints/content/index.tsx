import { defineContentScript } from '#imports';
import { browser } from 'wxt/browser';
import GifService from '@/services/GifService';
import { log } from '@/utils/logger';
import { ExtensionMessage } from '@/types';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',
  async main(ctx) {
    log('Running content script');

    let activeVideoElement: HTMLVideoElement | null = null;
    const gifService = new GifService();

    /**
     * securely gets the video element, ensuring it is connected to the DOM.
     * Use this instead of accessing activeVideoElement directly.
     */
    const getVideoElement = (): HTMLVideoElement | null => {
      // If we have a reference, check if it's still valid (connected to DOM)
      if (activeVideoElement && activeVideoElement.isConnected) {
        return activeVideoElement;
      }

      // If not, try to find one
      const video = document.querySelector('video');
      if (video) {
        if (activeVideoElement !== video) {
          log('Found new video element via legacy search', video);
        }
        activeVideoElement = video;
        return activeVideoElement;
      }

      // No video found
      return null;
    };

    // --- Mutation Observer ---
    // Watch for new video elements appearing in the DOM (e.g. SPA navigation)
    const observer = new MutationObserver((mutations) => {
      let foundNew = false;

      // If current video is disconnected, we definitely need a new one
      if (activeVideoElement && !activeVideoElement.isConnected) {
        activeVideoElement = null;
      }

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLVideoElement) {
            activeVideoElement = node;
            foundNew = true;
            break;
          }
          if (node instanceof Element) {
            // Check inside added subtrees
            const video = node.querySelector('video');
            if (video) {
              activeVideoElement = video;
              foundNew = true;
              break; // assume first video is main
            }
          }
        }
        if (foundNew) break;
      }

      if (foundNew) {
        log('Video element detected via MutationObserver', activeVideoElement);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    getVideoElement();

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
          .catch(() => {
            // Popup likely closed, ignore
          });
      }
    );

    gifService.on('COMPLETE', (data) => {
      browser.runtime
        .sendMessage({ type: 'GIF_COMPLETE', data })
        .catch(() => {});
    });

    gifService.on('ERROR', (error) => {
      browser.runtime
        .sendMessage({ type: 'GIF_ERROR', error: error.message })
        .catch(() => {});
    });

    // --- Message Listener ---
    browser.runtime.onMessage.addListener(
      async (message: ExtensionMessage, _sender, _sendResponse) => {
        if (message.type === 'START_GIF') {
          const video = getVideoElement();
          if (!video) {
            log('No active video element found to start GIF');
            return;
          }
          gifService.createGif(message.config, video);
        } else if (message.type === 'STOP_GIF') {
          gifService.abort();
        } else if (message.type === 'GET_VIDEO_METADATA') {
          const video = getVideoElement();

          if (video) {
            // Check if metadata is loaded
            if (video.readyState < 1) {
              // Return null or partial?
              return Promise.resolve(null);
            }
            return Promise.resolve({
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              currentTime: video.currentTime
            });
          }
          return Promise.resolve(null);
        } else if (message.type === 'SEEK_VIDEO') {
          const video = getVideoElement();

          if (video) {
            const seekPromise = new Promise<void>((resolve) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve();
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
          }
        } else if (message.type === 'PAUSE_VIDEO') {
          const video = getVideoElement();
          if (video) {
            video.pause();
          }
        } else if (message.type === 'CAPTURE_VISIBLE_FRAME') {
          const video = getVideoElement();
          if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              return canvas.toDataURL();
            }
          }
          return null;
        }
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
