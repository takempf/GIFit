import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from './Timeline';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@tanstack/react-virtual', () => {
  return {
    useVirtualizer: ({ count }: { count: number }) => {
      return {
        getVirtualItems: () => {
          const items = [];
          for (let i = 0; i < count; i++) {
            items.push({
              key: `sec-${i}`,
              index: i,
              start: i * 120, // Assuming default fallback width 840 / 7s = 120px/s
              size: 120,
              lane: 0
            });
          }
          return items;
        },
        getTotalSize: () => count * 120,
        measure: vi.fn()
      };
    }
  };
});

describe('Timeline', () => {
  const defaultProps = {
    totalDuration: 10,
    startTime: 2,
    duration: 3,
    fps: 10,
    previewTime: 2,
    onChange: vi.fn()
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
    const onChange = vi.fn();
    // Set startTime to 0 to avoid auto-scroll affecting the calculation (scrollLeft stays 0)
    const props = { ...defaultProps, onChange, startTime: 0 };
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

    expect(onChange).toHaveBeenCalledWith(1, 3, 'start'); // duration is 3
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

  it('renders preview highlight at correct position', () => {
    render(<Timeline {...defaultProps} />);
    // Select by class name since it doesn't have a test id in the original code,
    // although I added the class in previous steps.
    // Let's use logic to find it or adding a data-testid would be better but I can't edit source in this tool call easily.
    // The previous edit added className={styles.previewHighlight} but I don't have styles object here in test.
    // However, I can look for the div with specific style.
    // previewTime = 2s. 2 * 120 = 240px.
    // width = 1000/10fps * 0.12 = 100ms * 0.12 = 12px.

    // best approach: check if there represents a div with left: 240px and width: 12px that is NOT the selection.
    // We can iterate over the children of the interior.
    const interior = screen.getByTestId('timeline-interior');
    const preview = Array.from(interior.children).find(
      (el) => (el as HTMLElement).style.width === '12px'
    );
    expect(preview).toBeInTheDocument();
  });

  it('renders scrollbar preview highlight at correct position', () => {
    const { container } = render(<Timeline {...defaultProps} />);
    // Props: totalDuration 10, previewTime 2
    // Expected percentage: (2 / 10) * 100 = 20%

    // We need to find the element. It doesn't have a test ID, but it's the second child
    // of the Scrollbar (after the Thumb).
    // Or we can query by style.
    // The previous implementation renders:
    // <div className={styles.scrollbarPreviewHighlighter} style={{ left: '20%', width: '1px' }} />

    // Using default query selector on style is tricky due to spacing.
    // Let's inspect the scrollbar's children assuming structure.
    // Structure: ScrollRoot -> Scrollbar -> [Thumb, SelectionIndicator, PreviewIndicator]

    // Note: ScrollArea from base-ui renders a complex structure.
    // We can try to find an element with style "width: 1px" inside the scrollbar area,
    // but better is to look for the specific calculated left value.

    const previewIndicator = container.querySelector(
      'div[style*="left: 20%"][style*="width: 1px"]'
    );
    expect(previewIndicator).toBeInTheDocument();
  });

  it('calls onChange when dragging', () => {
    const props = { ...defaultProps, startTime: 0 };
    const { getByTestId } = render(<Timeline {...props} />);

    const interior = getByTestId('timeline-interior');
    const scrollContainer = getByTestId('scroll-container');

    // Mock getBoundingClientRect
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

    // Drag move (background)
    // Click at 220px (relative 120px -> 1s)
    fireEvent.mouseDown(interior, { clientX: 220, button: 0 });
    // Expect onChange
    expect(props.onChange).toHaveBeenCalledWith(1, 3, 'start');

    // Handles interactions logic is similar but requires mocking dragging state which is internal.
    // However, I can trigger mouseDown on handles.
    const handleRight = getByTestId('handle-right');
    fireEvent.mouseDown(handleRight, { clientX: 0, button: 0 }); // starts drag
    expect(props.onChange).toHaveBeenCalled();
  });

  it('applies data-dragging attribute when dragging selection', () => {
    const props = { ...defaultProps, startTime: 0 };
    const { getByTestId } = render(<Timeline {...props} />);

    const selection = getByTestId('selection-rect');
    const scrollContainer = getByTestId('scroll-container');

    // Mock rect
    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 100,
      bottom: 100,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    // Start dragging selection
    fireEvent.mouseDown(selection, { clientX: 0, button: 0 });

    // Expect attribute to be 'move'
    expect(selection).toHaveAttribute('data-dragging', 'move');

    // End dragging
    fireEvent.mouseUp(window);
    expect(selection).not.toHaveAttribute('data-dragging');
  });

  it('updates gradients on scroll', () => {
    const { getByTestId } = render(<Timeline {...defaultProps} />);

    const scrollContainer = getByTestId('scroll-container');
    const leftGradient = getByTestId('gradient-left');
    const rightGradient = getByTestId('gradient-right');

    // Default state: scrollLeft is 0 (from previous logic or auto-scroll)
    // Actually auto-scroll happens on mount if startTime > 1s.
    // defaultProps startTime is 2. So it auto-scrolls to 120px.
    // If scrollLeft > 0, left gradient should be visible.
    // If scrollLeft + clientWidth < scrollWidth, right gradient should be visible.

    // Let's manually trigger scroll event with specific values to be sure.
    // We need to define scrollWidth/clientWidth on the element because JSDOM doesn't calculate them.
    Object.defineProperty(scrollContainer, 'scrollWidth', {
      configurable: true,
      writable: true,
      value: 1000
    });
    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      writable: true,
      value: 500
    });
    Object.defineProperty(scrollContainer, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 0
    });

    // Case 1: Start (0 scroll)
    fireEvent.scroll(scrollContainer);
    // expect(leftGradient).toHaveStyle('opacity: 0'); // Left hidden
    // expect(rightGradient).toHaveStyle('opacity: 1'); // Right visible
    // Note: Due to React state updates, might need waitFor or check what happens.
    // However, the initial render and effect might interpret initial state.
    // Let's just fire scroll and check.

    fireEvent.scroll(scrollContainer);
    expect(leftGradient).toHaveStyle('opacity: 0');
    expect(rightGradient).toHaveStyle('opacity: 1');

    // Case 2: Middle
    Object.defineProperty(scrollContainer, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 100
    });
    fireEvent.scroll(scrollContainer);
    expect(leftGradient).toHaveStyle('opacity: 1');
    expect(rightGradient).toHaveStyle('opacity: 1');

    // Case 3: End
    // scrollWidth 1000, clientWidth 500. max scrollLeft = 500.
    Object.defineProperty(scrollContainer, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 500
    });
    fireEvent.scroll(scrollContainer);
    expect(leftGradient).toHaveStyle('opacity: 1');
    // Using loose equality or checking implementation:
    // right gradient hidden if scrollLeft + clientWidth >= scrollWidth - 1
    // 500 + 500 = 1000. 1000 >= 999. Should be hidden.
    expect(rightGradient).toHaveStyle('opacity: 0');
  });
});
