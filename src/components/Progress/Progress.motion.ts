import { Variants } from 'framer-motion';

const RESULT_SHOW_DELAY = 0.5; // seconds

/**
 * Transition settings for the individual frame chunks.
 */
export const chunkTransition = {
  type: 'spring',
  stiffness: 600,
  damping: 40,
  mass: 1
};

/**
 * Generates variants for the frame chunks, as their initial
 * position depends on the video element's dimensions.
 * @param videoElementWidth - The width of the source video element.
 * @param videoElementHeight - The height of the source video element.
 * @returns The variants for the chunk elements.
 */
export const getChunkVariants = (
  videoElementWidth: number,
  videoElementHeight: number
): Variants => ({
  initial: {
    x: 210 + (-1 * videoElementWidth) / 2, // PROGRESS_FIXED_HORIZONTAL_CENTER
    y: -120 + -1 * videoElementHeight * 0.25, // PROGRESS_FIXED_VERTICAL_CENTER
    opacity: 0.1,
    scale: 3,
    borderRadius: '0.5em'
  },
  collated: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 0.9,
    borderRadius: '0.2em'
  },
  processed: {
    x: 0,
    y: 0,
    opacity: 0,
    scale: 1,
    borderRadius: '0em',
    transition: {
      delay: RESULT_SHOW_DELAY
    }
  }
});

/**
 * Variants for the main progress container.
 */
export const progressContainerVariants: Variants = {
  initial: { scale: 0.9 },
  animate: { scale: 1 },
  exit: { scale: 0.9, opacity: 0 }
};

/**
 * Transition settings for the main progress container.
 */
export const progressContainerTransition = {
  type: 'spring',
  stiffness: 450,
  damping: 20,
  mass: 1,
  delay: RESULT_SHOW_DELAY
};

/**
 * Variants for the resulting GIF image.
 */
export const resultImageVariants: Variants = {
  initial: {
    opacity: 0,
    boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px',
    y: '0px',
    scale: 1
  },
  animate: {
    opacity: 1,
    boxShadow: 'rgba(0, 0, 0, 0.25) 0px 20px 8px -10px',
    y: '-25px',
    scale: 1.2
  },
  exit: {
    opacity: 0,
    boxShadow: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px',
    y: '0px',
    scale: 1
  }
};

/**
 * Transition settings for the resulting GIF image.
 */
export const resultImageTransition = {
  delay: RESULT_SHOW_DELAY,
  type: 'spring',
  stiffness: 500,
  damping: 25,
  mass: 1
};
