import type { VirtualItem } from '@tanstack/react-virtual';
import { getStoryboardFrame, StoryboardLevel } from '@/utils/storyboard';
import { StoryboardFrame } from './StoryboardFrame';
import styles from './TimelineStoryboardLayer.module.css';

interface TimelineStoryboardLayerProps {
  virtualItems: VirtualItem[];
  storyboardSpec: { baseUrl: string; levels: StoryboardLevel[] };
  totalDurationMs: number;
}

export function TimelineStoryboardLayer({
  virtualItems,
  storyboardSpec,
  totalDurationMs
}: TimelineStoryboardLayerProps) {
  return (
    <div className={styles.layer}>
      {virtualItems.map((virtualItem) => {
        const i = virtualItem.index;

        // Use the last level as per getStoryboardFrame logic
        const level = storyboardSpec.levels[storyboardSpec.levels.length - 1];
        const interval = level.interval;
        const segmentStartTimeMs = i * interval;

        // Don't render if it's completely beyond totalDuration
        if (segmentStartTimeMs >= totalDurationMs) return null;

        // Calculate frame data
        // We can reuse getStoryboardFrame, or manually construct for efficiency if needed.
        // using getStoryboardFrame is safer to ensure logic consistency.
        const frame = getStoryboardFrame(storyboardSpec, segmentStartTimeMs);

        if (!frame) return null;

        return (
          <div
            key={virtualItem.key}
            className={styles.segment}
            style={{
              left: `${virtualItem.start}px`, // calculated by virtualizer
              width: `${virtualItem.size}px`
            }}>
            <StoryboardFrame frame={frame} />
          </div>
        );
      })}
    </div>
  );
}
