import css from './App.module.css';

import { useCallback, useEffect } from 'react';
import { browser } from 'wxt/browser';

import { AppLogo } from './AppLogo/AppLogo';
import { ConfigurationPanel } from '../features/editor/components/ConfigurationPanel/ConfigurationPanel';
import { GifPreview } from '@/features/editor/components/GifPreview/GifPreview';
import { ProcessingPanel } from '@/features/editor/components/ProcessingPanel/ProcessingPanel';
import { ResultPanel } from '@/features/editor/components/ResultPanel/ResultPanel';

import { useAppStore } from '@/stores/appStore';
import {
  // useConfigurationPanelStore,
  ConfigState
} from '@/features/editor/stores/configurationPanelStore';
import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';

import TKLogo from '@/assets/tk.svg';

import { ExtensionMessage } from '@/types';

// We can just use ConfigState directly or Pick what we need.
// handleSubmit uses: start, duration, width, height, framerate (from fps alias?), quality.
// ConfigState has: start, duration, width, height, framerate, quality...
// Let's use ConfigState for the handler.

async function getVideoTitle() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const title = tabs[0]?.title ?? 'untitled';
  return title.replace(' - YouTube', '');
}

export function App() {
  const status = useAppStore((state) => state.status);
  const setStatus = useAppStore((state) => state.setStatus);
  const setName = useGifStore((state) => state.setName);
  const createGif = useGifStore((state) => state.createGif);
  const updateProgress = useGifStore((state) => state.updateProgress);
  const complete = useGifStore((state) => state.complete);
  const setError = useGifStore((state) => state.setError);
  const previewImage = useConfigurationPanelStore(
    (state) => state.previewImage
  );
  const width = useConfigurationPanelStore((state) => state.width);
  const height = useConfigurationPanelStore((state) => state.height);

  useEffect(() => {
    // Establish a long-lived connection to the content script
    // This signals that the popup is open, and the content script can
    // enforce the video pause state.
    const port = browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs[0]?.id) {
          return browser.tabs.connect(tabs[0].id, {
            name: 'GIFIT_POPUP_CONTEXT'
          });
        }
      });

    return () => {
      port.then((p) => p?.disconnect());
    };
  }, []);

  // Listen for messages from content script
  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (message.type === 'GIF_PROGRESS') {
        updateProgress(
          message.progress,
          message.frameCount,
          message.frameDataUrl
        );
      } else if (message.type === 'GIF_COMPLETE') {
        complete(message.data);
        setStatus('generated');
      } else if (message.type === 'GIF_ERROR') {
        setError(message.error);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [updateProgress, complete, setError, setStatus]);

  const handleSubmit = useCallback(
    async function handleSubmit(config: ConfigState) {
      const start = config.start; // ms
      const end = start + config.duration; // ms
      const name = await getVideoTitle();

      createGif({
        name,
        quality: config.quality,
        width: config.width,
        height: config.height,
        start,
        end,
        fps: config.framerate
      });

      setName(name);
      setStatus('generating');
    },
    [createGif, setName, setStatus]
  );

  const currentFrame = useGifStore((state) => state.currentFrame);
  const result = useGifStore((state) => state.result);

  let currentPreviewImage = previewImage;
  if (status === 'generating') {
    currentPreviewImage = currentFrame ?? previewImage;
  } else if (status === 'generated') {
    currentPreviewImage = result?.dataUrl ?? previewImage;
  }

  return (
    <div className={css.app} data-status={status}>
      <header>
        <AppLogo />
      </header>
      <main className={css.main}>
        <section className={css.preview}>
          <GifPreview
            previewImage={currentPreviewImage}
            width={width}
            height={height}
            status={status}
          />
        </section>

        <section className={css.panel} aria-live="polite">
          {status === 'configuring' && (
            <div className={css.configuring}>
              <ConfigurationPanel onSubmit={handleSubmit} />
            </div>
          )}
          {status === 'generating' && (
            <div className={css.processing}>
              <ProcessingPanel />
            </div>
          )}
          {status === 'generated' && (
            <div className={css.generated}>
              <ResultPanel />
            </div>
          )}
        </section>
      </main>
      <footer className={css.footer}>
        <a
          className={css.credit}
          href="https://kempf.dev/#gifit"
          target="_blank"
          rel="noreferrer">
          Crafted by <img className={css.tkLogo} src={TKLogo} />
        </a>
        <span className={css.version}>v3.0.0</span>
      </footer>
    </div>
  );
}
