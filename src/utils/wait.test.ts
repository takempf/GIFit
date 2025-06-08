import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wait } from './wait';

describe('wait', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve after the specified duration', async () => {
    const ms = 1000;
    const promise = wait(ms);

    // At this point, the promise should not have resolved yet
    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    // Advance timers by less than the specified time
    vi.advanceTimersByTime(ms - 1);
    expect(resolved).toBe(false);

    // Advance timers to the specified time
    vi.advanceTimersByTime(1);
    await promise; // Wait for the promise to settle after advancing timers
    expect(resolved).toBe(true);
  });

  it('should resolve immediately for 0 ms delay', async () => {
    const promise = wait(0);
    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    // For 0ms, it should resolve after the current event loop cycle + any microtasks.
    // Running all timers should ensure it resolves if it's setTimeout based.
    vi.runAllTimers();
    await promise;
    expect(resolved).toBe(true);
  });

  it('should handle negative ms by resolving immediately (as setTimeout clamps to 0)', async () => {
    const promise = wait(-100);
     let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    vi.runAllTimers();
    await promise;
    expect(resolved).toBe(true);
  });
});
