import { useState, useRef, useEffect } from 'react';

interface UseTimelineDragProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  startTimeMs: number;
  durationMs: number;
  totalDurationMs: number;
  pixelsPerSecond: number;
  onChange: (
    newStartTime: number,
    newDuration: number,
    context: 'start' | 'end'
  ) => void;
}

export function useTimelineDrag({
  scrollRef,
  startTimeMs,
  durationMs,
  totalDurationMs,
  pixelsPerSecond,
  onChange
}: UseTimelineDragProps) {
  const [isDragging, setIsDragging] = useState<
    'left' | 'right' | 'move' | null
  >(null);
  const dragOffsetRef = useRef<number>(0);
  const anchorEndTimeRef = useRef<number>(0);
  const autoScrollSpeedRef = useRef<number>(0);
  const lastMousePosRef = useRef<number | null>(null);

  // Store latest props in ref to avoid re-running effect on every prop change
  const propsRef = useRef({
    startTimeMs,
    durationMs,
    totalDurationMs,
    pixelsPerSecond,
    onChange
  });

  // Update ref on every render
  propsRef.current = {
    startTimeMs,
    durationMs,
    totalDurationMs,
    pixelsPerSecond,
    onChange
  };

  // Handlers for Dragging
  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number;

    const updateDragState = (clientX: number) => {
      if (!scrollRef.current) return;

      const {
        startTimeMs,
        durationMs,
        totalDurationMs,
        pixelsPerSecond,
        onChange
      } = propsRef.current;

      const PIXELS_PER_MS = pixelsPerSecond / 1000;

      // Calculate mouse position relative to the scroll content
      const rect = scrollRef.current.getBoundingClientRect();
      const scrollLeft = scrollRef.current.scrollLeft;
      const relativeX = clientX - rect.left + scrollLeft;

      // Calculate approximate time in ms from pixels
      const rawMs = relativeX / PIXELS_PER_MS;

      // No snapping, use rawMs directly (clamped logic below handles boundaries)
      const targetTimeMs = rawMs;

      // Current End Time (fixed if dragging left)

      if (isDragging === 'move') {
        handleMoveDrag(
          relativeX,
          dragOffsetRef.current,
          startTimeMs,
          durationMs,
          totalDurationMs,
          PIXELS_PER_MS,
          onChange
        );
      } else if (isDragging === 'left') {
        handleLeftResize(
          targetTimeMs,
          anchorEndTimeRef.current,
          startTimeMs,
          durationMs,
          onChange
        );
      } else if (isDragging === 'right') {
        handleRightResize(
          targetTimeMs,
          startTimeMs,
          durationMs,
          totalDurationMs,
          onChange
        );
      }
    };

    const handleMoveDrag = (
      relativeX: number,
      dragOffset: number,
      currentStartMs: number,
      durationMs: number,
      totalDurationMs: number,
      pixelsPerMs: number,
      onChange: UseTimelineDragProps['onChange']
    ) => {
      const proposedLeftBytes = relativeX - dragOffset;
      // Convert pixels back to ms
      let newStartMs = proposedLeftBytes / pixelsPerMs;

      newStartMs = Math.max(0, newStartMs);
      newStartMs = Math.min(newStartMs, totalDurationMs - durationMs);

      if (Math.abs(newStartMs - currentStartMs) > 0.001) {
        onChange(newStartMs, durationMs, 'start');
      }
    };

    const handleLeftResize = (
      targetTimeMs: number,
      anchorEndTimeMs: number,
      currentStartMs: number,
      currentDurationMs: number,
      onChange: UseTimelineDragProps['onChange']
    ) => {
      const minDurationMs = 1; // Allow arbitrary small duration (1ms)
      let newStartMs = Math.max(0, targetTimeMs);
      newStartMs = Math.min(newStartMs, anchorEndTimeMs - minDurationMs);

      if (Math.abs(newStartMs - currentStartMs) > 0.001) {
        const newDurationMs = anchorEndTimeMs - newStartMs;
        onChange(newStartMs, newDurationMs, 'start');
      }
    };

    const handleRightResize = (
      targetTimeMs: number,
      currentStartMs: number,
      currentDurationMs: number,
      totalDurationMs: number,
      onChange: UseTimelineDragProps['onChange']
    ) => {
      const minDurationMs = 1;
      let newEndMs = Math.max(currentStartMs + minDurationMs, targetTimeMs);
      newEndMs = Math.min(newEndMs, totalDurationMs);

      const newDurationMs = newEndMs - currentStartMs;
      if (Math.abs(newDurationMs - currentDurationMs) > 0.001) {
        onChange(currentStartMs, newDurationMs, 'end');
      }
    };

    const performAutoScroll = () => {
      if (autoScrollSpeedRef.current !== 0 && scrollRef.current) {
        scrollRef.current.scrollLeft += autoScrollSpeedRef.current;
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
  }, [isDragging, scrollRef]);

  // Handle Mouse Down on Selection Body
  const handleSelectionMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!scrollRef.current) return;

    const rect = scrollRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current.scrollLeft;
    const relativeX = e.clientX - rect.left + scrollLeft;

    const { pixelsPerSecond } = propsRef.current;
    const PIXELS_PER_MS = pixelsPerSecond / 1000;

    const currentLeftPixel = startTimeMs * PIXELS_PER_MS;
    dragOffsetRef.current = relativeX - currentLeftPixel;

    setIsDragging('move');
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;

    const rect = scrollRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current.scrollLeft;
    const relativeX = e.clientX - rect.left + scrollLeft;

    const { pixelsPerSecond } = propsRef.current;
    const PIXELS_PER_MS = pixelsPerSecond / 1000;

    const rawMs = relativeX / PIXELS_PER_MS;
    // No snapping
    let newStartMs = rawMs;

    // Clamp to valid range
    newStartMs = Math.max(0, newStartMs);
    newStartMs = Math.min(newStartMs, totalDurationMs - durationMs);

    if (newStartMs !== startTimeMs) {
      onChange(newStartMs, durationMs, 'start');
    }
  };

  const startLeftDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Set anchor for left drag
    anchorEndTimeRef.current = startTimeMs + durationMs;
    setIsDragging('left');
  };

  const startRightDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging('right');
  };

  return {
    isDragging: isDragging !== null,
    draggingState: isDragging,
    handleSelectionMouseDown,
    handleBackgroundMouseDown,
    startLeftDrag,
    startRightDrag
  };
}
