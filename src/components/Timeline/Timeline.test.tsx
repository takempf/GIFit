import { render, screen } from '@testing-library/react';
import { Timeline } from './Timeline';
import { vi, describe, it, expect } from 'vitest';

describe('Timeline', () => {
  const defaultProps = {
    totalDuration: 10,
    startTime: 2,
    duration: 3,
    fps: 10,
    onStartTimeChange: vi.fn(),
    onDurationChange: vi.fn()
  };

  it('renders correctly', () => {
    const { getByTestId } = render(<Timeline {...defaultProps} />);

    // Check if container exists
    expect(getByTestId('timeline-container')).toBeInTheDocument();

    // Check selection
    const selection = getByTestId('selection-rect');
    expect(selection).toBeInTheDocument();

    // Calculate expected styles
    // 2s * 120px = 240px left
    // 3s * 120px = 360px width
    expect(selection).toHaveStyle('left: 240px');
    expect(selection).toHaveStyle('width: 360px');
  });

  it('renders ticks', () => {
    render(<Timeline {...defaultProps} />);
    // 10 seconds duration -> 0 to 10 markers = 11 second markers
    // Note: Ticks don't have test-ids, relying on class presence or content is standard for lists.
    // Ensure we can find them. We can look for text content "0:00", "0:01" etc.
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('0:10')).toBeInTheDocument();
  });

  it('renders handles', () => {
    const { getByTestId } = render(<Timeline {...defaultProps} />);
    expect(getByTestId('handle-left')).toBeInTheDocument();
    expect(getByTestId('handle-right')).toBeInTheDocument();
  });
});
