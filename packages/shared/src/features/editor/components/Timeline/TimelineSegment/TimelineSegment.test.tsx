import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TimelineSegment } from './TimelineSegment';

describe('TimelineSegment', () => {
  it('renders the second marker correctly', () => {
    render(
      <TimelineSegment
        index={0}
        startTimeMs={1000}
        durationMs={1000}
        fps={10}
        totalDurationMs={5000}
      />
    );

    expect(screen.getByText('0:01')).toBeInTheDocument();
  });

  it('renders the correct number of frame markers', () => {
    const { container } = render(
      <TimelineSegment
        index={0}
        startTimeMs={0}
        durationMs={1000}
        fps={10}
        totalDurationMs={5000}
      />
    );

    const segment = container.firstChild;
    expect(segment?.childNodes.length).toBe(1 + 9); // 1 text marker + 9 frame markers
  });

  it('does not render frame markers beyond durationMs', () => {
    const { container } = render(
      <TimelineSegment
        index={0}
        startTimeMs={0}
        durationMs={500}
        fps={10}
        totalDurationMs={5000}
      />
    );

    const segment = container.firstChild;
    // So 5 markers.
    expect(segment?.childNodes.length).toBe(1 + 5);
  });

  it('does not render frame markers beyond totalDurationMs', () => {
    const { container } = render(
      <TimelineSegment
        index={4}
        startTimeMs={4000}
        durationMs={1000}
        fps={10}
        totalDurationMs={4500}
      />
    );
    const segment = container.firstChild;
    expect(segment?.childNodes.length).toBe(1 + 5);
  });
});
