import { defineUnlistedScript } from '#imports';

declare global {
  interface Window {
    ytInitialPlayerResponse?: {
      storyboards?: {
        playerStoryboardSpecRenderer?: {
          spec?: string;
        };
      };
    };
  }
}

export default defineUnlistedScript(() => {
  console.log('GIFit! Main World script loaded (Injected)');

  window.addEventListener('message', (event) => {
    // Only accept messages from same frame
    if (event.source !== window) return;

    if (event.data?.type === 'GIFIT_GET_STORYBOARD') {
      let response = null;

      // Define minimal player interface
      interface YouTubePlayer extends HTMLElement {
        getPlayerResponse?: () => {
          storyboards?: {
            playerStoryboardSpecRenderer?: {
              spec?: string;
            };
          };
          videoDetails?: {
            lengthSeconds?: string;
          };
        };
      }

      // Try getting fresh data from the player API first
      const player = document.getElementById(
        'movie_player'
      ) as YouTubePlayer | null;
      if (player && typeof player.getPlayerResponse === 'function') {
        try {
          response = player.getPlayerResponse();
          console.log('GIFit! Main: Fetched fresh response from player API');
        } catch (e) {
          console.warn(
            'GIFit! Main: Error getting response from player API',
            e
          );
        }
      }

      // Fallback to initial response
      if (!response) {
        console.log('GIFit! Main: Falling back to ytInitialPlayerResponse');
        response = window.ytInitialPlayerResponse;
      }

      if (response) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const castResponse = response as any;
        const spec =
          castResponse.storyboards?.playerStoryboardSpecRenderer?.spec;
        const duration = castResponse.videoDetails?.lengthSeconds; // Extract duration

        console.log('GIFit! Main: Found spec in player response', {
          spec,
          duration
        });

        window.postMessage(
          {
            type: 'GIFIT_STORYBOARD_DATA',
            spec: spec,
            duration: duration ? parseInt(duration, 10) : undefined
          },
          '*'
        );
      } else {
        console.log('GIFit! Main: No player response found (API or Initial)');
        window.postMessage(
          {
            type: 'GIFIT_STORYBOARD_DATA',
            spec: null
          },
          '*'
        );
      }
    }
  });
});
