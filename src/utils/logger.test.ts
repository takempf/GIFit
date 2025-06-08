import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from './logger'; // Assuming log is the default or named export

describe('logger', () => {
  beforeEach(() => {
    // Spy on console.log before each test
    vi.spyOn(console, 'log').mockImplementation(() => {}); // Mock implementation to prevent actual logging
  });

  afterEach(() => {
    // Restore original console.log after each test
    vi.restoreAllMocks();
  });

  it('should call console.log with the correct prefix and style', () => {
    log('Test message');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      '%cGIFit!',
      'color: red; font-weight: bold;',
      'Test message'
    );
  });

  it('should pass multiple arguments to console.log after the prefix', () => {
    const obj = { a: 1, b: 2 };
    log('Test message', 123, obj);
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      '%cGIFit!',
      'color: red; font-weight: bold;',
      'Test message',
      123,
      obj
    );
  });

  it('should handle calls with no message arguments (only prefix should be logged)', () => {
    log();
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      '%cGIFit!',
      'color: red; font-weight: bold;'
    );
  });

  // If the logger had different levels (e.g., log.warn, log.error),
  // similar tests would be created for each, spying on console.warn, console.error, etc.
  // Since it only has one `log` function, these are not applicable.

  // If the logger had conditional logging based on environment (dev/prod),
  // tests for that would go here, potentially mocking import.meta.env.
  // e.g., vi.stubEnv('DEV', true); ... vi.unstubAllEnvs();
  // Since it doesn't, these are not applicable.
});
