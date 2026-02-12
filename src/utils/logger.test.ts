import { describe, it, expect, vi, afterEach } from 'vitest';
import { log } from './logger';

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log messages with the correct prefix and style', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const message = 'Test message';
    const data = { key: 'value' };

    log(message, data);

    expect(consoleSpy).toHaveBeenCalledWith(
      '%cGIFit!',
      'color: red; font-weight: bold;',
      message,
      data
    );
  });

  it('should handle multiple arguments', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    log('A', 'B', 'C');

    expect(consoleSpy).toHaveBeenCalledWith(
      '%cGIFit!',
      'color: red; font-weight: bold;',
      'A',
      'B',
      'C'
    );
  });
});
