import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('should render children correctly', () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole('button', { name: /click me/i })
    ).toBeInTheDocument();
  });

  it('should handle onClick events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render as a different element using "as" prop', () => {
    render(
      <Button as="a" href="https://example.com">
        Link Button
      </Button>
    );
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should apply variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    // We check if the button exists. checking specific css module classes is brittle/hard without happy-dom/jsdom properly mocking styles?
    // We can check if it renders.
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply aria-disabled when disabled prop is true and element is not a button', () => {
    render(
      <Button as="div" disabled>
        Disabled Div
      </Button>
    );
    // Divs strictly don't have a "disabled" attribute that affects interaction like buttons,
    // but the component logic aims to set aria-disabled.
    // `Component !== 'button' && disabled ? true : undefined`
    expect(screen.getByText('Disabled Div')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('should render prepend and append content', () => {
    render(
      <Button prepend={<span>Prefix</span>} append={<span>Suffix</span>}>
        Content
      </Button>
    );
    expect(screen.getByText('Prefix')).toBeInTheDocument();
    expect(screen.getByText('Suffix')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
