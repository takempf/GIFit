import { motion } from 'motion/react';
import GIFitLogo from '@/assets/gifit-logo.svg?react';
import type { HTMLAttributes } from 'react';

import css from './AppLogo.module.css';

type AppLogoProps = HTMLAttributes<HTMLSpanElement>;
// No additional props needed for AppLogo beyond standard HTML attributes for a span

export function AppLogo({ ...restProps }: AppLogoProps) {
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
