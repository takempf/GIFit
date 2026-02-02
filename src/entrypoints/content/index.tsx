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

    // --- Storyboard Extraction ---
    // We need to inject a script or use window.postMessage to get data from the page context
    // because content scripts live in an isolated world and can't see window.ytInitialPlayerResponse directly.

    // 1. Listen for messages from the page (the injected script response)
    window.addEventListener('message', (event) => {
      // Only accept messages from same frame
      if (event.source !== window) return;

      if (event.data.type === 'YOUTUBE_PLAYER_RESPONSE') {
        log('Received player response from page', event.data.payload);
        // We received the data, now we can forward it to the popup if needed
        // But efficiently, we might store it or just send it when requested?
        // Actually, the flow is: Popup (Component) -> MSG -> Content Script -> PostMessage -> Page -> PostMessage -> Content Script -> SendResponse
      }
    });

    const getStoryboardSpecFromPage = (): Promise<string | null> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 10;
        let intervalId: NodeJS.Timeout;

        const handleResponse = (event: MessageEvent) => {
          if (event.source !== window) return;

          // Ignore our own request messages
          if (event.data?.type === 'GIFIT_GET_STORYBOARD') return;

          if (event.data?.type === 'GIFIT_STORYBOARD_DATA') {
            window.removeEventListener('message', handleResponse);
            clearInterval(intervalId);

            const { spec, duration } = event.data;
            const currentVideo = getVideoElement();

            // Validate duration if available
            if (duration && currentVideo) {
              const videoDuration = Math.round(currentVideo.duration);
              const storyboardDuration = parseInt(duration, 10);

              // Allow small variance (e.g. 2 seconds)
              if (Math.abs(videoDuration - storyboardDuration) > 2) {
                console.warn(
                  `Content: Duration mismatch. Video: ${videoDuration}s, Storyboard: ${storyboardDuration}s. Ignoring spec.`
                );
                resolve(null);
                return;
              }
            }

            resolve(spec || null);
          }
        };

        window.addEventListener('message', handleResponse);

        const injectAndPoll = async () => {
          try {
            // For Firefox MV2, WXT's injectScript creates inline scripts
            // which get blocked by YouTube's CSP. Instead, we manually
            // inject a script tag with src pointing to the web-accessible resource.
            const scriptUrl = browser.runtime.getURL('/main-world.js');
            const existingScript = document.querySelector(
              `script[src="${scriptUrl}"]`
            );

            if (!existingScript) {
              const script = document.createElement('script');
              script.src = scriptUrl;
              script.onload = () => {
                log('Content: main-world.js loaded successfully');
              };
              script.onerror = (e) => {
                console.error('Content: Failed to load main-world.js', e);
              };
              (document.head || document.documentElement).appendChild(script);
              log('Content: Injected main-world.js via script src');
            } else {
              log('Content: main-world.js already injected');
            }
          } catch (e) {
            console.error('Content: Failed to inject main-world.js', e);
          }

          const sendRequest = () => {
            attempts++;
            log(
              `Content: Sending GIFIT_GET_STORYBOARD (Attempt ${attempts}/${maxAttempts})`
            );
            window.postMessage({ type: 'GIFIT_GET_STORYBOARD' }, '*');

            if (attempts >= maxAttempts) {
              clearInterval(intervalId);
              window.removeEventListener('message', handleResponse);
              console.warn(
                'Content: Max attempts reached waiting for storyboard data'
              );
              resolve(null);
            }
          };

          // Send immediately, then poll
          sendRequest();
          intervalId = setInterval(sendRequest, 500);
        };

        injectAndPoll();
      });
    };

    // --- Message Listener ---
    // Use sendResponse callback pattern which works for both Chrome and Firefox
    // when using the browser polyfill from wxt/browser
    browser.runtime.onMessage.addListener(
      (
        message: ExtensionMessage,
        _sender,
        sendResponse: (response?: unknown) => void
      ): true | undefined => {
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
          return;
        }

        if (message.type === 'STOP_GIF') {
          gifService.abort();
          sendResponse({ success: true });
          return;
        }

        if (message.type === 'GET_VIDEO_METADATA') {
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
        }

        if (message.type === 'SEEK_VIDEO') {
          const video = getVideoElement();

          if (video) {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              // Wait for the next frame to be painted
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  sendResponse(true);
                });
              });
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            // Safety timeout
            setTimeout(() => {
              video.removeEventListener('seeked', onSeeked);
              sendResponse(true);
            }, 2000);

            video.currentTime = message.time;
            return true; // Keep channel open for async response
          }
          sendResponse(false);
          return;
        }

        if (message.type === 'PAUSE_VIDEO') {
          const video = getVideoElement();
          if (video) {
            video.pause();
            sendResponse(true);
            return;
          }
          sendResponse(false);
          return;
        }

        if (message.type === 'CAPTURE_VISIBLE_FRAME') {
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

        if (message.type === 'GET_STORYBOARD') {
          getStoryboardSpecFromPage()
            .then((spec) => {
              sendResponse({ spec });
            })
            .catch((error) => {
              log('Error fetching storyboard:', error);
              sendResponse({ spec: null });
            });
          return true; // Keep channel open for async response
        }

        // Return undefined for messages we don't handle
        return undefined;
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
