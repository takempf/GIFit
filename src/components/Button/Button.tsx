import css from './Button.module.css'; // Import CSS Module

import React from 'react';
import cx from 'classnames';

// Define the props interface
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode; // Content inside the button
  variant?: 'primary' | 'secondary' | 'ghost'; // Style variant
  size?: 'x-small' | 'small' | 'medium' | 'large'; // Size variant
  rounded?: boolean;
  noPadding?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>; // Click handler
  // Allow any other standard button attributes like 'type', 'disabled', 'aria-label', etc.
}

export function Button({
  children,
  variant = 'primary', // Default variant
  size = 'medium', // Default size
  rounded = false,
  className, // Allow passing custom classes
  disabled = false,
  noPadding = false,
  type = 'button', // Default type
  onClick,
  ...rest // Capture remaining props
}: ButtonProps) {
  // Combine CSS module classes based on props
  const buttonClasses = cx(
    css.button,
    css[variant],
    css[size],
    {
      [css.rounded]: rounded,
      [css.noPadding]: noPadding,
      [css.disabled]: disabled
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
      {children}
    </button>
  );
}
