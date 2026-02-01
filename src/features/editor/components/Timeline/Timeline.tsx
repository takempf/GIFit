import { ScrollArea } from '@base-ui/react/scroll-area';
import React, { useRef, useEffect, useMemo, useState } from 'react';
import styles from './Timeline.module.css';
import { toMilliseconds, formatMilliseconds } from '@/utils/time';

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
  // Round PIXELS_PER_SECOND for tick rendering alignment if needed, but float is usually fine for positioning

  // Convert props to ms for internal calculations
  const totalDurationMs = toMilliseconds(totalDuration);
  const startTimeMs = toMilliseconds(startTime);
  const durationMs = toMilliseconds(duration);

  const totalWidth = totalDurationMs * PIXELS_PER_MS;

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

  // Generate Ticks
  const renderTicks = useMemo(() => {
    const ticks = [];
    const seconds = Math.floor(totalDuration);

    for (let i = 0; i <= seconds; i++) {
      // Second Marker
      ticks.push(
        <div
          key={`sec-${i}`}
          className={styles.secondMarker}
          style={{ left: `${i * pixelsPerSecond}px` }}>
          {formatMilliseconds(i * 1000)}
        </div>
      );

      // Frame Markers
      if (i < totalDuration) {
        for (let f = 1; f < fps; f++) {
          const frameTimeMs = i * 1000 + (f * 1000) / fps;
          if (frameTimeMs > totalDurationMs) break;
          ticks.push(
            <div
              key={`frame-${i}-${f}`}
              className={styles.frameMarker}
              style={{ left: `${frameTimeMs * PIXELS_PER_MS}px` }}
            />
          );
        }
      }
    }

    return ticks;
  }, [totalDuration, fps, totalDurationMs, pixelsPerSecond, PIXELS_PER_MS]);

  const selectionStyle = {
    left: `${startTimeMs * PIXELS_PER_MS}px`,
    width: `${durationMs * PIXELS_PER_MS}px`
  };

  // Selection Indicator Calculation
  // Total duration logic for percentages
  // Avoid division by zero
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
            style={{ width: `${totalWidth}px` }}>
            <div
              className={styles.interior}
              onMouseDown={handleBackgroundMouseDown}
              data-testid="timeline-interior">
              {/* Ticks Layer */}
              {renderTicks}

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
                {/* Frames Visual Removed */}

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
