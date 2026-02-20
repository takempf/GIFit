import css from './App.module.css';

import { useCallback, useEffect } from 'react';

import { AppLogo } from './AppLogo/AppLogo';
import { ConfigurationPanel } from '../features/editor/components/ConfigurationPanel/ConfigurationPanel';
import { GifPreview } from '@shared/features/editor/components/GifPreview/GifPreview';
import { ProcessingPanel } from '@shared/features/editor/components/ProcessingPanel/ProcessingPanel';
import { ResultPanel } from '@shared/features/editor/components/ResultPanel/ResultPanel';

import { useAppStore } from '@shared/stores/appStore';
import {
  // useConfigurationPanelStore,
  ConfigState
} from '@shared/features/editor/stores/configurationPanelStore';
import { useGifStore } from '@shared/features/generator/stores/gifGeneratorStore';
import { useConfigurationPanelStore } from '@shared/features/editor/stores/configurationPanelStore';

import TKLogo from '@shared/assets/tk.svg?react';
import BugIcon from '@shared/assets/bug.svg?react';

import { useAdapters, useAnalytics } from '@shared/adapters/context';

// We can just use ConfigState directly or Pick what we need.
// handleSubmit uses: start, duration, width, height, framerate (from fps alias?), quality.
// ConfigState has: start, duration, width, height, framerate, quality...
// Let's use ConfigState for the handler.

export function App() {
  const { gif: gifAdapter, getVideoTitle } = useAdapters();
  const analytics = useAnalytics();
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

  // Listen for messages from content script via adapter
  useEffect(() => {
    gifAdapter.setCallbacks({
      onProgress: (progress, frameCount, frameDataUrl, stage) => {
        updateProgress(progress, frameCount, frameDataUrl, stage);
      },
      onComplete: (data) => {
        complete(data);
        setStatus('generated');
      },
      onError: (error) => {
        setError(error);
      }
    });

    return () => {
      // Optional: clear callbacks or destroy adapter if needed
      // gifAdapter.destroy?.();
    };
  }, [gifAdapter, updateProgress, complete, setError, setStatus]);

  const handleSubmit = useCallback(
    async function handleSubmit(config: ConfigState) {
      const start = config.start; // ms
      const end = start + config.duration; // ms
      const name = await getVideoTitle();

      const gifConfig = {
        name,
        quality: config.quality,
        width: config.width,
        height: config.height,
        start,
        end,
        fps: config.framerate
      };

      // 1. Update UI state
      createGif(gifConfig);
      setName(name);
      analytics.track('gif_generation_started', gifConfig);
      setStatus('generating');

      // 2. Trigger generation via adapter
      try {
        await gifAdapter.createGif(gifConfig);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to start generation';
        setError(message);
      }
    },
    [
      createGif,
      setName,
      setStatus,
      gifAdapter,
      getVideoTitle,
      setError,
      analytics
    ]
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
          Crafted by <TKLogo className={css.tkLogo} />
        </a>
        <span className={css.support}>
          <BugIcon className={css.bugIcon} /> Please report issues on{' '}
          <a
            href="https://github.com/takempf/gifit/issues"
            target="_blank"
            rel="noreferrer">
            GitHub
          </a>
        </span>
        <a
          className={css.version}
          href="https://github.com/takempf/GIFit/releases"
          target="_blank"
          rel="noreferrer">
          v{__APP_VERSION__}
        </a>
      </footer>
    </div>
  );
}
