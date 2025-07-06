import css from './Progress.module.css';

import { useEffect, useState, CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';
import { times } from '@/utils/times';
import { getClosestGridDimensions } from '@/utils/getClosestGridDimensions';
import { observeBoundingClientRect } from '@/utils/observeBoundingClientRect';

import { Button } from '../Button/Button';
import {
  getChunkVariants,
  chunkTransition,
  progressContainerVariants,
  progressContainerTransition,
  resultImageVariants,
  resultImageTransition
} from './Progress.motion.ts'; // ✨ Import the variants

import ArrowRightIcon from '@/assets/arrow-right.svg?react';
import ArrowDownIcon from '@/assets/arrow-down.svg?react';

export function Progress() {
  const [videoElementWidth, setVideoElementWidth] = useState(0);
  const [videoElementHeight, setVideoElementHeight] = useState(0);

  const setStatus = useAppStore((state) => state.setStatus);
  const videoElement = useAppStore((state) => state.videoElement);
  const {
    result,
    processedFrameCount,
    frameCount,
    frameData,
    width,
    height,
    name,
    reset
  } = useGifStore();
  const [gridColumnsLength, getGridRowsLength] = getClosestGridDimensions(
    width,
    height,
    frameCount
  );

  const imageUrl: string | undefined =
    result?.blob && URL.createObjectURL(result.blob);
  const progressElementsStyle: CSSProperties | undefined = {
    aspectRatio: `auto ${width} / ${height}`
  };
  const downloadFilename = `${name}.gif`;

  useEffect(() => {
    if (!videoElement) return;

    const unobserve = observeBoundingClientRect(videoElement, (rect) => {
      setVideoElementWidth(rect.width);
      setVideoElementHeight(rect.height);
    });

    return () => unobserve();
  }, [videoElement]);

  function handleCloseClick() {
    setStatus('configuring');
    reset();
  }

  // ✨ Get variants by calling the function with the component's state
  const chunkVariants = getChunkVariants(videoElementWidth, videoElementHeight);

  return (
    <div className={css.gifitProgress} data-testid="progress">
      <motion.div
        className={css.elements}
        style={progressElementsStyle}
        variants={progressContainerVariants}
        initial="initial"
        animate={imageUrl ? 'animate' : 'initial'}
        exit="exit"
        transition={progressContainerTransition}>
        <AnimatePresence>
          <ul
            key="chunks"
            className={css.chunkGrid}
            style={{
              gridTemplateColumns: `repeat(${gridColumnsLength}, 1fr)`,
              gridTemplateRows: `repeat(${getGridRowsLength}, 1fr)`
            }}>
            {times(processedFrameCount, (i) => (
              <motion.li
                key={i}
                className={css.chunk}
                variants={chunkVariants}
                initial="initial"
                animate={imageUrl ? 'processed' : 'collated'}
                transition={chunkTransition}
                style={{
                  backgroundImage: `url(${frameData[i]})`
                }}
              />
            ))}
          </ul>
          {imageUrl && (
            <motion.img
              key="result"
              className={css.result}
              src={imageUrl}
              alt="Generated GIF preview"
              data-testid="result-image"
              variants={resultImageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={resultImageTransition}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <div className={css.actions}>
        <Button
          className={css.close}
          size="small"
          variant="secondary"
          rounded={true}
          onClick={handleCloseClick}
          data-testid="back-to-config-button"
          prepend={
            <ArrowRightIcon className={css.icon} style={{ rotate: '180deg' }} />
          }>
          Back
        </Button>
        <a
          className={css.save}
          href={imageUrl}
          download={downloadFilename}
          onClick={(e) => !imageUrl && e.preventDefault()}
          aria-disabled={!imageUrl}>
          <Button
            size="small"
            rounded={true}
            disabled={!imageUrl}
            data-testid="download-gif-button"
            append={<ArrowDownIcon className={css.icon} />}>
            Download GIF
          </Button>
        </a>
      </div>
    </div>
  );
}

export default Progress;
