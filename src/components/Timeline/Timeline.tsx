import React, { useRef, useState, useEffect, useMemo } from 'react';
import styles from './Timeline.module.css';

interface TimelineProps {
  totalDuration: number;
  startTime: number;
  duration: number; // Selection duration
  fps: number;
  onStartTimeChange: (newStartTime: number) => void;
  onDurationChange: (newDuration: number) => void;
  className?: string;
}

const PIXELS_PER_SECOND = 120;

export function Timeline({
  totalDuration,
  startTime,
  duration,
  fps,
  onStartTimeChange,
  onDurationChange,
  className
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dragging State
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);

  // Calculate specific widths
  const pixelsPerFrame = PIXELS_PER_SECOND / fps;
  const totalWidth = totalDuration * PIXELS_PER_SECOND;

  // Handlers for Dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;

      // Calculate mouse position relative to the scroll content
      const rect = scrollRef.current.getBoundingClientRect();
      const scrollLeft = scrollRef.current.scrollLeft;
      // We want X relative to the *content*, so we add scrollLeft
      // But getBoundingClientRect includes the blocked-out part?
      // Actually: clientX - rect.left gives x relative to viewport of element.
      // plus scrollLeft gives x relative to content start.

      const relativeX = e.clientX - rect.left + scrollLeft;

      // Snap to frame
      const rawFrameCount = Math.round(relativeX / pixelsPerFrame);
      const snappedTime = rawFrameCount / fps;

      // Current End Time (fixed if dragging left)
      const currentEndTime = startTime + duration;

      if (isDragging === 'left') {
        // Dragging left handle changes startTime.
        // Constraint: 0 <= newStart < currentEndTime
        // Minimal selection: 1 frame?
        const minDuration = 1 / fps;
        let newStart = Math.max(0, snappedTime);
        newStart = Math.min(newStart, currentEndTime - minDuration);

        if (newStart !== startTime) {
          onStartTimeChange(newStart);
          // Also need to update duration if we want end time to stay fixed
          // Since prop is 'duration', and start time changed, we must update duration
          // to keep the right edge in place?
          // Actually, usually onStartTimeChange is just setting the start property.
          // If the parent manages state, updating Start without updating Duration
          // would shift the whole block (Start moves, Duration constant -> End moves).
          // But typical timeline interaction: Left handle moves left edge only.
          // So we likely need to notify parent to update Duration too?
          // The prompt says: "modifies the startTime", "modifies the duration".
          // If I drag left handle, I strictly modify start time.
          // If I simply set StartTime, and Duration remains constant, the block slides.
          // That is usually NOT what a "handle" does (that's what dragging the body does).
          // A handle resizes.
          // So I should probably calculate the new duration as well?
          // But the prop only asks for `onStartTimeChange`.
          // I will assume the parent handles the logic or I should call both?
          // Prompt: "It should have a handle on the left that, when dragged, modifies the startTime"
          // Let's assume for now that changing startTime implies the user wants to shift the start.
          // If the user meant "resize", they might have implied updating duration too.
          // Given "modifies duration" is explicitly on the RIGHT handle,
          // I will assume Left Handle -> Resize Left.
          // So: New Duration = Old End - New Start.
          const newDuration = currentEndTime - newStart;
          onDurationChange(newDuration); // Call this too?
        }
      } else if (isDragging === 'right') {
        // Dragging right handle changes duration.
        // Constraint: newEnd <= totalDuration
        // newEnd > startTime
        const minDuration = 1 / fps;
        let newEnd = Math.max(startTime + minDuration, snappedTime);
        newEnd = Math.min(newEnd, totalDuration);

        const newDuration = newEnd - startTime;
        if (newDuration !== duration) {
          onDurationChange(newDuration);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    startTime,
    duration,
    totalDuration,
    fps,
    pixelsPerFrame,
    onStartTimeChange,
    onDurationChange
  ]);

  // Generate Ticks
  // Using useMemo to avoid re-calculating on every render if not needed
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
          {formatTime(i)}
        </div>
      );

      // Frame Markers (between this second and next)
      // Only draw if not the last second (or if we have partial second at end)
      if (i < totalDuration) {
        for (let f = 1; f < fps; f++) {
          const frameTime = i + f / fps;
          if (frameTime > totalDuration) break;
          ticks.push(
            <div
              key={`frame-${i}-${f}`}
              className={styles.frameMarker}
              style={{ left: `${frameTime * PIXELS_PER_SECOND}px` }}
            />
          );
        }
      }
    }
    return ticks;
  }, [totalDuration, fps]);

  // Generate Frame Children for Selection
  // "It should have children that represent the number of frames it spans."
  const selectionFrames = useMemo(() => {
    // Number of frames in current duration
    const frameCount = Math.round(duration * fps);
    return Array.from({ length: frameCount }).map((_, i) => (
      <div key={`sel-frame-${i}`} className={styles.selectionFrame} />
    ));
  }, [duration, fps]);

  const selectionStyle = {
    left: `${startTime * PIXELS_PER_SECOND}px`,
    width: `${duration * PIXELS_PER_SECOND}px`
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
        <div className={styles.interior} style={{ width: `${totalWidth}px` }}>
          {/* Ticks Layer */}
          {renderTicks}

          {/* Selection Layer */}
          <div
            className={styles.selection}
            style={selectionStyle}
            data-testid="selection-rect">
            {/* Frames Visual */}
            {selectionFrames}

            {/* Handles */}
            <div
              className={`${styles.handle} ${styles.handleLeft}`}
              onMouseDown={(e) => {
                e.stopPropagation();
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
