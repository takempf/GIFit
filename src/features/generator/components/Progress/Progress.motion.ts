import { Variants, Transition } from 'framer-motion';

const SHAKE_DURATION = 0.4; // seconds

/**
 * Transition settings for the individual frame chunks.
 */
export const chunkTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8
};

/**
 * Generates variants for the frame chunks.
 * Each chunk flies in from a random off-screen position toward the center.
 * @param startX - Starting X offset from center.
 * @param startY - Starting Y offset from center.
 * @returns The variants for the chunk elements.
 */
export const getChunkVariants = (startX: number, startY: number): Variants => ({
  initial: {
    x: startX,
    y: startY,
    opacity: 0,
    scale: 0.5
  },
  collated: {
    x: 0,
    y: 0,
    opacity: [0, 1, 1, 0],
    scale: 1,
    transition: {
      x: chunkTransition,
      y: chunkTransition,
      scale: chunkTransition,
      opacity: {
        duration: 0.8,
        times: [0, 0.3, 0.7, 1],
        ease: 'easeOut'
      }
    }
  },
  processed: {
    x: 0,
    y: 0,
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2
    }
  }
});

/**
 * Transition for the circle growing phase.
 */
export const circleGrowingTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
  mass: 1
};

/**
 * Transition for the circle morph phase (to GIF aspect ratio).
 */
export const circleMorphTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 1
};

/**
 * Variants for the resulting GIF image.
 */
export const resultImageVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1
  },
  exit: {
    opacity: 0
  }
};

/**
 * Transition settings for the resulting GIF image.
 */
export const resultImageTransition: Transition = {
  delay: SHAKE_DURATION + 0.1, // Wait for shake to finish, plus slight offset
  duration: 0.5,
  ease: 'easeOut'
};

/**
 * Generates a deterministic off-screen starting position for a chunk.
 * Uses the golden angle to distribute chunks evenly from all directions.
 * @param index - The chunk index (used as seed for position).
 * @param radius - The distance from center to spawn.
 */
export function getRandomOffScreenPosition(
  index: number,
  radius: number
): { x: number; y: number } {
  // Golden angle in radians for even distribution
  const goldenAngle = 137.5 * (Math.PI / 180);
  const angle = index * goldenAngle;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

export const SHAKE_DURATION_MS = SHAKE_DURATION * 1000;
