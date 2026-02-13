import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from './useDebounce';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('test');
      result.current('test2');
      result.current('test3');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test3');
  });

  it('should respect maxWait', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(callback, 100, { maxWait: 200 })
    );

    // Call 1: Immediate/Leading edge because no previous call and maxWait set?
    // Actually, implementation says: if (!lastCallTime || now - lastCallTime >= maxWait) invoke();
    // So distinct FIRST call will be IMMEDIATE.
    act(() => result.current(1));
    expect(callback).toHaveBeenCalledWith(1); // Immediate

    // Call 2 at 50ms: 50ms < 200ms -> delay
    act(() => {
      vi.advanceTimersByTime(50);
      result.current(2);
    });

    // Call 3 at 100ms: 100ms < 200ms -> delay
    act(() => {
      vi.advanceTimersByTime(50);
      result.current(3);
    });

    // Call 4 at 150ms: 150ms < 200ms -> delay
    act(() => {
      vi.advanceTimersByTime(50);
      result.current(4);
    });

    // NOW at 200ms since last invoke (call 1).
    // result.current(5) should trigger immediately because now - lastCallTime >= 200
    act(() => {
      vi.advanceTimersByTime(50);
      result.current(5);
    });

    expect(callback).toHaveBeenCalledWith(5);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
