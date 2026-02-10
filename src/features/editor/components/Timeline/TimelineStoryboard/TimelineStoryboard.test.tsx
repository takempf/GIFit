import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { TimelineStoryboard } from './TimelineStoryboard';

const MOCK_STORYBOARD_SPEC = {
  baseUrl: 'http://test.com/sb/$L/$N.jpg',
  levels: [
    {
      width: 160,
      height: 90,
      count: 50,
      cols: 5,
      rows: 5,
      interval: 2000,
      name: 'default',
      signature: 'abc123'
    }
  ]
};

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1 }]),
      sendMessage: vi.fn().mockResolvedValue({
        spec: 'http://test.com/sb/$L/$N.jpg|160#90#50#5#5#2000#default#abc123'
      })
    }
  }
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        key: `sb-${i}`,
        index: i,
        start: i * 100,
        size: 100,
        end: (i + 1) * 100,
        lane: 0
      })),
    getTotalSize: () => count * 100,
    measure: vi.fn()
  })
}));

vi.mock('../TimelineStoryboardFrame/TimelineStoryboardFrame', () => ({
  StoryboardFrame: () => <div data-testid="storyboard-frame" />
}));

describe('TimelineStoryboard', () => {
  const scrollRef = createRef<HTMLDivElement>();

  it('renders frames after spec is fetched', async () => {
    const { findAllByTestId } = render(
      <div ref={scrollRef}>
        <TimelineStoryboard
          scrollRef={scrollRef}
          totalDurationMs={5000}
          pixelsPerMs={0.12}
        />
      </div>
    );

    const frames = await findAllByTestId('storyboard-frame');
    expect(frames.length).toBeGreaterThan(0);
  });

  it('renders nothing before spec loads', () => {
    const { queryByTestId } = render(
      <div ref={scrollRef}>
        <TimelineStoryboard
          scrollRef={scrollRef}
          totalDurationMs={5000}
          pixelsPerMs={0.12}
        />
      </div>
    );

    // On initial synchronous render, spec hasn't loaded yet
    expect(queryByTestId('storyboard-frame')).not.toBeInTheDocument();
  });
});
