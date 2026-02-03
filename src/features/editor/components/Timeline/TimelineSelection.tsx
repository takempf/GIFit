import React from 'react';
import styles from './Timeline.module.css';

interface TimelineSelectionProps {
  startTimeMs: number;
  durationMs: number;
  pixelsPerMs: number;
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
      onMouseDown,
      onLeftDrag,
      onRightDrag,
      draggingState
    },
    ref
  ) => {
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
