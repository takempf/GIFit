import css from './Progress.module.css';

import { useEffect, useState, CSSProperties, use } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';
import { times } from '@/utils/times';
import { getClosestGridDimensions } from '@/utils/getClosestGridDimensions';
import { observeBoundingClientRect } from '@/utils/observeBoundingClientRect';

import { Button } from '../Button/Button';

import ArrowRightIcon from '@/assets/arrow-right.svg?react';
import ArrowDownIcon from '@/assets/arrow-down.svg?react';

const PROGRESS_FIXED_VERTICAL_CENTER = 120;
const PROGRESS_FIXED_HORIZONTAL_CENTER = 210;

interface ImageInfo {
  blob: Blob;
  height: number;
  width: number;
}

interface ProgressProps {}

const chunkTransition = {
  type: 'spring',
  stiffness: 600,
  damping: 40,
  mass: 1
};

export function Progress({}: ProgressProps) {
  const [videoElementWidth, setVideoElementWidth] = useState(0);
  const [videoElementHeight, setVideoElementHeight] = useState(0);
  const setStatus = useAppStore((state) => state.setStatus);
  const videoElement = useAppStore((state) => state.videoElement);
  const colors = useGifStore((state) => state.colors);
  const result = useGifStore((state) => state.result);
  const processedFrameCount = useGifStore((state) => state.processedFrameCount);
  const frameCount = useGifStore((state) => state.frameCount);
  const width = useGifStore((state) => state.width);
  const height = useGifStore((state) => state.height);
  const name = useGifStore((state) => state.name);
  const reset = useGifStore((state) => state.reset);
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
    if (!videoElement) {
      return;
    }

    function handleVideoBoundingChange(rect: DOMRect) {
      const { width, height } = rect;
      setVideoElementWidth(width);
      setVideoElementHeight(height);
    }

    const cancelObserveBoundingClientRect = observeBoundingClientRect(
      videoElement,
      handleVideoBoundingChange
    );

    return () => {
      cancelObserveBoundingClientRect();
    };
  }, [videoElement]);

  function handleCloseClick() {
    setStatus('configuring');
    reset();
  }

  const chunkVariants = {
    initial: {
      x: PROGRESS_FIXED_HORIZONTAL_CENTER + (-1 * videoElementWidth) / 2,
      y: -PROGRESS_FIXED_VERTICAL_CENTER + -1 * videoElementHeight * 0.25,
      opacity: 0.1,
      scale: 3,
      borderRadius: '0.5em'
    },
    collated: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 0.75,
      borderRadius: '0.2em'
    },
    processed: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      borderRadius: '0em'
    }
  };

  return (
    <div className={css.gifitProgress}>
      <motion.div
        className={css.elements}
        style={progressElementsStyle}
        initial={{ scale: 0.9 }}
        animate={{ scale: imageUrl ? 1 : 0.9 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 20,
          mass: 1,
          delay: 0.5
        }}>
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
                  backgroundColor: colors[2]
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
              initial={{
                opacity: 0,
                boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px'
              }}
              animate={{
                opacity: 1,
                boxShadow: 'rgba(0, 0, 0, 0.25) 0px 8px 6px -3px'
              }}
              exit={{
                opacity: 0,
                boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px'
              }}
              transition={{
                delay: 0.5,
                type: 'spring',
                stiffness: 500,
                damping: 15,
                mass: 1
              }}
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
            append={<ArrowDownIcon className={css.icon} />}>
            Download GIF
          </Button>
        </a>
      </div>
    </div>
  );
}

export default Progress;
