import { ScrollArea } from '@base-ui/react/scroll-area';
import React, { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import styles from './Timeline.module.css';
import { toMilliseconds } from '@/utils/time';

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

import { TimelineSegment } from './TimelineSegment';

import { useTimelineDrag } from '../../hooks/useTimelineDrag';

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

    // Only scroll if we have a valid start time or if it's explicitly 0 (though 0 usually needs no scroll)
    // We want to scroll to 1 second before the selection
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

  const selectionStyle = {
    left: `${startTimeMs * PIXELS_PER_MS}px`,
    width: `${durationMs * PIXELS_PER_MS}px`
  };

  // Selection Indicator Calculation
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
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const i = virtualItem.index;
                // Don't render if it goes beyond totalDuration (though count limits it, last second might be partial in theory but we treat seconds as blocks)
                if (i > totalDuration) return null;

                const segmentStartTimeMs = i * 1000;
                // Determine duration of this segment. Usually 1000ms, but last one might be less.
                const remainingMs = totalDurationMs - segmentStartTimeMs;
                const segmentDurationMs = Math.min(
                  1000,
                  Math.max(0, remainingMs)
                );

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
                  />
                );
              })}

              {/* Preview Highlight */}
              <div
                className={styles.previewHighlight}
                style={{
                  left: `${toMilliseconds(previewTime) * PIXELS_PER_MS}px`,
                  width: `${(1000 / fps) * PIXELS_PER_MS}px`
                }}
              />

              {/* Selection Layer */}
              <div
                className={styles.selection}
                style={selectionStyle}
                onMouseDown={handleSelectionMouseDown}
                data-testid="selection-rect">
                {/* Handles */}
                <div
                  className={`${styles.handle} ${styles.handleLeft}`}
                  onMouseDown={startLeftDrag}
                  data-testid="handle-left"
                />
                <div
                  className={`${styles.handle} ${styles.handleRight}`}
                  onMouseDown={startRightDrag}
                  data-testid="handle-right"
                />
              </div>
            </div>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
}
