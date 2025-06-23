import css from './Input.module.css';

import cx from 'classnames';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  name: string;
  label: React.ReactNode;
  type?: HTMLInputElement['type'];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  ref: React.RefObject<HTMLInputElement | null>;
}

export function Input({
  className,
  prepend,
  append,
  name,
  label,
  type = 'text',
  value,
  onChange,
  ref,
  ...restProps
}: InputProps) {
  return (
    <div className={cx(css.input, className)}>
      {prepend}
      <label className={css.inputAndLabel}>
        <strong className={css.label}>{label}</strong>
        <input
          className={css.actualInput}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          {...restProps}
          ref={ref}
        />
      </label>
      {append}
    </div>
  );
}
