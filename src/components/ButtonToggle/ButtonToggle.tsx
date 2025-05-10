import cx from 'classnames';

import { Button } from '../Button/Button';

import css from './ButtonToggle.module.css';

interface ButtonToggleProps {
  children: React.ReactNode;
  className: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ButtonToggle({
  children,
  className,
  value,
  onChange,
  ...restProps
}: ButtonToggleProps) {
  return (
    <Button className={cx(css.button, className)} {...restProps}>
      {children}
      <input
        className={css.checkbox}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </Button>
  );
}
