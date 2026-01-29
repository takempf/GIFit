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
  const [isDragging, setIsDragging] = useState<
    'left' | 'right' | 'move' | null
  >(null);
  const dragOffsetRef = useRef<number>(0);

  // Calculate specific widths
  const pixelsPerFrame = PIXELS_PER_SECOND / fps;
  const totalWidth = totalDuration * PIXELS_PER_SECOND;

  // Store latest props in ref to avoid re-running effect on every prop change
  const propsRef = useRef({
    startTime,
    duration,
    totalDuration,
    fps,
    onStartTimeChange,
    onDurationChange,
    pixelsPerFrame: PIXELS_PER_SECOND / fps
  });

  // Update ref on every render
  propsRef.current = {
    startTime,
    duration,
    totalDuration,
    fps,
    onStartTimeChange,
    onDurationChange,
    pixelsPerFrame: PIXELS_PER_SECOND / fps
  };

  const autoScrollSpeedRef = useRef<number>(0);
  const lastMousePosRef = useRef<number | null>(null);

  // Handlers for Dragging
  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number;

    const updateDragState = (clientX: number) => {
      if (!scrollRef.current) return;

      const {
        startTime,
        duration,
        totalDuration,
        fps,
        onStartTimeChange,
        onDurationChange,
        pixelsPerFrame
      } = propsRef.current;

      // Calculate mouse position relative to the scroll content
      const rect = scrollRef.current.getBoundingClientRect();
      const scrollLeft = scrollRef.current.scrollLeft;
      const relativeX = clientX - rect.left + scrollLeft;

      // Snap to frame (used for handles)
      const rawFrameCount = Math.round(relativeX / pixelsPerFrame);
      const snappedTime = rawFrameCount / fps;

      // Current End Time (fixed if dragging left)
      const currentEndTime = startTime + duration;
      const minDuration = 1 / fps;

      if (isDragging === 'move') {
        const proposedLeftBytes = relativeX - dragOffsetRef.current;
        const snappedLeftFrame = Math.round(proposedLeftBytes / pixelsPerFrame);
        let newStart = snappedLeftFrame / fps;
        newStart = Math.max(0, newStart);
        newStart = Math.min(newStart, totalDuration - duration);
        if (newStart !== startTime) {
          onStartTimeChange(newStart);
        }
      } else if (isDragging === 'left') {
        let newStart = Math.max(0, snappedTime);
        newStart = Math.min(newStart, currentEndTime - minDuration);
        if (newStart !== startTime) {
          onStartTimeChange(newStart);
          const newDuration = currentEndTime - newStart;
          onDurationChange(newDuration);
        }
      } else if (isDragging === 'right') {
        let newEnd = Math.max(startTime + minDuration, snappedTime);
        newEnd = Math.min(newEnd, totalDuration);
        const newDuration = newEnd - startTime;
        if (newDuration !== duration) {
          onDurationChange(newDuration);
        }
      }
    };

    const performAutoScroll = () => {
      if (autoScrollSpeedRef.current !== 0 && scrollRef.current) {
        scrollRef.current.scrollLeft += autoScrollSpeedRef.current;
        // If we adhere to "continuous update" while scrolling, we should technically
        // re-run the drag logic here so the selection moves *with* the scroll
        // even if the mouse doesn't move. But simplistically, if the mouse moves
        // (which it usually does slightly) it triggers handleMouseMove.
        // However, if holding still at edge, we want selection to update.
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
        // intensity 0 to 1 based on how close to edge
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
    if (!scrollRef.current) return;

    // Check if we are interacting with a handle by checking target?
    // Actually, handles have stopPropagation, so we don't need to check here.

    const rect = scrollRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current.scrollLeft;
    const relativeX = e.clientX - rect.left + scrollLeft;

    const currentLeftPixel = startTime * PIXELS_PER_SECOND;
    dragOffsetRef.current = relativeX - currentLeftPixel;

    setIsDragging('move');
  };

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
            onMouseDown={handleSelectionMouseDown}
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
