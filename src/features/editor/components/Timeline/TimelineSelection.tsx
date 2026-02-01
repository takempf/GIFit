import React from 'react';
import styles from './Timeline.module.css';

interface TimelineSelectionProps {
  startTimeMs: number;
  durationMs: number;
  pixelsPerMs: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onLeftDrag: (e: React.MouseEvent) => void;
  onRightDrag: (e: React.MouseEvent) => void;
}

export function TimelineSelection({
  startTimeMs,
  durationMs,
  pixelsPerMs,
  onMouseDown,
  onLeftDrag,
  onRightDrag
}: TimelineSelectionProps) {
  const selectionStyle = {
    left: `${startTimeMs * pixelsPerMs}px`,
    width: `${durationMs * pixelsPerMs}px`
  };

  return (
    <div
      className={styles.selection}
      style={selectionStyle}
      onMouseDown={onMouseDown}
      data-testid="selection-rect">
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
