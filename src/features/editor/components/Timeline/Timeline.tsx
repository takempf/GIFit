import { ScrollArea } from '@base-ui/react/scroll-area';
import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { browser } from 'wxt/browser';

import { toMilliseconds, toSeconds } from '@/utils/time';
import { parseStoryboardSpec, StoryboardLevel } from '@/utils/storyboard';

import { useTimelineDrag } from '../../hooks/useTimelineDrag';
import {
  TimelineSelection,
  TimelineSelectionHandle
} from './TimelineSelection/TimelineSelection';
import { TimelineSegments } from './TimelineSegments/TimelineSegments';
import { TimelineStoryboard } from './TimelineStoryboard/TimelineStoryboard';

import css from './Timeline.module.css';

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
  const [storyboardSpec, setStoryboardSpec] = useState<{
    baseUrl: string;
    levels: StoryboardLevel[];
  } | null>(null);

  useEffect(() => {
    // Reset storyboard when video changes
    setStoryboardSpec(null);

    // Fetch storyboard spec
    const fetchStoryboard = async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true
        });
        const activeTab = tabs[0];

        if (!activeTab?.id) {
          console.warn('Timeline: No active tab found');
          return;
        }

        const response = await browser.tabs.sendMessage(activeTab.id, {
          type: 'GET_STORYBOARD'
        });

        if (response && response.spec) {
          const parsed = parseStoryboardSpec(response.spec);
          setStoryboardSpec(parsed);
        } else {
          console.warn('Timeline: No spec in response');
        }
      } catch (e) {
        console.error('Failed to fetch storyboard spec', e);
      }
    };
    fetchStoryboard();
  }, [totalDuration]); // Refetch when video duration changes (indicates new video)

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
      onChange(toSeconds(newStartMs), toSeconds(newDurationMs), 'start');
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
      onChange(toSeconds(startTimeMs), toSeconds(newDurationMs), 'end');
      selectionRef.current?.scrollRightIntoView();
    }
  }

  const hasInitialScrolled = useRef(false);

  // Initial scroll to selection
  useEffect(() => {
    const UI_INITIALIZATION_DELAY = 20;

    setTimeout(() => {
      if (hasInitialScrolled.current || !selectionRef.current) return;

      selectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'start'
      });

      hasInitialScrolled.current = true;
    }, UI_INITIALIZATION_DELAY);
  }, []);

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

  // Storyboard Virtualization
  const storyboardInterval =
    storyboardSpec?.levels[storyboardSpec.levels.length - 1]?.interval || 1000;

  const storyboardCount = storyboardSpec
    ? Math.ceil(totalDurationMs / storyboardInterval)
    : 0;

  const storyboardVirtualizer = useVirtualizer({
    count: storyboardCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const start = index * storyboardInterval;
      // We clip the last segment to the total duration, similar to segments
      const end = Math.min(totalDurationMs, start + storyboardInterval);
      const duration = Math.max(0, end - start);
      return duration * PIXELS_PER_MS;
    },
    horizontal: true,
    overscan: 2
  });

  useEffect(() => {
    storyboardVirtualizer.measure();
  }, [storyboardVirtualizer, pixelsPerSecond, storyboardSpec]);

  // Selection Indicator Calculation on Scrollbar
  const safeTotalDuration = totalDurationMs > 0 ? totalDurationMs : 1;
  const selectionIndicatorLeftPct = (startTimeMs / safeTotalDuration) * 100;
  const selectionIndicatorWidthPct = (durationMs / safeTotalDuration) * 100;
  const previewIndicatorLeftPct =
    (toMilliseconds(previewTime) / safeTotalDuration) * 100;

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
                {storyboardSpec && (
                  <TimelineStoryboard
                    virtualItems={storyboardVirtualizer.getVirtualItems()}
                    storyboardSpec={storyboardSpec}
                    totalDurationMs={totalDurationMs}
                  />
                )}
                <TimelineSegments
                  virtualItems={rowVirtualizer.getVirtualItems()}
                  totalDuration={totalDuration}
                  totalDurationMs={totalDurationMs}
                  fps={fps}
                />

                {/* Preview Highlight */}
                <div
                  className={css.previewHighlight}
                  style={{
                    left: 0,
                    transform: `translateX(${toMilliseconds(previewTime) * PIXELS_PER_MS}px)`,
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
