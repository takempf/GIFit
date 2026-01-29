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

    let activeVideoElement: HTMLVideoElement | null =
      document.querySelector('video');
    const gifService = new GifService();

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
          if (!activeVideoElement) {
            log('No active video element found to start GIF');
            // Start a manual search just in case
            activeVideoElement = document.querySelector('video');
            if (!activeVideoElement) return;
          }
          gifService.createGif(message.config, activeVideoElement);
        } else if (message.type === 'STOP_GIF') {
          gifService.abort();
        } else if (message.type === 'GET_VIDEO_METADATA') {
          if (!activeVideoElement) {
            activeVideoElement = document.querySelector('video');
          }
          if (activeVideoElement) {
            // Check if metadata is loaded
            if (activeVideoElement.readyState < 1) {
              // Return null or partial?
              return Promise.resolve(null);
            }
            return Promise.resolve({
              duration: activeVideoElement.duration,
              width: activeVideoElement.videoWidth,
              height: activeVideoElement.videoHeight,
              currentTime: activeVideoElement.currentTime
            });
          }
          return Promise.resolve(null);
        } else if (message.type === 'SEEK_VIDEO') {
          if (!activeVideoElement) {
            activeVideoElement = document.querySelector('video');
          }
          if (activeVideoElement) {
            const video = activeVideoElement;
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
          if (!activeVideoElement) {
            activeVideoElement = document.querySelector('video');
          }
          if (activeVideoElement) {
            activeVideoElement.pause();
          }
        } else if (message.type === 'CAPTURE_VISIBLE_FRAME') {
          if (!activeVideoElement) {
            activeVideoElement = document.querySelector('video');
          }
          if (activeVideoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = activeVideoElement.videoWidth;
            canvas.height = activeVideoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                activeVideoElement,
                0,
                0,
                canvas.width,
                canvas.height
              );
              return canvas.toDataURL();
            }
          }
          return null;
        }
      }
    );

    // --- Video Detection ---
    const updateVideoElement = () => {
      const video = document.querySelector('video');
      if (video) {
        log('Found video element', video);
        activeVideoElement = video;
      }
    };

    updateVideoElement();

    ctx.addEventListener(window, 'wxt:locationchange', (event) => {
      log('URL changed, checking for video element', event);
      // Give it a moment for the new page/video to load
      setTimeout(updateVideoElement, 500);
      setTimeout(updateVideoElement, 2000);
    });
  }
});
