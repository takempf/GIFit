import css from './Popup.module.css';

import { useCallback } from 'react';

import { log } from '@/utils/logger';
import { timecodeToSeconds } from '@/utils/timecodeToSeconds';
import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';

import ConfigurationPanel from '../ConfigurationPanel/ConfigurationPanel';
import Progress from '../Progress/Progress';

interface PopupProps {}

export function Popup({}: PopupProps) {
  const videoElement = useAppStore((state) => state.videoElement);
  const createGif = useGifStore((state) => state.createGif);

  const handleSubmit = useCallback(
    function handleSubmit(formValues) {
      if (!(videoElement instanceof HTMLVideoElement)) {
        log('Could not generate GIF because no video element was found.');
        return;
      }

      createGif(
        {
          quality: formValues.quality,
          width: formValues.width,
          height: formValues.height,
          start: timecodeToSeconds(formValues.start) * 1000,
          end: timecodeToSeconds(formValues.end) * 1000,
          fps: formValues.framerate
        },
        videoElement
      );
    },
    [videoElement]
  );

  return (
    <div className={css.popup}>
      <Progress />
      <ConfigurationPanel onSubmit={handleSubmit} />
    </div>
  );
}
