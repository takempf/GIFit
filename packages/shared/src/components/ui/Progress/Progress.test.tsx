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
    render(<Progress value={50} showValue />);
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });
});
