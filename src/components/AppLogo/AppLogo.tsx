import { motion } from 'motion/react';
import GIFitLogo from '@/assets/gifit-logo.svg';

import css from './AppLogo.module.css';

export function AppLogo() {
  return (
    <motion.img
      className={css.appLogo}
      src={GIFitLogo}
      layoutId="appLogo"
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.5 }}
      alt="Gifit Logo"
    />
  );
}
