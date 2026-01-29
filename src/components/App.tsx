import css from './App.module.css';

import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { browser } from 'wxt/browser';

import { AppLogo } from './AppLogo/AppLogo';
import { ConfigurationPanel } from './ConfigurationPanel/ConfigurationPanel';
import { Progress } from './Progress/Progress';

import { useAppStore } from '@/stores/appStore';
import { useConfigurationPanelStore } from '@/stores/configurationPanelStore';
import { useGifStore } from '@/stores/gifGeneratorStore';

import TKLogo from '@/assets/tk.svg';

import { ExtensionMessage } from '@/types';

interface FormValues {
  start: number;
  duration: number;
  width: number;
  height: number;
  linkDimensions: boolean;
  framerate: number;
  quality: number;
}

async function getVideoTitle() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const title = tabs[0]?.title ?? 'untitled';
  return title.replace(' - YouTube', '');
}

export function App() {
  const status = useAppStore((state) => state.status);
  const generationId = useGifStore((state) => state.generationId);
  // const close = useAppStore((state) => state.close); // AppStore close is irrelevant now
  const setStatus = useAppStore((state) => state.setStatus);
  const setName = useGifStore((state) => state.setName);
  const createGif = useGifStore((state) => state.createGif);
  const updateProgress = useGifStore((state) => state.updateProgress);
  const complete = useGifStore((state) => state.complete);
  const setError = useGifStore((state) => state.setError);
  const pauseVideo = useConfigurationPanelStore((state) => state.pauseVideo);

  useEffect(() => {
    pauseVideo();
  }, [pauseVideo]);

  // Listen for messages from content script
  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (message.type === 'GIF_PROGRESS') {
        updateProgress(
          message.progress,
          message.frameCount,
          message.thumbnailDataUrl
        );
      } else if (message.type === 'GIF_COMPLETE') {
        complete(message.data);
      } else if (message.type === 'GIF_ERROR') {
        setError(message.error);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [updateProgress, complete, setError]);

  const handleSubmit = useCallback(
    async function handleSubmit(formValues: FormValues) {
      const start = formValues.start * 1000; // seconds to ms
      const end = start + formValues.duration * 1000; // seconds to ms
      const name = await getVideoTitle();

      createGif({
        name,
        quality: formValues.quality,
        width: formValues.width,
        height: formValues.height,
        start,
        end,
        fps: formValues.framerate
      });

      setName(name);
      setStatus('generating');
    },
    [createGif, setName, setStatus]
  );

  return (
    <div className={css.app} data-status={status}>
      <header>
        <AppLogo />
      </header>
      <div className={css.container}>
        <section className={css.config}>
          <ConfigurationPanel onSubmit={handleSubmit} />
        </section>

        {status === 'generating' && (
          <section className={css.generation}>
            <Progress />
          </section>
        )}
      </div>
      <footer>
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
