import { render, screen, fireEvent } from '@testing-library/react';
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
  it('updates startTime when clicking on background', () => {
    const onStartTimeChange = vi.fn();
    // Set startTime to 0 to avoid auto-scroll affecting the calculation (scrollLeft stays 0)
    const props = { ...defaultProps, onStartTimeChange, startTime: 0 };
    const { getByTestId } = render(<Timeline {...props} />);

    const interior = getByTestId('timeline-interior');
    const scrollContainer = getByTestId('scroll-container');

    // Mock getBoundingClientRect
    // Simulating a container starting at x=100
    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 0,
      width: 500,
      height: 100,
      bottom: 100,
      right: 600,
      x: 100,
      y: 0,
      toJSON: () => {}
    });

    // Click at 220px on screen.
    // relativeX = 220 - 100 + 0 (scroll) = 120px.
    // pixelsPerFrame = 120 / 10(fps) = 12px/frame.
    // frames = 120 / 12 = 10 frames.
    // time = 10 / 10 = 1.0s.
    fireEvent.mouseDown(interior, { clientX: 220, button: 0 });

    expect(onStartTimeChange).toHaveBeenCalledWith(1);
  });

  it('scrolls to selection on mount', () => {
    // We want the scroll to be at startTime - 1s
    // startTime = 2, so scroll target time = 1s
    // 1s * 120px/s = 120px
    const props = { ...defaultProps, startTime: 2 };
    const { getByTestId } = render(<Timeline {...props} />);

    const scrollContainer = getByTestId('scroll-container');
    expect(scrollContainer.scrollLeft).toBe(120);
  });
});
