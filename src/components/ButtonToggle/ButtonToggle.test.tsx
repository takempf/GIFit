import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ButtonToggle } from './ButtonToggle';

describe('ButtonToggle', () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    value: false,
    onChange: mockOnChange,
    className: 'custom-toggle' // Added className as it's a required prop in the interface
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render children correctly', () => {
    render(<ButtonToggle {...defaultProps}>Toggle Me</ButtonToggle>);
    expect(
      screen.getByRole('button', { name: /Toggle Me/i })
    ).toBeInTheDocument();
    // The input checkbox is visually hidden but should exist for accessibility/forms
    expect(screen.getByRole('checkbox', { hidden: true })).toBeInTheDocument();
  });

  it('should call onChange with the new value when the button is clicked (toggling from false to true)', async () => {
    render(
      <ButtonToggle {...defaultProps} value={false}>
        Toggle Me
      </ButtonToggle>
    );
    const buttonElement = screen.getByRole('button', { name: /Toggle Me/i });
    await userEvent.click(buttonElement);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(true); // false -> true
  });

  it('should call onChange with the new value when the button is clicked (toggling from true to false)', async () => {
    render(
      <ButtonToggle {...defaultProps} value={true}>
        Toggle Me
      </ButtonToggle>
    );
    const buttonElement = screen.getByRole('button', { name: /Toggle Me/i });
    await userEvent.click(buttonElement);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(false); // true -> false
  });

  it('should reflect the value prop in the hidden checkbox state', () => {
    const { rerender } = render(
      <ButtonToggle {...defaultProps} value={true}>
        Checked
      </ButtonToggle>
    );
    const checkbox = screen.getByRole('checkbox', {
      hidden: true
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    rerender(
      <ButtonToggle {...defaultProps} value={false}>
        Unchecked
      </ButtonToggle>
    );
    expect(checkbox.checked).toBe(false); // Re-query or ensure component updates
    const updatedCheckbox = screen.getByRole('checkbox', {
      hidden: true
    }) as HTMLInputElement;
    expect(updatedCheckbox.checked).toBe(false);
  });

  it('should be disabled when the disabled prop (passed via ...restProps) is true', async () => {
    render(
      <ButtonToggle {...defaultProps} disabled>
        Disabled Toggle
      </ButtonToggle>
    );
    const buttonElement = screen.getByRole('button', {
      name: /Disabled Toggle/i
    });
    expect(buttonElement).toBeDisabled();

    // Check if hidden checkbox is also disabled
    const checkbox = screen.getByRole('checkbox', {
      hidden: true
    }) as HTMLInputElement;
    expect(checkbox).toBeDisabled();

    await userEvent.click(buttonElement).catch(() => {}); // userEvent might throw on disabled elements
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should apply custom className to the underlying Button', () => {
    render(
      <ButtonToggle {...defaultProps} className="my-custom-class">
        Classy Toggle
      </ButtonToggle>
    );
    const buttonElement = screen.getByRole('button', {
      name: /Classy Toggle/i
    });
    expect(buttonElement).toHaveClass('my-custom-class');
    expect(buttonElement).toHaveClass(/button/); // from ButtonToggle's css.button
  });

  it('should have aria-pressed attribute on the button reflecting the value', () => {
    const { rerender } = render(
      <ButtonToggle {...defaultProps} value={true}>
        Pressed
      </ButtonToggle>
    );
    let buttonElement = screen.getByRole('button', { name: /Pressed/i });
    expect(buttonElement).toHaveAttribute('aria-pressed', 'true');

    rerender(
      <ButtonToggle {...defaultProps} value={false}>
        Not Pressed
      </ButtonToggle>
    );
    buttonElement = screen.getByRole('button', { name: /Not Pressed/i });
    expect(buttonElement).toHaveAttribute('aria-pressed', 'false');
  });

  // The hidden checkbox handles the actual `checked` state for forms,
  // while the button's `aria-pressed` indicates the toggle state to assistive technologies.
  // The Button component itself handles its own ARIA roles if it's just a button.
  // If ButtonToggle were a radiogroup, it'd be different. Here it's a toggle button.
});
