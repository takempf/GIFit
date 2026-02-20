import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimelineSegments } from './TimelineSegments';
import type { VirtualItem } from '@tanstack/react-virtual';

// Mock TimelineSegment to avoid testing its internal logic again and to simplify prop verification
vi.mock('../TimelineSegment/TimelineSegment', () => ({
  TimelineSegment: (props: Record<string, unknown>) => (
    <div data-testid="timeline-segment" data-props={JSON.stringify(props)} />
  )
}));

describe('TimelineSegments', () => {
  const mockVirtualItems: VirtualItem[] = [
    { key: '0', index: 0, start: 0, size: 100, end: 100, lane: 0 },
    { key: '1', index: 1, start: 100, size: 100, end: 200, lane: 0 }
  ];

  it('renders correctly with valid virtual items', () => {
    const { getAllByTestId } = render(
      <TimelineSegments
        virtualItems={mockVirtualItems}
        totalDurationMs={5000}
        fps={10}
      />
    );

    const segments = getAllByTestId('timeline-segment');
    expect(segments).toHaveLength(2);
  });

  it('does not render segments beyond totalDuration', () => {
    const virtualItems: VirtualItem[] = [
      ...mockVirtualItems,
      { key: '6', index: 6, start: 600, size: 100, end: 700, lane: 0 }
    ];

    const { getAllByTestId } = render(
      <TimelineSegments
        virtualItems={virtualItems}
        totalDurationMs={5000}
        fps={10}
      />
    );

    const segments = getAllByTestId('timeline-segment');
    expect(segments).toHaveLength(2);
  });

  it('passes correct props to TimelineSegment', () => {
    const { getAllByTestId } = render(
      <TimelineSegments
        virtualItems={mockVirtualItems}
        totalDurationMs={1500}
        fps={10}
      />
    );

    const segments = getAllByTestId('timeline-segment');
    const segment0Props = JSON.parse(
      segments[0].getAttribute('data-props') || '{}'
    );
    const segment1Props = JSON.parse(
      segments[1].getAttribute('data-props') || '{}'
    );

    expect(segment0Props).toMatchObject({
      index: 0,
      startTimeMs: 0,
      durationMs: 1000,
      fps: 10,
      totalDurationMs: 1500
    });

    expect(segment1Props).toMatchObject({
      index: 1,
      startTimeMs: 1000,
      durationMs: 500,
      fps: 10,
      totalDurationMs: 1500
    });
  });
});
