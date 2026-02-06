import css from './Progress.module.css';

import { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';

import { Button } from '@/components/ui/Button/Button';
import {
  getChunkVariants,
  chunkTransition,
  circleGrowingTransition,
  circleMorphTransition,
  resultImageVariants,
  resultImageTransition,
  getRandomOffScreenPosition,
  SHAKE_DURATION_MS
} from './Progress.motion.ts';

import ArrowRightIcon from '@/assets/arrow-right.svg?react';
import ArrowDownIcon from '@/assets/arrow-down.svg?react';

const CIRCLE_BASE_SIZE = 40;
const MAX_GIF_DISPLAY_SIZE = 300;
const CHUNK_SPAWN_RADIUS = 300;

type AnimationPhase = 'processing' | 'shaking' | 'morphing' | 'complete';

export function Progress() {
  const setStatus = useAppStore((state) => state.setStatus);
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

  const [animationPhase, setAnimationPhase] =
    useState<AnimationPhase>('processing');

  const imageUrl: string | undefined = result?.dataUrl;
  const downloadFilename = `${name}.gif`;
  const progress = frameCount > 0 ? processedFrameCount / frameCount : 0;
  const isComplete = processedFrameCount === frameCount && frameCount > 0;

  // Calculate final GIF display dimensions (fit within max size while preserving aspect ratio)
  const getFinalDimensions = () => {
    if (!width || !height)
      return { width: MAX_GIF_DISPLAY_SIZE, height: MAX_GIF_DISPLAY_SIZE };

    const scale = Math.min(
      MAX_GIF_DISPLAY_SIZE / width,
      MAX_GIF_DISPLAY_SIZE / height
    );
    return {
      width: width * scale,
      height: height * scale
    };
  };

  const finalDimensions = getFinalDimensions();
  const circleTargetSize = (finalDimensions.width + finalDimensions.height) / 2;

  // Calculate circle size based on progress
  const circleSize =
    CIRCLE_BASE_SIZE + (circleTargetSize - CIRCLE_BASE_SIZE) * progress;

  // Memoize chunk positions so they don't change on re-render
  const chunkPositions = useMemo(() => {
    return Array.from({ length: frameCount }, (_, i) =>
      getRandomOffScreenPosition(i, CHUNK_SPAWN_RADIUS)
    );
  }, [frameCount]);

  // Handle animation phase transitions
  // Processing -> Shaking transition
  useEffect(() => {
    if (isComplete && animationPhase === 'processing') {
      setAnimationPhase('shaking');
    }
  }, [isComplete, animationPhase]);

  // Shaking -> Morphing transition
  useEffect(() => {
    if (animationPhase === 'shaking') {
      const shakeTimer = setTimeout(() => {
        setAnimationPhase('morphing');
      }, SHAKE_DURATION_MS);

      return () => clearTimeout(shakeTimer);
    }
  }, [animationPhase]);

  useEffect(() => {
    if (imageUrl && animationPhase === 'morphing') {
      setAnimationPhase('complete');
    }
  }, [imageUrl, animationPhase]);

  // Reset animation phase when starting over
  useEffect(() => {
    if (processedFrameCount === 0) {
      setAnimationPhase('processing');
    }
  }, [processedFrameCount]);

  function handleCloseClick() {
    setStatus('configuring');
    reset();
  }

  const isShaking = animationPhase === 'shaking';
  const isMorphing =
    animationPhase === 'morphing' || animationPhase === 'complete';

  return (
    <div className={css.gifitProgress} data-testid="progress">
      <div className={css.elements}>
        {/* Central accumulating circle */}
        <motion.div
          className={`${css.circle} ${isShaking ? css.shake : ''} ${isMorphing ? css.morphing : ''}`}
          initial={{ borderRadius: '50%' }}
          animate={{
            borderRadius: isMorphing ? '0%' : '50%',
            scale: isMorphing ? 1 : progress
          }}
          style={{
            width: finalDimensions.width,
            height: finalDimensions.height
          }}
          transition={
            isMorphing ? circleMorphTransition : circleGrowingTransition
          }>
          {/* Result GIF */}
          <AnimatePresence>
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

        {/* Flying chunks container */}
        <div className={css.chunksContainer}>
          <AnimatePresence>
            {!isMorphing &&
              Array.from({ length: processedFrameCount }, (_, i) => {
                const pos = chunkPositions[i] ?? { x: 0, y: 0 };
                const variants = getChunkVariants(pos.x, pos.y);

                return (
                  <motion.div
                    key={i}
                    className={css.chunk}
                    variants={variants}
                    initial="initial"
                    animate="collated"
                    exit="processed"
                    transition={chunkTransition}
                    style={{
                      backgroundImage: frameData[i]
                        ? `url(${frameData[i]})`
                        : undefined
                    }}
                  />
                );
              })}
          </AnimatePresence>
        </div>
      </div>

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

export { Progress as default };
