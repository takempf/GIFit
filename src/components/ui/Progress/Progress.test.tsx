import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Progress } from './Progress';

describe('Progress', () => {
  it('should render correctly', () => {
    // We can't easily check internal Base UI structure without knowing its aria roles or classes
    // But we can check if it renders without crashing
    const { container } = render(<Progress value={50} />);
    expect(container).toBeInTheDocument();
  });

  it('should render label when provided', () => {
    render(<Progress value={50} label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should not render label when not provided', () => {
    render(<Progress value={50} />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Base UI might not expose value text by default unless ShowValue is true
  it('should render value when showValue is true', () => {
    // Typically Base UI renders value text if we tell it to, but let's see how the component uses it
    // <BaseProgress.Value className={css.value} />
    // base-ui usually renders the value inside here.
    // Since we don't know the exact implementation of BaseProgress.Value's default render,
    // we might just check if the element exists or if it contains "50"

    // Let's assume standard behavior:
    render(<Progress value={50} showValue />);
    // It might render "50" or "50%".
    // Let's search for "50"
    // If BaseProgress.Value is just a container, it might be empty without children.
    // But usually it renders the value.
    // Let's check the code: `<BaseProgress.Value className={css.value} />`
    // base-ui/react/progress says `Value` renders the current value as text.
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });
});
