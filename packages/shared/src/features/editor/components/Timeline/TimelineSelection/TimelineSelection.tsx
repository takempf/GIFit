import React, { useRef, useImperativeHandle } from 'react';

import { useVisibilityObserver } from '../../../hooks/useVisibilityObserver';

import css from './TimelineSelection.module.css';

interface TimelineSelectionProps {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
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
      draggingState,
      ...props // capture remaining props including scrollContainerRef
    },
    ref
  ) => {
    const selectionContainerRef = useRef<HTMLDivElement>(null);
    const leftHandleRef = useRef<HTMLDivElement>(null);
    const rightHandleRef = useRef<HTMLDivElement>(null);

    const SCROLL_MARGIN = 100;

    const leftVisible = useVisibilityObserver(leftHandleRef, {
      root: props.scrollContainerRef?.current,
      rootMargin: `0px -${SCROLL_MARGIN}px 0px -${SCROLL_MARGIN}px`
    });

    const rightVisible = useVisibilityObserver(rightHandleRef, {
      root: props.scrollContainerRef?.current,
      rootMargin: `0px -${SCROLL_MARGIN}px 0px -${SCROLL_MARGIN}px`
    });

    useImperativeHandle(ref, () => ({
      scrollLeftIntoView: () => {
        const container = props.scrollContainerRef?.current;
        if (!container || leftVisible) return;

        const handleCenter = startTimeMs * pixelsPerMs;
        const targetScrollLeft = handleCenter - SCROLL_MARGIN;

        container.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
        });
      },
      scrollRightIntoView: () => {
        const container = props.scrollContainerRef?.current;
        if (!container || rightVisible) return;

        const handleCenter = (startTimeMs + durationMs) * pixelsPerMs;
        const containerWidth = container.clientWidth;
        const targetScrollLeft = handleCenter + SCROLL_MARGIN - containerWidth;

        container.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
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
