import React from 'react';

import css from './TimelineSelection.module.css';

interface TimelineSelectionProps {
  startTimeMs: number;
  durationMs: number;
  pixelsPerMs: number;
  fps: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onLeftDrag: (e: React.MouseEvent) => void;
  onRightDrag: (e: React.MouseEvent) => void;
  onLeftFocus: () => void;
  onRightFocus: () => void;
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
      onLeftFocus,
      onRightFocus,
      draggingState
    },
    ref
  ) => {
    const frameDurationMs = 1000 / fps;
    const frameCount = Math.ceil(durationMs / frameDurationMs);

    const selectionStyle = {
      left: 0,
      transform: `translateX(${startTimeMs * pixelsPerMs}px)`,
      width: `${durationMs * pixelsPerMs}px`
    };

    return (
      <div
        ref={ref}
        className={css.selection}
        style={selectionStyle}
        onMouseDown={onMouseDown}
        data-testid="selection-rect"
        data-dragging={draggingState || undefined}>
        {/* Frames */}
        <div
          className={css.framesContainer}
          style={{
            width: `${frameCount * frameDurationMs * pixelsPerMs}px`
          }}>
          {Array.from({ length: frameCount }).map((_, i) => {
            return <div key={i} className={css.frame} style={{}} />;
          })}
        </div>

        {/* Handles */}
        <div
          className={`${css.handle} ${css.handleLeft}`}
          onMouseDown={onLeftDrag}
          onFocus={onLeftFocus}
          tabIndex={0}
          data-testid="handle-left"
        />
        <div
          className={`${css.handle} ${css.handleRight}`}
          onMouseDown={onRightDrag}
          onFocus={onRightFocus}
          tabIndex={0}
          data-testid="handle-right"
        />
      </div>
    );
  }
);

TimelineSelection.displayName = 'TimelineSelection';
