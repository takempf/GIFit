import { motion } from 'motion/react';
import GIFitLogo from '@/assets/gifit-logo.svg?react';

import css from './AppLogo.module.css';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className: _className, ...restProps }: AppLogoProps) {
  return (
    <motion.span
      className={css.appLogo}
      layoutId="appLogo"
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.5 }}
      {...restProps}>
      <GIFitLogo className={css.logo} />
    </motion.span>
  );
}
