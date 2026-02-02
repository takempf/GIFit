import { memo, CSSProperties } from 'react';

import { formatMilliseconds } from '@/utils/time';
import { StoryboardFrame, StoryboardFrameData } from './StoryboardFrame';

import css from './TimelineSegment.module.css';

interface TimelineSegmentProps {
  index: number;
  startTimeMs: number;
  durationMs: number;
  fps: number;
  totalDurationMs: number;
  style?: CSSProperties;
  storyboardFrame?: StoryboardFrameData | null;
  containerWidth?: number;
}

export const TimelineSegment = memo(function TimelineSegment({
  index,
  startTimeMs,
  durationMs,
  fps,
  totalDurationMs,
  style,
  storyboardFrame,
  containerWidth
}: TimelineSegmentProps) {
  const frameMarkers = [];

  // We want to render frames such that they align globally.
  // The first frame in this segment might not be exactly at the start if it spans across seconds (though here segments are aligned to seconds usually).
  // Assuming segments align with seconds (0s, 1s, 2s...), frames naturally align.
  // Frames are at: 1/fps, 2/fps, ... relative to the second.

  for (let f = 1; f < fps; f++) {
    const frameTimeRelativeMs = (f * 1000) / fps;

    // If this frame is beyond the duration of this segment (e.g. at the very end of video), skip
    if (frameTimeRelativeMs > durationMs) break;

    // Check against total video duration too, although durationMs closely tracks it for the last segment.
    if (startTimeMs + frameTimeRelativeMs > totalDurationMs) break;

    frameMarkers.push(
      <div key={`frame-${index}-${f}`} className={css.frameMarker} />
    );
  }

  return (
    <div
      className={css.timelineSegment}
      style={{ ...style, overflow: 'hidden' }}>
      {storyboardFrame && containerWidth && (
        <StoryboardFrame
          frame={storyboardFrame}
          containerWidth={containerWidth}
        />
      )}
      <div className={css.secondMarker}>{formatMilliseconds(startTimeMs)}</div>
      {frameMarkers}
    </div>
  );
});
