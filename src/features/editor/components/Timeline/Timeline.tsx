import { ScrollArea } from '@base-ui/react/scroll-area';
import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import styles from './Timeline.module.css';
import { toMilliseconds } from '@/utils/time';
import { browser } from 'wxt/browser';
import { parseStoryboardSpec, StoryboardLevel } from '@/utils/storyboard';

import { useTimelineDrag } from '../../hooks/useTimelineDrag';
import { TimelineSelection } from './TimelineSelection';
import { TimelineSegments } from './TimelineSegments';
import { TimelineStoryboardLayer } from './TimelineStoryboardLayer';

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
  const selectionRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [storyboardSpec, setStoryboardSpec] = useState<{
    baseUrl: string;
    levels: StoryboardLevel[];
  } | null>(null);

  useEffect(() => {
    // Reset storyboard when video changes
    setStoryboardSpec(null);

    // Fetch storyboard spec
    const fetchStoryboard = async () => {
      console.log('TIMELINE: fetching stoyboard spec');
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true
        });
        const activeTab = tabs[0];

        console.log('TIMELINE: active tab', activeTab);

        if (!activeTab?.id) {
          console.warn('Timeline: No active tab found');
          return;
        }

        console.log('TIMELINE: sending message to active tab');

        const response = await browser.tabs.sendMessage(activeTab.id, {
          type: 'GET_STORYBOARD'
        });

        console.log('TIMELINE: received response', response);

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

  const updateGradients = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftGradient(scrollLeft > 0);
    setShowRightGradient(scrollLeft + clientWidth < scrollWidth - 1);
  };

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

  useEffect(() => {
    updateGradients();
  }, [containerWidth, totalDuration]);

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
          {/* Preview Indicator on Scrollbar Track */}
          <div
            className={styles.scrollbarPreviewHighlighter}
            style={{
              left: `${previewIndicatorLeftPct}%`,
              width: '1px'
            }}
          />
        </ScrollArea.Scrollbar>

        <div className={styles.viewportContainer}>
          <div
            className={`${styles.gradient} ${styles.gradientLeft}`}
            style={{ opacity: showLeftGradient ? 1 : 0 }}
            data-testid="gradient-left"
          />
          <div
            className={`${styles.gradient} ${styles.gradientRight}`}
            style={{ opacity: showRightGradient ? 1 : 0 }}
            data-testid="gradient-right"
          />

          <ScrollArea.Viewport
            className={styles.scrollViewport}
            ref={scrollRef}
            data-testid="scroll-container"
            onScroll={updateGradients}>
            <ScrollArea.Content
              className={styles.scrollContent}
              style={{ width: `${rowVirtualizer.getTotalSize()}px` }}>
              <div
                className={styles.interior}
                onMouseDown={handleBackgroundMouseDown}
                data-testid="timeline-interior">
                {/* Content Layer (Ticks + Storyboard) */}
                {storyboardSpec && (
                  <TimelineStoryboardLayer
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
                  className={styles.previewHighlight}
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
                  draggingState={draggingState}
                />
              </div>
            </ScrollArea.Content>
          </ScrollArea.Viewport>
        </div>
      </ScrollArea.Root>
    </div>
  );
}
