import { useEffect, useRef } from 'react';
import { TimelineSelectionHandle } from '../TimelineSelection/TimelineSelection';

interface UseScrollToHandlesProps {
  startTimeMs: number;
  durationMs: number;
  selectionRef: React.RefObject<TimelineSelectionHandle | null>;
  draggingState: 'left' | 'right' | 'move' | null;
}

export function useScrollToHandles({
  startTimeMs,
  durationMs,
  selectionRef,
  draggingState
}: UseScrollToHandlesProps) {
  const prevStartTime = useRef(startTimeMs);
  const prevDuration = useRef(durationMs);

  useEffect(() => {
    // If we are currently dragging, do not auto-scroll.
    // The user is manually controlling the position.
    if (draggingState) {
      prevStartTime.current = startTimeMs;
      prevDuration.current = durationMs;
      return;
    }

    const startTimeChanged = startTimeMs !== prevStartTime.current;
    const durationChanged = durationMs !== prevDuration.current;

    if (startTimeChanged) {
      selectionRef.current?.scrollLeftIntoView();
    } else if (durationChanged) {
      // If only duration changed (or both, but we prioritize start usually,
      // but here 'else if' means if start DIDN'T change), scroll to right.
      // If both changed, usually it's a "move" which is covered by start time change.
      // If duration changes, end handle moves.
      selectionRef.current?.scrollRightIntoView();
    }

    prevStartTime.current = startTimeMs;
    prevDuration.current = durationMs;
  }, [startTimeMs, durationMs, draggingState, selectionRef]);
}
