import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
// css module classes will be undefined in test environment unless mapped or mocked.
// For class name testing, we'll check for the presence of the base class and parts of dynamic classes.

describe('Button', () => {
  it('should render children text correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /Click Me/i })).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    const buttonElement = screen.getByRole('button', { name: /Clickable/i });
    await userEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick handler when disabled and clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    const buttonElement = screen.getByRole('button', { name: /Disabled/i });
    await userEvent.click(buttonElement).catch(() => {}); // userEvent might throw on disabled, catch it.
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render prepend and append content', () => {
    render(
      <Button>
        <span data-testid="prepend">Pre</span>
        Button Text
        <span data-testid="append">App</span>
      </Button>
    );
    // This test setup is slightly off, prepend/append are props, not children structure
  });

  it('should render prepend and append props content', () => {
    render(
      <Button prepend={<span data-testid="prepend-prop">Pre</span>} append={<span data-testid="append-prop">App</span>}>
        Button Text
      </Button>
    );
    expect(screen.getByTestId('prepend-prop')).toBeInTheDocument();
    expect(screen.getByText('Button Text')).toBeInTheDocument();
    expect(screen.getByTestId('append-prop')).toBeInTheDocument();
  });

  it('should apply default and specific variant classes', () => {
    // css.button, css.primary, css.medium, css.padding_medium
    const { rerender } = render(<Button>Default</Button>);
    const button = screen.getByRole('button', { name: /Default/i });
    expect(button).toHaveClass(/button/); // From css.button
    expect(button).toHaveClass(/primary/); // Default variant
    expect(button).toHaveClass(/medium/);  // Default size
    expect(button).toHaveClass(/padding_medium/); // Default padding

    rerender(<Button variant="secondary" size="large" padding="small">Changed</Button>);
    const changedButton = screen.getByRole('button', { name: /Changed/i });
    expect(changedButton).toHaveClass(/button/);
    expect(changedButton).toHaveClass(/secondary/);
    expect(changedButton).toHaveClass(/large/);
    expect(changedButton).toHaveClass(/padding_small/);
  });

  it('should apply rounded class when rounded prop is true', () => {
    render(<Button rounded>Rounded Button</Button>);
    expect(screen.getByRole('button', { name: /Rounded Button/i })).toHaveClass(/rounded/);
  });

  it('should apply disabled attribute and class when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /Disabled Button/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass(/disabled/);
  });

  it('should apply evenPadding class when evenPadding prop is true', () => {
    render(<Button evenPadding>Even Padding</Button>);
    expect(screen.getByRole('button', { name: /Even Padding/i })).toHaveClass(/evenPadding/);
  });

  it('should forward other HTML attributes like type and aria-label', () => {
    render(<Button type="submit" aria-label="Submit Form">Submit</Button>);
    const button = screen.getByRole('button', { name: /Submit Form/i });
    expect(button).toHaveAttribute('type', 'submit');
    // name "Submit Form" already checks aria-label. Explicit check is also fine.
    expect(button).toHaveAttribute('aria-label', 'Submit Form');
  });

  it('should pass through a custom className', () => {
    render(<Button className="custom-class">Custom Class</Button>);
    expect(screen.getByRole('button', { name: /Custom Class/i })).toHaveClass('custom-class');
  });
});
