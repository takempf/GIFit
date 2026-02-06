import React from 'react';
import styles from './TimelineSelection.module.css';

interface TimelineSelectionProps {
  startTimeMs: number;
  durationMs: number;
  pixelsPerMs: number;
  fps: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onLeftDrag: (e: React.MouseEvent) => void;
  onRightDrag: (e: React.MouseEvent) => void;
  draggingState: 'left' | 'right' | 'move' | null;
}

export const TimelineSelection = React.forwardRef<
  HTMLDivElement,
  TimelineSelectionProps
>(
  (
    {
      startTimeMs,
      durationMs,
      pixelsPerMs,
      fps,
      onMouseDown,
      onLeftDrag,
      onRightDrag,
      draggingState
    },
    ref
  ) => {
    const frameDurationMs = 1000 / fps;
    const GAP_PX = 1;
    const frameCount = Math.ceil(durationMs / frameDurationMs);

    const selectionStyle = {
      left: `${startTimeMs * pixelsPerMs}px`,
      width: `${durationMs * pixelsPerMs}px`
    };

    return (
      <div
        ref={ref}
        className={styles.selection}
        style={selectionStyle}
        onMouseDown={onMouseDown}
        data-testid="selection-rect"
        data-dragging={draggingState || undefined}>
        {/* Frames */}
        <div className={styles.framesContainer}>
          {Array.from({ length: frameCount }).map((_, i) => {
            const isLast = i === frameCount - 1;
            const fullFrameWidthPx = frameDurationMs * pixelsPerMs;
            const frameStartMs = i * frameDurationMs;
            const remainingMs = durationMs - frameStartMs;
            const clippedWidthPx = isLast
              ? Math.min(fullFrameWidthPx, remainingMs * pixelsPerMs)
              : fullFrameWidthPx;
            const widthWithGap = Math.max(0, clippedWidthPx - GAP_PX);

            return (
              <div
                key={i}
                className={styles.frame}
                style={{
                  width: `${widthWithGap}px`,
                  marginRight: `${GAP_PX}px`
                }}
              />
            );
          })}
        </div>

        {/* Handles */}
        <div
          className={`${styles.handle} ${styles.handleLeft}`}
          onMouseDown={onLeftDrag}
          data-testid="handle-left"
        />
        <div
          className={`${styles.handle} ${styles.handleRight}`}
          onMouseDown={onRightDrag}
          data-testid="handle-right"
        />
      </div>
    );
  }
);

TimelineSelection.displayName = 'TimelineSelection';
