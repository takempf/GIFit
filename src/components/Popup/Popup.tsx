import css from './Popup.module.css';

import { useCallback } from 'react';
import { motion } from 'motion/react';

import { log } from '@/utils/logger';
import { timecodeToSeconds } from '@/utils/timecodeToSeconds';
import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';

import ConfigurationPanel from '../ConfigurationPanel/ConfigurationPanel';
import Progress from '../Progress/Progress';
import { Button } from '../Button/Button';

interface PopupProps {}

export function Popup({}: PopupProps) {
  const videoElement = useAppStore((state) => state.videoElement);
  const status = useAppStore((state) => state.status);
  const close = useAppStore((state) => state.close);
  const setStatus = useAppStore((state) => state.setStatus);
  const createGif = useGifStore((state) => state.createGif);

  const handleSubmit = useCallback(
    function handleSubmit(formValues) {
      if (!(videoElement instanceof HTMLVideoElement)) {
        log('Could not generate GIF because no video element was found.');
        return;
      }

      const start = timecodeToSeconds(formValues.start) * 1000;
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

  function handleCloseClick() {
    setStatus('configuring');
  }

  function handleCloseAppClick() {
    close();
  }

  return (
    <motion.div
      className={css.popup}
      style={{ transformOrigin: 'top right' }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}>
      <div className={css.container}>
        <section className={css.header}>
          <strong className={css.title}>GIFit</strong>
        </section>
        <section className={css.config}>
          <ConfigurationPanel onSubmit={handleSubmit} />
        </section>
        {status === 'generating' && (
          <section className={css.generation}>
            <Button
              className={css.close}
              size="small"
              onClick={handleCloseClick}>
              Close
            </Button>
            <Progress />
          </section>
        )}
      </div>

      <Button
        className={css.close}
        size="small"
        variant="secondary"
        rounded={true}
        onClick={handleCloseAppClick}>
        ✕
      </Button>
    </motion.div>
  );
}
