import { render, fireEvent, screen } from '@testing-library/react';
import { TimelineSelection } from './TimelineSelection';
import { vi, describe, it, expect } from 'vitest';

describe('TimelineSelection', () => {
  const defaultProps = {
    startTimeMs: 2000,
    durationMs: 3000,
    pixelsPerMs: 0.12,
    fps: 10,
    onMouseDown: vi.fn(),
    onLeftDrag: vi.fn(),
    onRightDrag: vi.fn(),
    onLeftFocus: vi.fn(),
    onRightFocus: vi.fn(),
    onLeftKeyDown: vi.fn(),
    onRightKeyDown: vi.fn(),
    draggingState: null as 'left' | 'right' | 'move' | null
  };

  it('renders selection with correct position and width', () => {
    render(<TimelineSelection {...defaultProps} />);

    const selection = screen.getByTestId('selection-rect');

    // startTimeMs * pixelsPerMs = 2000 * 0.12 = 240px
    // durationMs * pixelsPerMs = 3000 * 0.12 = 360px
    expect(selection).toHaveStyle('transform: translateX(240px)');
    expect(selection).toHaveStyle('width: 360px');
  });

  it('renders correct number of frames', () => {
    render(<TimelineSelection {...defaultProps} />);

    const selection = screen.getByTestId('selection-rect');
    // durationMs = 3000, fps = 10 -> frameDurationMs = 100ms
    // frameCount = ceil(3000 / 100) = 30 frames
    const framesContainer = selection.querySelector(
      '[class*="framesContainer"]'
    );
    expect(framesContainer?.children.length).toBe(30);
  });

  it('renders both handles', () => {
    render(<TimelineSelection {...defaultProps} />);

    expect(screen.getByTestId('handle-left')).toBeInTheDocument();
    expect(screen.getByTestId('handle-right')).toBeInTheDocument();
  });

  it('calls onMouseDown when selection is clicked', () => {
    const onMouseDown = vi.fn();
    render(<TimelineSelection {...defaultProps} onMouseDown={onMouseDown} />);

    fireEvent.mouseDown(screen.getByTestId('selection-rect'));
    expect(onMouseDown).toHaveBeenCalled();
  });

  it('calls onLeftDrag when left handle is clicked', () => {
    const onLeftDrag = vi.fn();
    render(<TimelineSelection {...defaultProps} onLeftDrag={onLeftDrag} />);

    fireEvent.mouseDown(screen.getByTestId('handle-left'));
    expect(onLeftDrag).toHaveBeenCalled();
  });

  it('calls onRightDrag when right handle is clicked', () => {
    const onRightDrag = vi.fn();
    render(<TimelineSelection {...defaultProps} onRightDrag={onRightDrag} />);

    fireEvent.mouseDown(screen.getByTestId('handle-right'));
    expect(onRightDrag).toHaveBeenCalled();
  });

  it('calls onLeftFocus when left handle receives focus', () => {
    const onLeftFocus = vi.fn();
    render(<TimelineSelection {...defaultProps} onLeftFocus={onLeftFocus} />);

    fireEvent.focus(screen.getByTestId('handle-left'));
    expect(onLeftFocus).toHaveBeenCalled();
  });

  it('calls onRightFocus when right handle receives focus', () => {
    const onRightFocus = vi.fn();
    render(<TimelineSelection {...defaultProps} onRightFocus={onRightFocus} />);

    fireEvent.focus(screen.getByTestId('handle-right'));
    expect(onRightFocus).toHaveBeenCalled();
  });

  it('applies data-dragging attribute based on draggingState', () => {
    const { rerender } = render(<TimelineSelection {...defaultProps} />);
    const selection = screen.getByTestId('selection-rect');

    // No dragging state
    expect(selection).not.toHaveAttribute('data-dragging');

    // Left dragging
    rerender(<TimelineSelection {...defaultProps} draggingState="left" />);
    expect(selection).toHaveAttribute('data-dragging', 'left');

    // Right dragging
    rerender(<TimelineSelection {...defaultProps} draggingState="right" />);
    expect(selection).toHaveAttribute('data-dragging', 'right');

    // Move dragging
    rerender(<TimelineSelection {...defaultProps} draggingState="move" />);
    expect(selection).toHaveAttribute('data-dragging', 'move');
  });

  it('handles zero duration gracefully', () => {
    render(<TimelineSelection {...defaultProps} durationMs={0} />);

    const selection = screen.getByTestId('selection-rect');
    expect(selection).toHaveStyle('width: 0px');
  });

  it('supports ref forwarding', () => {
    const ref = { current: null };
    render(<TimelineSelection {...defaultProps} ref={ref} />);

    expect(ref.current).toEqual(
      expect.objectContaining({
        scrollIntoView: expect.any(Function),
        scrollLeftIntoView: expect.any(Function),
        scrollRightIntoView: expect.any(Function)
      })
    );
  });
});
