import css from './Spinner.module.css';

import cx from 'classnames';

interface SpinnerProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function Spinner({ className, size = 'medium' }: SpinnerProps) {
  return (
    <span
      className={cx(css.spinner, className)}
      data-size={size}
      role="status"
      aria-label="Loading"
    />
  );
}
