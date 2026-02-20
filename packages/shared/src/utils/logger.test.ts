import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const testLogger = createLogger('Test');

  it('should log messages with the correct prefix and style', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const message = 'Test message';
    const data = { key: 'value' };

    testLogger.log(message, data);

    expect(consoleSpy).toHaveBeenCalledWith(
      '%cGIFit! %c[Test]',
      'color: rgb(207, 10, 55); font-weight: bold;',
      'color: rgb(231, 132, 155); font-weight: bold;',
      message,
      data
    );
  });

  it('should warn messages with the correct prefix and style', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const message = 'Warning message';

    testLogger.warn(message);

    expect(consoleSpy).toHaveBeenCalledWith(
      '%cGIFit! %c[Test]',
      'color: rgb(207, 10, 55); font-weight: bold;',
      'color: rgb(231, 132, 155); font-weight: bold;',
      message
    );
  });

  it('should error messages with the correct prefix and style', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const message = 'Error message';

    testLogger.error(message);

    expect(consoleSpy).toHaveBeenCalledWith(
      '%cGIFit! %c[Test]',
      'color: rgb(207, 10, 55); font-weight: bold;',
      'color: rgb(231, 132, 155); font-weight: bold;',
      message
    );
  });

  it('should handle multiple arguments', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    testLogger.log('A', 'B', 'C');

    expect(consoleSpy).toHaveBeenCalledWith(
      '%cGIFit! %c[Test]',
      'color: rgb(207, 10, 55); font-weight: bold;',
      'color: rgb(231, 132, 155); font-weight: bold;',
      'A',
      'B',
      'C'
    );
  });
});
