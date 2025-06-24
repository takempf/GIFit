import cx from 'classnames';

import { Button } from '../Button/Button';
import type { ButtonProps } from '../Button/Button';

import css from './ButtonToggle.module.css';

type CleanButtonProps = Omit<ButtonProps, 'onChange'>;

interface ButtonToggleProps extends CleanButtonProps {
  children: React.ReactNode;
  className: string;
  checked: boolean;
  name: string;
  onChange: (value: boolean) => void;
}

export function ButtonToggle({
  children,
  className,
  checked,
  onChange,
  name,
  ...restProps
}: ButtonToggleProps) {
  return (
    <Button className={cx(css.button, className)} {...restProps}>
      {children}
      <input
        className={css.checkbox}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </Button>
  );
}
