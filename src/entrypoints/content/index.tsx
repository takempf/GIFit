// 1. Import the style
import './style.css';

import { defineContentScript, createShadowRootUi } from '#imports';
import ReactDOM from 'react-dom/client';

import { log } from '@/utils/logger';
import { useAppStore } from '@/stores/appStore';

import { App } from '../../components/App';
import { useGifStore } from '@/stores/gifGeneratorStore';

export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  registration: 'manifest',

  async main(ctx) {
    log('Running content script');

    ctx.addEventListener(window, 'wxt:locationchange', (event) => {
      log('URL changed, checking video id', event);
      const prevVideoId = useAppStore.getState().videoId;
      const videoId = event.newUrl.searchParams.get('v');

      if (prevVideoId !== videoId) {
        const videoElement = useAppStore.getState().videoElement;
        useGifStore.getState().reset();
        useAppStore.getState().reset({ videoElement });
        useAppStore.getState().setVideoId(videoId);
      }
    });

    const ui = await createShadowRootUi(ctx, {
      name: 'gif-it',
      position: 'inline',
      // only show GIFit with the large players
      anchor:
        '#primary ytd-player video, #full-bleed-container ytd-player video',

      append(anchor, ui) {
        const ytdPlayerElement = anchor.closest('ytd-player');
        log('Appending the ui to <ytd-player>', ui, ytdPlayerElement);
        ytdPlayerElement?.appendChild(ui);

        // Let the app know where the video is
        useAppStore.getState().setVideoElement(anchor as HTMLVideoElement);
      },

      onMount(container) {
        // Container is a body, and React warns when creating a root on the body, so create a wrapper div
        const wrapperElement = document.createElement('div');
        container.appendChild(wrapperElement);

        // Create a root on the UI container and render a component
        const root = ReactDOM.createRoot(wrapperElement);
        root.render(<App />);
        return root;
      },

      onRemove: (root) => {
        // Unmount the root when the UI is removed
        root?.unmount();
      }
    });

    ui.autoMount();
  }
});
