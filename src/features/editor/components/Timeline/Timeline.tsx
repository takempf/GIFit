import { ScrollArea } from '@base-ui/react/scroll-area';
import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import styles from './Timeline.module.css';
import { toMilliseconds } from '@/utils/time';

import { useTimelineDrag } from '../../hooks/useTimelineDrag';
import { TimelineSelection } from './TimelineSelection';
import { TimelineSegments } from './TimelineSegments';

interface TimelineProps {
  totalDuration: number;
  startTime: number;
  duration: number; // Selection duration
  fps: number;
  previewTime: number;
  onChange: (
    newStartTime: number,
    newDuration: number,
    context: 'start' | 'end'
  ) => void;
  className?: string;
}

export function Timeline({
  totalDuration,
  startTime,
  duration,
  fps,
  previewTime,
  onChange,
  className
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Show ~7 seconds in the viewport
  const VISIBLE_DURATION_SECONDS = 7;
  // Fallback width prevents division by zero issues on initial render
  const effectiveWidth = containerWidth || 840; // 120 * 7
  const pixelsPerSecond = effectiveWidth / VISIBLE_DURATION_SECONDS;
  const PIXELS_PER_MS = pixelsPerSecond / 1000;

  // Convert props to ms for internal calculations
  const totalDurationMs = toMilliseconds(totalDuration);
  const startTimeMs = toMilliseconds(startTime);
  const durationMs = toMilliseconds(duration);

  const {
    handleSelectionMouseDown,
    handleBackgroundMouseDown,
    startLeftDrag,
    startRightDrag
  } = useTimelineDrag({
    scrollRef,
    startTimeMs,
    durationMs,
    totalDurationMs,
    pixelsPerSecond,
    onChange
  });

  const hasInitialScrolled = useRef(false);

  // Initial scroll to selection
  useEffect(() => {
    if (hasInitialScrolled.current || !scrollRef.current) return;

    // Only scroll if we have a valid start time or if it's explicitly 0
    const targetTimeMs = Math.max(0, startTimeMs - 1000);
    const targetScrollLeft = targetTimeMs * PIXELS_PER_MS;

    scrollRef.current.scrollLeft = targetScrollLeft;
    hasInitialScrolled.current = true;
  }, [startTimeMs, PIXELS_PER_MS]);

  const count = Math.floor(totalDuration) + 1; // Number of seconds to render

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      // If it's the last segment, calculate precise width
      if (index === count - 1) {
        const segmentStartTimeMs = index * 1000;
        const remainingMs = totalDurationMs - segmentStartTimeMs;
        const segmentDurationMs = Math.min(1000, Math.max(0, remainingMs));
        return segmentDurationMs * PIXELS_PER_MS;
      }
      return pixelsPerSecond;
    },
    horizontal: true,
    overscan: 2 // Render 2 extra items off-screen
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, pixelsPerSecond]);

  // Selection Indicator Calculation on Scrollbar
  const safeTotalDuration = totalDurationMs > 0 ? totalDurationMs : 1;
  const selectionIndicatorLeftPct = (startTimeMs / safeTotalDuration) * 100;
  const selectionIndicatorWidthPct = (durationMs / safeTotalDuration) * 100;

  return (
    <div
      className={`${styles.timeline} ${className || ''}`}
      ref={containerRef}
      data-testid="timeline-container">
      <ScrollArea.Root className={styles.scrollRoot}>
        <ScrollArea.Scrollbar
          className={styles.scrollbar}
          orientation="horizontal">
          <ScrollArea.Thumb className={styles.scrollbarThumb} />
          {/* Selection Indicator on Scrollbar Track */}
          <div
            className={styles.scrollbarSelectionIndicator}
            style={{
              left: `${selectionIndicatorLeftPct}%`,
              width: `${selectionIndicatorWidthPct}%`
            }}
          />
        </ScrollArea.Scrollbar>
        <ScrollArea.Viewport
          className={styles.scrollViewport}
          ref={scrollRef}
          data-testid="scroll-container">
          <ScrollArea.Content
            className={styles.scrollContent}
            style={{ width: `${rowVirtualizer.getTotalSize()}px` }}>
            <div
              className={styles.interior}
              onMouseDown={handleBackgroundMouseDown}
              data-testid="timeline-interior">
              {/* Ticks Layer (Virtual Items) */}
              <TimelineSegments
                virtualItems={rowVirtualizer.getVirtualItems()}
                totalDuration={totalDuration}
                totalDurationMs={totalDurationMs}
                fps={fps}
              />

              {/* Preview Highlight */}
              <div
                className={styles.previewHighlight}
                style={{
                  left: `${toMilliseconds(previewTime) * PIXELS_PER_MS}px`,
                  width: `${(1000 / fps) * PIXELS_PER_MS}px`
                }}
              />

              {/* Selection Layer */}
              <TimelineSelection
                startTimeMs={startTimeMs}
                durationMs={durationMs}
                pixelsPerMs={PIXELS_PER_MS}
                onMouseDown={handleSelectionMouseDown}
                onLeftDrag={startLeftDrag}
                onRightDrag={startRightDrag}
              />
            </div>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
}
