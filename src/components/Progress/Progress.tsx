import css from './Progress.module.css';

import { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';
import { times } from '@/utils/times';
import { getClosestGridDimensions } from '@/utils/getClosestGridDimensions';

import { Button } from '../Button/Button';

const DEFAULT_IMAGE_DISPLAY_WIDTH = 240;

interface ImageInfo {
  blob: Blob;
  height: number;
  width: number;
}

interface ProgressProps {}

const chunkVariants = {
  initial: {
    x: -200,
    y: -200,
    opacity: 0.25,
    scale: 2
  },
  collated: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 0.75
  },
  processed: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1.01
  }
};

export function Progress({}: ProgressProps) {
  const setStatus = useAppStore((state) => state.setStatus);
  const colors = useGifStore((state) => state.colors);
  const result = useGifStore((state) => state.result);
  const processedFrameCount = useGifStore((state) => state.processedFrameCount);
  const frameCount = useGifStore((state) => state.frameCount);
  const width = useGifStore((state) => state.width);
  const height = useGifStore((state) => state.height);
  const [gridColumnsLength, getGridRowsLength] = getClosestGridDimensions(
    width,
    height,
    frameCount
  );

  const imageUrl: string | undefined =
    result?.blob && URL.createObjectURL(result.blob);

  // Calculate image dimensions and create object URL if image exists
  // Ensure width is positive to avoid division by zero
  const imageDisplayHeight = DEFAULT_IMAGE_DISPLAY_WIDTH * (height / width);
  const progressElementsStyle: CSSProperties | undefined = {
    width: `${DEFAULT_IMAGE_DISPLAY_WIDTH}px`,
    height: imageDisplayHeight
  };

  const downloadFilename = `gifit_${Date.now()}.gif`;

  function handleCloseClick() {
    setStatus('configuring');
  }

  return (
    <div className={css.gifitProgress}>
      <div className={css.details}>
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
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    mass: 1
                  }}
                  style={{
                    backgroundColor: colors[2]
                  }}
                />
              ))}
            </ul>
            {imageUrl && (
              <motion.img
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
                transition={{ delay: 0.5 }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        <div className={css.actions}>
          <Button
            className={css.close}
            size="medium"
            variant="secondary"
            onClick={handleCloseClick}>
            Close
          </Button>
          <a
            className={css.save}
            href={imageUrl}
            download={downloadFilename}
            onClick={(e) => !imageUrl && e.preventDefault()}
            aria-disabled={!imageUrl}>
            <Button size="medium">Download GIF</Button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Progress;
