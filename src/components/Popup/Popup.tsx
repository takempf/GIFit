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
  const status = useGifStore((state) => state.status);
  const processedFrameCount = useGifStore((state) => state.processedFrameCount);
  const result = useGifStore((state) => state.result);
  const createGif = useGifStore((state) => state.createGif);

  console.log(result);

  const handleSubmit = useCallback(
    function handleSubmit(formValues) {
      if (!(videoElement instanceof HTMLVideoElement)) {
        log('Could not generate GIF because no video element was found.');
        return;
      }

      log('Creating GIF with user specified GIF options', formValues);
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
      <div>
        <strong>Status</strong>: {status}
      </div>
      <div>
        <strong>Processed frames</strong>: {processedFrameCount}
      </div>
      <Progress />
      <ConfigurationPanel onSubmit={handleSubmit} />
    </div>
  );
}
