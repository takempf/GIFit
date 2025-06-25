import css from './Popup.module.css';

import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { log } from '@/utils/logger';
import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';

import ConfigurationPanel from '../ConfigurationPanel/ConfigurationPanel';
import Progress from '../Progress/Progress';
import { Button } from '../Button/Button';
import { AppLogo } from '../AppLogo/AppLogo';
import { AppFrame } from '../AppFrame/AppFrame';

import TKLogo from '@/assets/tk.svg';

interface PopupProps {}

interface FormValues {
  start: number;
  duration: number;
  width: number;
  height: number;
  linkDimensions: boolean;
  framerate: number;
  quality: number;
}

export function Popup({}: PopupProps) {
  const popupElementRef: React.RefObject<HTMLDivElement | null> = useRef(null);
  const videoElement = useAppStore((state) => state.videoElement);
  const status = useAppStore((state) => state.status);
  const generationId = useGifStore((state) => state.generationId);
  const close = useAppStore((state) => state.close);
  const setStatus = useAppStore((state) => state.setStatus);
  const setName = useGifStore((state) => state.setName);
  const createGif = useGifStore((state) => state.createGif);
  const reset = useGifStore((state) => state.reset);

  useEffect(() => {
    const popupElement = popupElementRef.current;
    if (popupElement) {
      popupElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleSubmit = useCallback(
    function handleSubmit(formValues: FormValues) {
      if (!(videoElement instanceof HTMLVideoElement)) {
        log('Could not generate GIF because no video element was found.');
        return;
      }

      const start = formValues.start * 1000; // seconds to ms
      const end = start + formValues.duration * 1000; // seconds to ms
      const titleElement: HTMLElement | null = document.querySelector('#title');
      const name = titleElement?.innerText ?? 'untitled';

      createGif(
        {
          name,
          quality: formValues.quality,
          width: formValues.width,
          height: formValues.height,
          start,
          end,
          fps: formValues.framerate
        },
        videoElement
      );

      setName(name);
      setStatus('generating');
    },
    [videoElement]
  );

  function handleCloseAppClick() {
    reset();
    close();
  }

  return (
    <motion.div
      ref={popupElementRef}
      className={css.popup}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}>
      <AppFrame>
        <header>
          <AppLogo />
          <Button
            className={css.close}
            size="small"
            variant="ghost"
            rounded={true}
            onClick={handleCloseAppClick}>
            ✕
          </Button>
        </header>
        <div className={css.container}>
          <section className={css.config}>
            <ConfigurationPanel onSubmit={handleSubmit} />
          </section>
          <AnimatePresence>
            {status === 'generating' && (
              <motion.section
                key={`generation_${generationId}`}
                className={css.generation}
                initial={{ opacity: 0, pointerEvents: 'none' }}
                animate={{ opacity: 1, pointerEvents: 'unset' }}
                exit={{ opacity: 0, pointerEvents: 'none' }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  mass: 1
                }}>
                <Progress />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
        <footer>
          <a
            className={css.credit}
            href="https://kempf.dev/#gifit"
            target="_blank">
            Crafted by <img className={css.tkLogo} src={TKLogo} />
          </a>
          <span className={css.version}>v3.0.0</span>
        </footer>
      </AppFrame>
    </motion.div>
  );
}
