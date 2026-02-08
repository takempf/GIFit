import css from './Button.module.css';

import React from 'react';
import cx from 'classnames';

type ButtonOwnProps<E extends React.ElementType = 'button'> = {
  as?: E;
  children: React.ReactNode;
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'input' | 'outline';
  size?: 'x-small' | 'small' | 'medium' | 'large';
  padding?: 'none' | 'x-small' | 'small' | 'medium' | 'large';
  evenPadding?: boolean;
  rounded?: boolean;
  disabled?: boolean;
};

export type ButtonProps<E extends React.ElementType = 'button'> =
  ButtonOwnProps<E> &
    Omit<React.ComponentPropsWithoutRef<E>, keyof ButtonOwnProps<E>>;

export function Button<E extends React.ElementType = 'button'>({
  as,
  children,
  append,
  prepend,
  variant = 'primary',
  size = 'medium',
  rounded = false,
  className,
  disabled = false,
  padding = 'medium',
  evenPadding = false,
  ...rest
}: ButtonProps<E>): React.ReactElement {
  const Component = as ?? 'button';

  const buttonClasses = cx(
    css.button,
    css[variant],
    css[size],
    css[`padding_${padding}`],
    {
      [css.rounded]: rounded,
      [css.disabled]: disabled,
      [css.evenPadding]: evenPadding
    },
    className
  );

  const elementProps = {
    className: buttonClasses,
    disabled: Component === 'button' ? disabled : undefined,
    'aria-disabled': Component !== 'button' && disabled ? true : undefined,
    ...rest
  };

  return (
    <Component {...elementProps}>
      {prepend}
      {children}
      {append}
    </Component>
  );
}
