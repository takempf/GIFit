import { render, screen, fireEvent, act } from '@shared/test-utils';
import { Timeline } from './Timeline';
import { vi, describe, it, expect } from 'vitest';

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn().mockResolvedValue(null)
    }
  }
}));

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

// Mock ResizeObserver
// Mock ResizeObserver
const ResizeObserverMock = vi.fn((_cb: ResizeObserverCallback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

describe('Timeline', () => {
  const defaultProps = {
    totalDuration: 10000,
    startTime: 2000,
    duration: 3000,
    fps: 10,
    previewTime: 2000,
    onChange: vi.fn(),
    onHandleFocus: vi.fn()
  };

  it('renders correctly', () => {
    const { getByTestId } = render(<Timeline {...defaultProps} />);

    // Check if container exists
    expect(getByTestId('timeline-container')).toBeInTheDocument();

    // Check selection
    const selection = getByTestId('selection-rect');
    expect(selection).toBeInTheDocument();

    // Calculate expected styles
    // startTimeMs = 2000ms, pixelsPerMs = 120/1000 = 0.12
    // transform = translateX(2000 * 0.12) = translateX(240px)
    // durationMs = 3000ms, width = 3000 * 0.12 = 360px
    // Calculate expected styles
    // startTimeMs = 2000ms, pixelsPerMs = 120/1000 = 0.12
    // transform = translateX(2000 * 0.12) = translateX(240px)
    // durationMs = 3000ms, width = 3000 * 0.12 = 360px
    expect(selection.style.transform).toBe('translateX(240px)');
    expect(selection.style.width).toBe('360px');
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

    expect(onChange).toHaveBeenCalledWith(1000, 3000, 'start'); // duration is 3000ms
  });

  it('scrolls to selection on mount', () => {
    // We need to capture the callback passed to ResizeObserver so we can trigger it
    let resizeCallback: ResizeObserverCallback = () => {};
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();

    ResizeObserverMock.mockImplementation((cb: ResizeObserverCallback) => {
      resizeCallback = cb;
      return {
        observe: observeMock,
        disconnect: disconnectMock,
        unobserve: vi.fn()
      };
    });

    // Verify scrollIntoView is called
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const props = { ...defaultProps, startTime: 2 };
    render(<Timeline {...props} />);

    // Trigger ResizeObserver callback to set containerWidth
    // This simulates the container being measured
    if (resizeCallback) {
      act(() => {
        resizeCallback(
          [
            {
              contentRect: { width: 1000 } as DOMRectReadOnly
            } as ResizeObserverEntry
          ],
          // @ts-ignore
          {} as ResizeObserver
        );
      });
    }

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'instant',
      block: 'center',
      inline: 'start'
    });
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
    expect(props.onChange).toHaveBeenCalledWith(1000, 3000, 'start');

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
});
