import React from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import { Field } from '@base-ui/react/field';
import cx from 'classnames';

import css from './Input.module.css';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  name: string;
  label?: React.ReactNode;
  // We use the same interface for 'ref' as the original component
  // which expects a RefObject, although React 19 / Base UI might handle refs differently.
  // We'll pass it to BaseInput.
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({
  className,
  prepend,
  append,
  name,
  label,
  value,
  onChange,
  type = 'text',
  ref,
  ...restProps
}: InputProps) {
  return (
    <Field.Root className={cx(css.root, className)} data-has-label={!!label}>
      {label && <Field.Label className={css.label}>{label}</Field.Label>}
      <div className={css.inputWrapper}>
        {prepend && <div className={css.prepend}>{prepend}</div>}
        <BaseInput
          className={css.input}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          ref={ref}
          {...restProps}
        />
        {append && <div className={css.append}>{append}</div>}
      </div>
    </Field.Root>
  );
}
