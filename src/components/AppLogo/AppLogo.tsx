import GIFitLogo from '@/assets/gifit-logo.svg?react';

import css from './AppLogo.module.css';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className: _className, ...restProps }: AppLogoProps) {
  return (
    <span className={css.appLogo} {...restProps}>
      <GIFitLogo className={css.logo} />
    </span>
  );
}
