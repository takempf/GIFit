import React, { useRef, useState, useEffect, useMemo } from 'react';
import styles from './Timeline.module.css';
import {
  toMilliseconds,
  toSeconds,
  formatMilliseconds
} from '../../utils/time';

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

const PIXELS_PER_SECOND = 120;
const PIXELS_PER_MS = PIXELS_PER_SECOND / 1000;

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

  // Dragging State
  const [isDragging, setIsDragging] = useState<
    'left' | 'right' | 'move' | null
  >(null);
  const dragOffsetRef = useRef<number>(0);
  const anchorEndTimeRef = useRef<number>(0);

  // Calculate specific widths
  // const pixelsPerFrame = PIXELS_PER_SECOND / fps;

  // Convert props to ms for internal calculations
  const totalDurationMs = toMilliseconds(totalDuration);
  const startTimeMs = toMilliseconds(startTime);
  const durationMs = toMilliseconds(duration);

  const totalWidth = totalDurationMs * PIXELS_PER_MS;

  // Store latest props in ref to avoid re-running effect on every prop change
  const propsRef = useRef({
    startTimeMs,
    durationMs,
    totalDurationMs,
    fps,
    onChange
  });

  // Update ref on every render
  propsRef.current = {
    startTimeMs,
    durationMs,
    totalDurationMs,
    fps,
    onChange
  };

  const autoScrollSpeedRef = useRef<number>(0);
  const lastMousePosRef = useRef<number | null>(null);
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
  }, [startTimeMs]);

  // Handlers for Dragging
  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number;

    const updateDragState = (clientX: number) => {
      if (!scrollRef.current) return;

      const { startTimeMs, durationMs, totalDurationMs, onChange } =
        propsRef.current;

      // Calculate mouse position relative to the scroll content
      const rect = scrollRef.current.getBoundingClientRect();
      const scrollLeft = scrollRef.current.scrollLeft;
      const relativeX = clientX - rect.left + scrollLeft;

      // Calculate approximate time in ms from pixels
      const rawMs = relativeX / PIXELS_PER_MS;

      // No snapping, use rawMs directly (clamped logic below handles boundaries)
      const targetTimeMs = rawMs;

      // Current End Time (fixed if dragging left)
      // We use the anchor for left drags to prevent floating point drift
      const anchorEndTimeMs = anchorEndTimeRef.current;
      // const minDurationMs = Math.floor(1000 / fps); // Minimum 1 frame duration
      const minDurationMs = 1; // Allow arbitrary small duration (1ms)

      if (isDragging === 'move') {
        const proposedLeftBytes = relativeX - dragOffsetRef.current;
        // Convert pixels back to ms
        let newStartMs = proposedLeftBytes / PIXELS_PER_MS;

        newStartMs = Math.max(0, newStartMs);
        newStartMs = Math.min(newStartMs, totalDurationMs - durationMs);

        if (Math.abs(newStartMs - startTimeMs) > 0.001) {
          onChange(toSeconds(newStartMs), toSeconds(durationMs), 'start');
        }
      } else if (isDragging === 'left') {
        let newStartMs = Math.max(0, targetTimeMs);
        newStartMs = Math.min(newStartMs, anchorEndTimeMs - minDurationMs);

        if (Math.abs(newStartMs - startTimeMs) > 0.001) {
          const newDurationMs = anchorEndTimeMs - newStartMs;
          onChange(toSeconds(newStartMs), toSeconds(newDurationMs), 'start');
        }
      } else if (isDragging === 'right') {
        let newEndMs = Math.max(startTimeMs + minDurationMs, targetTimeMs);
        newEndMs = Math.min(newEndMs, totalDurationMs);

        const newDurationMs = newEndMs - startTimeMs;
        if (Math.abs(newDurationMs - durationMs) > 0.001) {
          onChange(toSeconds(startTimeMs), toSeconds(newDurationMs), 'end');
        }
      }
    };

    const performAutoScroll = () => {
      if (autoScrollSpeedRef.current !== 0 && scrollRef.current) {
        scrollRef.current.scrollLeft += autoScrollSpeedRef.current;
        if (lastMousePosRef.current !== null) {
          updateDragState(lastMousePosRef.current);
        }
      }
      animationFrameId = requestAnimationFrame(performAutoScroll);
    };

    // Start the loop
    performAutoScroll();

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = e.clientX;
      updateDragState(e.clientX);

      // Check for auto-scroll
      if (!scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const edgeThreshold = 50; // pixels from edge to trigger scroll
      const maxScrollSpeed = 10; // pixels per frame

      if (e.clientX < rect.left + edgeThreshold) {
        // Scroll Left
        const intensity = Math.max(
          0,
          (rect.left + edgeThreshold - e.clientX) / edgeThreshold
        );
        autoScrollSpeedRef.current = -intensity * maxScrollSpeed;
      } else if (e.clientX > rect.right - edgeThreshold) {
        // Scroll Right
        const intensity = Math.max(
          0,
          (e.clientX - (rect.right - edgeThreshold)) / edgeThreshold
        );
        autoScrollSpeedRef.current = intensity * maxScrollSpeed;
      } else {
        autoScrollSpeedRef.current = 0;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      autoScrollSpeedRef.current = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]);

  // Handle Mouse Down on Selection Body
  const handleSelectionMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!scrollRef.current) return;

    const rect = scrollRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current.scrollLeft;
    const relativeX = e.clientX - rect.left + scrollLeft;

    const currentLeftPixel = startTimeMs * PIXELS_PER_MS;
    dragOffsetRef.current = relativeX - currentLeftPixel;

    setIsDragging('move');
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;

    const rect = scrollRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current.scrollLeft;
    const relativeX = e.clientX - rect.left + scrollLeft;

    const rawMs = relativeX / PIXELS_PER_MS;
    // No snapping
    let newStartMs = rawMs;

    // Clamp to valid range
    newStartMs = Math.max(0, newStartMs);
    newStartMs = Math.min(newStartMs, totalDurationMs - durationMs);

    if (newStartMs !== startTimeMs) {
      onChange(toSeconds(newStartMs), toSeconds(durationMs), 'start');
    }
  };

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
          style={{ left: `${i * PIXELS_PER_SECOND}px` }}>
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
  }, [totalDuration, fps, totalDurationMs]);

  const selectionStyle = {
    left: `${startTimeMs * PIXELS_PER_MS}px`,
    width: `${durationMs * PIXELS_PER_MS}px`
  };

  return (
    <div
      className={`${styles.timeline} ${className || ''}`}
      ref={containerRef}
      data-testid="timeline-container">
      <div
        className={styles.scrollContainer}
        ref={scrollRef}
        data-testid="scroll-container">
        <div
          className={styles.interior}
          style={{ width: `${totalWidth}px` }}
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
              onMouseDown={(e) => {
                e.stopPropagation();
                // Set anchor for left drag
                anchorEndTimeRef.current = startTimeMs + durationMs;
                setIsDragging('left');
              }}
              data-testid="handle-left"
            />
            <div
              className={`${styles.handle} ${styles.handleRight}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDragging('right');
              }}
              data-testid="handle-right"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
