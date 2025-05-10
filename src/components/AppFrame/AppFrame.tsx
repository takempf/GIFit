import { motion } from 'motion/react';

import css from './AppFrame.module.css';

interface AppFrameProps {
  children: React.ReactNode;
}

export function AppFrame({ children }: AppFrameProps) {
  return (
    <motion.div
      className={css.appFrame}
      layoutId="appFrame"
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.5 }}>
      {children}
    </motion.div>
  );
}
