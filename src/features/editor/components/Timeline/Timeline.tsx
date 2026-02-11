import { ScrollArea } from '@base-ui/react/scroll-area';
import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { useTimelineDrag } from '../../hooks/useTimelineDrag';
import {
  TimelineSelection,
  TimelineSelectionHandle
} from './TimelineSelection/TimelineSelection';
import { TimelineSegments } from './TimelineSegments/TimelineSegments';
import { TimelineStoryboard } from './TimelineStoryboard/TimelineStoryboard';

import css from './Timeline.module.css';

interface TimelineProps {
  totalDuration: number; // ms
  startTime: number; // ms
  duration: number; // ms
  fps: number;
  previewTime: number; // ms
  onChange: (
    newStartTimeMs: number,
    newDurationMs: number,
    context: 'start' | 'end'
  ) => void;
  onHandleFocus: (handle: 'start' | 'end') => void;
  className?: string;
}

export function Timeline({
  totalDuration,
  startTime,
  duration,
  fps,
  previewTime,
  onChange,
  onHandleFocus,
  className
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<TimelineSelectionHandle>(null);
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

  // Props are already in ms
  const totalDurationMs = totalDuration;
  const startTimeMs = startTime;
  const durationMs = duration;

  const {
    handleSelectionMouseDown,
    handleBackgroundMouseDown,
    startLeftDrag,
    startRightDrag,
    draggingState
  } = useTimelineDrag({
    scrollRef,
    startTimeMs,
    durationMs,
    totalDurationMs,
    pixelsPerSecond,
    onChange
  });

  // Keyboard navigation for handles
  const frameDurationMs = 1000 / fps;
  const MIN_DURATION_MS = frameDurationMs; // Minimum 1 frame

  function handleLeftKeyDown(e: React.KeyboardEvent): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();

    const frameMultiplier = e.shiftKey ? 5 : 1;
    const delta =
      (e.key === 'ArrowRight' ? frameDurationMs : -frameDurationMs) *
      frameMultiplier;
    const newStartMs = Math.max(
      0,
      Math.min(startTimeMs + delta, totalDurationMs - MIN_DURATION_MS)
    );
    const newDurationMs = durationMs - (newStartMs - startTimeMs);

    if (newDurationMs >= MIN_DURATION_MS) {
      onChange(newStartMs, newDurationMs, 'start');
      selectionRef.current?.scrollLeftIntoView();
    }
  }

  function handleRightKeyDown(e: React.KeyboardEvent): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();

    const frameMultiplier = e.shiftKey ? 5 : 1;
    const delta =
      (e.key === 'ArrowRight' ? frameDurationMs : -frameDurationMs) *
      frameMultiplier;
    const endTimeMs = startTimeMs + durationMs;
    const newEndMs = Math.max(
      startTimeMs + MIN_DURATION_MS,
      Math.min(endTimeMs + delta, totalDurationMs)
    );
    const newDurationMs = newEndMs - startTimeMs;

    if (newDurationMs >= MIN_DURATION_MS) {
      onChange(startTimeMs, newDurationMs, 'end');
      selectionRef.current?.scrollRightIntoView();
    }
  }

  const hasInitialScrolled = useRef(false);

  // Initial scroll to selection
  useEffect(() => {
    // Wait until we have a valid width (meaning ResizeObserver has fired)
    if (
      hasInitialScrolled.current ||
      !selectionRef.current ||
      containerWidth === 0
    )
      return;

    // Wait even more as a sanity check
    setTimeout(
      () =>
        selectionRef?.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'start'
        }),
      100
    );

    hasInitialScrolled.current = true;
  }, [containerWidth]);

  const count = Math.floor(totalDurationMs / 1000) + 1; // Number of seconds to render

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
  const previewIndicatorLeftPct = (previewTime / safeTotalDuration) * 100;

  return (
    <div
      className={`${css.timeline} ${className || ''}`}
      ref={containerRef}
      data-testid="timeline-container">
      <ScrollArea.Root className={css.scrollRoot}>
        <div className={css.viewportContainer}>
          <div className={`${css.gradient} ${css.gradientLeft}`} />
          <div className={`${css.gradient} ${css.gradientRight}`} />

          <ScrollArea.Viewport
            className={css.scrollViewport}
            ref={scrollRef}
            data-testid="scroll-container">
            <ScrollArea.Content
              className={css.scrollContent}
              style={{ width: `${rowVirtualizer.getTotalSize()}px` }}>
              <div
                className={css.interior}
                onMouseDown={handleBackgroundMouseDown}
                data-testid="timeline-interior">
                {/* Content Layer (Ticks + Storyboard) */}
                <TimelineStoryboard
                  scrollRef={scrollRef}
                  totalDurationMs={totalDurationMs}
                  pixelsPerMs={PIXELS_PER_MS}
                />
                <TimelineSegments
                  virtualItems={rowVirtualizer.getVirtualItems()}
                  totalDurationMs={totalDurationMs}
                  fps={fps}
                />

                {/* Preview Highlight */}
                <div
                  className={css.previewHighlight}
                  style={{
                    left: 0,
                    transform: `translateX(${previewTime * PIXELS_PER_MS}px)`,
                    width: `${(1000 / fps) * PIXELS_PER_MS}px`
                  }}
                />

                {/* Selection Layer */}
                <TimelineSelection
                  ref={selectionRef}
                  startTimeMs={startTimeMs}
                  durationMs={durationMs}
                  pixelsPerMs={PIXELS_PER_MS}
                  fps={fps}
                  onMouseDown={handleSelectionMouseDown}
                  onLeftDrag={startLeftDrag}
                  onRightDrag={startRightDrag}
                  onLeftFocus={() => onHandleFocus('start')}
                  onRightFocus={() => onHandleFocus('end')}
                  onLeftKeyDown={handleLeftKeyDown}
                  onRightKeyDown={handleRightKeyDown}
                  draggingState={draggingState}
                />
              </div>
            </ScrollArea.Content>
          </ScrollArea.Viewport>
        </div>

        <ScrollArea.Scrollbar
          className={css.scrollbar}
          orientation="horizontal">
          <ScrollArea.Thumb className={css.scrollbarThumb} />
          {/* Selection Indicator on Scrollbar Track */}
          <div
            className={css.scrollbarSelectionIndicator}
            style={{
              left: `${selectionIndicatorLeftPct}%`,
              width: `${selectionIndicatorWidthPct}%`
            }}
          />
          {/* Preview Indicator on Scrollbar Track */}
          <div
            className={css.scrollbarPreviewHighlighter}
            style={{
              left: `${previewIndicatorLeftPct}%`,
              width: '1px'
            }}
          />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
