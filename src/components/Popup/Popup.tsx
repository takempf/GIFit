import css from './Popup.module.css';

import { useCallback } from 'react';
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

export function Popup({}: PopupProps) {
  const videoElement = useAppStore((state) => state.videoElement);
  const status = useAppStore((state) => state.status);
  const close = useAppStore((state) => state.close);
  const setStatus = useAppStore((state) => state.setStatus);
  const createGif = useGifStore((state) => state.createGif);
  const generationId = useGifStore((state) => state.generationId);

  const handleSubmit = useCallback(
    function handleSubmit(formValues) {
      if (!(videoElement instanceof HTMLVideoElement)) {
        log('Could not generate GIF because no video element was found.');
        return;
      }

      const start = formValues.start * 1000;
      const end = start + formValues.duration * 1000;

      createGif(
        {
          quality: formValues.quality,
          width: formValues.width,
          height: formValues.height,
          start,
          end,
          fps: formValues.framerate
        },
        videoElement
      );

      setStatus('generating');
    },
    [videoElement]
  );

  function handleCloseAppClick() {
    setStatus('configuring');
    close();
  }

  return (
    <motion.div
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
