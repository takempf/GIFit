import React, { useRef, useImperativeHandle } from 'react';

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
  onLeftKeyDown: (e: React.KeyboardEvent) => void;
  onRightKeyDown: (e: React.KeyboardEvent) => void;
  draggingState: 'left' | 'right' | 'move' | null;
}

export interface TimelineSelectionHandle {
  scrollLeftIntoView: () => void;
  scrollRightIntoView: () => void;
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
}

export const TimelineSelection = React.forwardRef<
  TimelineSelectionHandle,
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
      onLeftKeyDown,
      onRightKeyDown,
      draggingState
    },
    ref
  ) => {
    const selectionContainerRef = useRef<HTMLDivElement>(null);
    const leftHandleRef = useRef<HTMLDivElement>(null);
    const rightHandleRef = useRef<HTMLDivElement>(null);

    const SCROLL_MARGIN = 100;

    const isInViewport = (el: HTMLElement, edge: 'left' | 'right'): boolean => {
      const scrollContainer = el.closest('[data-testid="scroll-container"]');
      if (!scrollContainer) return true;

      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      if (edge === 'left') {
        return elRect.left >= containerRect.left + SCROLL_MARGIN;
      }
      return elRect.right <= containerRect.right - SCROLL_MARGIN;
    };

    useImperativeHandle(ref, () => ({
      scrollLeftIntoView: () => {
        const el = leftHandleRef.current;
        if (!el || isInViewport(el, 'left')) return;
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start'
        });
      },
      scrollRightIntoView: () => {
        const el = rightHandleRef.current;
        if (!el || isInViewport(el, 'right')) return;
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'end'
        });
      },
      scrollIntoView: (options?: ScrollIntoViewOptions) => {
        selectionContainerRef.current?.scrollIntoView(options);
      }
    }));

    const frameDurationMs = 1000 / fps;
    const frameCount = Math.ceil(durationMs / frameDurationMs);

    const selectionStyle = {
      left: 0,
      transform: `translateX(${startTimeMs * pixelsPerMs}px)`,
      width: `${durationMs * pixelsPerMs}px`
    };

    return (
      <div
        ref={selectionContainerRef}
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
          ref={leftHandleRef}
          className={`${css.handle} ${css.handleLeft}`}
          onMouseDown={onLeftDrag}
          onFocus={onLeftFocus}
          onKeyDown={onLeftKeyDown}
          tabIndex={0}
          data-testid="handle-left"
          role="slider"
          aria-label="Selection start"
          aria-valuemin={0}
        />
        <div
          ref={rightHandleRef}
          className={`${css.handle} ${css.handleRight}`}
          onMouseDown={onRightDrag}
          onFocus={onRightFocus}
          onKeyDown={onRightKeyDown}
          tabIndex={0}
          data-testid="handle-right"
          role="slider"
          aria-label="Selection end"
        />
      </div>
    );
  }
);

TimelineSelection.displayName = 'TimelineSelection';
