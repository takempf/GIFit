import type { VirtualItem } from '@tanstack/react-virtual';
import { TimelineSegment } from './TimelineSegment';
import { getStoryboardFrame, StoryboardLevel } from '@/utils/storyboard';

interface TimelineSegmentsProps {
  virtualItems: VirtualItem[];
  totalDuration: number;
  totalDurationMs: number;
  fps: number;
  storyboardSpec: { baseUrl: string; levels: StoryboardLevel[] } | null;
}

export function TimelineSegments({
  virtualItems,
  totalDuration,
  totalDurationMs,
  fps,
  storyboardSpec
}: TimelineSegmentsProps) {
  return (
    <>
      {virtualItems.map((virtualItem) => {
        const i = virtualItem.index;
        // Don't render if it goes beyond totalDuration
        if (i > totalDuration) return null;

        const segmentStartTimeMs = i * 1000;
        // Determine duration of this segment. Usually 1000ms, but last one might be less.
        const remainingMs = totalDurationMs - segmentStartTimeMs;
        const segmentDurationMs = Math.min(1000, Math.max(0, remainingMs));

        // Get storyboard frame for this segment
        const frame = storyboardSpec
          ? getStoryboardFrame(storyboardSpec, segmentStartTimeMs)
          : null;

        return (
          <TimelineSegment
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${virtualItem.size}px`,
              height: '100%',
              transform: `translateX(${virtualItem.start}px)`
            }}
            index={i}
            startTimeMs={segmentStartTimeMs}
            durationMs={segmentDurationMs}
            fps={fps}
            totalDurationMs={totalDurationMs}
            storyboardFrame={frame}
          />
        );
      })}
    </>
  );
}
