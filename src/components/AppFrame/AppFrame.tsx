import { motion } from 'motion/react';
import cx from 'classnames';

import css from './AppFrame.module.css';

interface AppFrameProps {
  children: React.ReactNode;
  variant?: 'attached' | 'detached';
}

const initialBoxShadow = 'oklch(0 0 0 / 0) 0 3px 2px -1px';
const openBoxShadow = 'oklch(0 0 0 / 0.45) 0 30px 15px -20px';

const motionVariants = {
  attached: {
    boxShadow: initialBoxShadow
  },
  detached: {
    boxShadow: openBoxShadow
  }
};

export function AppFrame({ children, variant = 'detached' }: AppFrameProps) {
  return (
    <motion.div
      className={cx(css.appFrame, css[variant])}
      variants={motionVariants}
      animate={variant}
      layoutId="appFrame"
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.5 }}>
      {children}
    </motion.div>
  );
}
