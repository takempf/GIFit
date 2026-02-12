import { renderHook } from '@testing-library/react';
import { useScrollToHandles } from './useScrollToHandles';
import { TimelineSelectionHandle } from '../TimelineSelection/TimelineSelection';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

describe('useScrollToHandles', () => {
  let selectionRef: React.RefObject<TimelineSelectionHandle | null>;
  let scrollLeftIntoView: any;
  let scrollRightIntoView: any;

  beforeEach(() => {
    scrollLeftIntoView = vi.fn();
    scrollRightIntoView = vi.fn();
    selectionRef = {
      current: {
        scrollLeftIntoView,
        scrollRightIntoView,
        scrollIntoView: vi.fn()
      }
    };
  });

  it('scrolls left when startTimeMs changes', () => {
    const { rerender } = renderHook((props) => useScrollToHandles(props), {
      initialProps: {
        startTimeMs: 1000,
        durationMs: 2000,
        selectionRef,
        draggingState: null as 'left' | 'right' | 'move' | null
      }
    });

    // Update startTime
    rerender({
      startTimeMs: 1500,
      durationMs: 2000,
      selectionRef,
      draggingState: null
    });

    expect(scrollLeftIntoView).toHaveBeenCalledTimes(1);
    expect(scrollRightIntoView).not.toHaveBeenCalled();
  });

  it('scrolls right when durationMs changes', () => {
    const { rerender } = renderHook((props) => useScrollToHandles(props), {
      initialProps: {
        startTimeMs: 1000,
        durationMs: 2000,
        selectionRef,
        draggingState: null
      }
    });

    // Update duration
    rerender({
      startTimeMs: 1000,
      durationMs: 2500,
      selectionRef,
      draggingState: null
    });

    expect(scrollRightIntoView).toHaveBeenCalledTimes(1);
    expect(scrollLeftIntoView).not.toHaveBeenCalled();
  });

  it('scrolls left when startTimeMs AND durationMs change (prioritizes left)', () => {
    // Note: The logic handles startTime first.
    const { rerender } = renderHook((props) => useScrollToHandles(props), {
      initialProps: {
        startTimeMs: 1000,
        durationMs: 2000,
        selectionRef,
        draggingState: null
      }
    });

    // Update both
    rerender({
      startTimeMs: 1500,
      durationMs: 2500,
      selectionRef,
      draggingState: null
    });

    expect(scrollLeftIntoView).toHaveBeenCalledTimes(1);
    expect(scrollRightIntoView).not.toHaveBeenCalled();
  });

  it('does NOT scroll if draggingState is set', () => {
    const { rerender } = renderHook((props) => useScrollToHandles(props), {
      initialProps: {
        startTimeMs: 1000,
        durationMs: 2000,
        selectionRef,
        draggingState: 'left' as const
      }
    });

    // Update startTime while dragging
    rerender({
      startTimeMs: 1500,
      durationMs: 2000,
      selectionRef,
      draggingState: 'left' as const
    });

    expect(scrollLeftIntoView).not.toHaveBeenCalled();
    expect(scrollRightIntoView).not.toHaveBeenCalled();
  });

  it('resumes scrolling after dragging stops', () => {
    const { rerender } = renderHook((props) => useScrollToHandles(props), {
      initialProps: {
        startTimeMs: 1000,
        durationMs: 2000,
        selectionRef,
        draggingState: 'left' as 'left' | 'right' | 'move' | null
      }
    });

    // Update during drag -> no scroll
    rerender({
      startTimeMs: 1500,
      durationMs: 2000,
      selectionRef,
      draggingState: 'left' as const
    });
    expect(scrollLeftIntoView).not.toHaveBeenCalled();

    // Stop drag (startTime still 1500)
    // The effect runs, sees draggingState null.
    // prevStartTime was updated to 1500 during the last render even though we returned early?
    // Let's check the hook logic.
    // "if (draggingState) { ... return; }"
    // Yes, inside the "if (draggingState)" block, we update refs. So when it re-runs with draggingState=null,
    // prevStartTime matches current startTime (1500). So no scroll. THIS IS EXPECTED.
    // We don't want a jump right after dropping the handle (unless the user moves it again).

    rerender({
      startTimeMs: 1500,
      durationMs: 2000,
      selectionRef,
      draggingState: null as 'left' | 'right' | 'move' | null
    });

    expect(scrollLeftIntoView).not.toHaveBeenCalled();

    // Now update again
    rerender({
      startTimeMs: 1600,
      durationMs: 2000,
      selectionRef,
      draggingState: null as 'left' | 'right' | 'move' | null
    });

    expect(scrollLeftIntoView).toHaveBeenCalledTimes(1);
  });
});
