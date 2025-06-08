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
  ...restProps // onClick from restProps will be overridden by the one below
}: ButtonToggleProps) {
  const handleClick = () => {
    onChange(!value);
  };

  return (
    <Button
      className={cx(css.button, className)}
      onClick={handleClick} // Added onClick to make the button itself toggle the state
      aria-pressed={value} // Add aria-pressed based on value
      {...restProps} // Ensure type="button" if not specified, or handle other interactive props
    >
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
