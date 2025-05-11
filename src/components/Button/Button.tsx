import css from './Button.module.css'; // Import CSS Module

import React from 'react';
import cx from 'classnames';

// Define the props interface
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode; // Content inside the button
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  className?: string; // Allow passing custom classes
  variant?: 'primary' | 'secondary' | 'ghost' | 'input'; // Style variant
  size?: 'x-small' | 'small' | 'medium' | 'large'; // Size variant
  padding?: 'none' | 'x-small' | 'small' | 'medium' | 'large'; // Padding variant
  evenPadding?: boolean;
  rounded?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>; // Click handler
  // Allow any other standard button attributes like 'type', 'disabled', 'aria-label', etc.
}

export function Button({
  children,
  append,
  prepend,
  variant = 'primary', // Default variant
  size = 'medium', // Default size
  rounded = false,
  className, // Allow passing custom classes
  disabled = false,
  padding = 'medium',
  evenPadding = false,
  type = 'button', // Default type
  onClick,
  ...rest // Capture remaining props
}: ButtonProps) {
  // Combine CSS module classes based on props
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

  return (
    <button
      className={buttonClasses}
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest} // Spread remaining props (important for accessibility attributes like aria-label)
    >
      {prepend}
      {children}
      {append}
    </button>
  );
}
