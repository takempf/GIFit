import css from './App.module.css';

import { useCallback } from 'react';

import { AppLogo } from './AppLogo/AppLogo';
import { ConfigurationPanel } from '../features/editor/components/ConfigurationPanel/ConfigurationPanel';
import { GifPreview } from '@/features/editor/components/GifPreview/GifPreview';
import { ProcessingPanel } from '@/features/editor/components/ProcessingPanel/ProcessingPanel';
import { ResultPanel } from '@/features/editor/components/ResultPanel/ResultPanel';

import { useAppStore } from '@/stores/appStore';
import { useConfigurationPanelStore, useGifStore } from '@/stores/storeContext';
import type { ConfigState } from '@/features/editor/stores/configurationPanelStore';

import TKLogo from '@/assets/tk.svg?react';
import BugIcon from '@/assets/bug.svg?react';

interface AppCoreProps {
  getVideoTitle: () => Promise<string>;
  /** Optional: hide the footer in demo context */
  hideFooter?: boolean;
}

export function AppCore({ getVideoTitle, hideFooter }: AppCoreProps) {
  const status = useAppStore((state) => state.status);
  const setStatus = useAppStore((state) => state.setStatus);
  const setName = useGifStore((state) => state.setName);
  const createGif = useGifStore((state) => state.createGif);
  const previewImage = useConfigurationPanelStore(
    (state) => state.previewImage
  );
  const width = useConfigurationPanelStore((state) => state.width);
  const height = useConfigurationPanelStore((state) => state.height);

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
    [createGif, setName, setStatus, getVideoTitle]
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
      {!hideFooter && (
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
          <span className={css.version}>v3.0.0</span>
        </footer>
      )}
    </div>
  );
}
