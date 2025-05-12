import { motion } from 'motion/react';
import cx from 'classnames';

import css from './AppFrame.module.css';

interface AppFrameProps {
  children: React.ReactNode;
  variant?: 'attached' | 'detached';
}

export function AppFrame({ children, variant = 'detached' }: AppFrameProps) {
  return (
    <motion.div
      className={cx(css.appFrame, css[variant])}
      layoutId="appFrame"
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.5 }}>
      {children}
    </motion.div>
  );
}
