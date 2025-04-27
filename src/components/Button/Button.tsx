import css from './Button.module.css'; // Import CSS Module

import React from 'react';
import cx from 'classnames';

// Define the props interface
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode; // Content inside the button
  variant?: 'primary' | 'secondary'; // Style variant
  size?: 'small' | 'medium' | 'large'; // Size variant
  onClick?: React.MouseEventHandler<HTMLButtonElement>; // Click handler
  // Allow any other standard button attributes like 'type', 'disabled', 'aria-label', etc.
}

export function Button({
  children,
  variant = 'primary', // Default variant
  size = 'medium', // Default size
  className, // Allow passing custom classes
  disabled = false,
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
