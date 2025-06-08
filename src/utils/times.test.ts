import { describe, it, expect, vi } from 'vitest';
import { times } from './times';

describe('times', () => {
  it('should call the callback the correct number of times and pass the correct index', () => {
    const callback = vi.fn();
    times(3, callback);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(0);
    expect(callback).toHaveBeenCalledWith(1);
    expect(callback).toHaveBeenCalledWith(2);
  });

  it('should collect and return the results from the callback', () => {
    const callback = (i: number) => `result-${i}`;
    const results = times(3, callback);
    expect(results).toEqual(['result-0', 'result-1', 'result-2']);
  });

  it('should return an empty array when n = 0', () => {
    const callback = vi.fn();
    const results = times(0, callback);
    expect(callback).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('should return an empty array when n < 0', () => {
    const callback = vi.fn();
    const results = times(-5, callback);
    expect(callback).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('should handle floating point numbers for count by flooring and taking max(0, ...)', () => {
    const callback = vi.fn((i: number) => i);
    let results = times(3.7, callback);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(results).toEqual([0, 1, 2]);

    callback.mockClear();
    results = times(0.9, callback);
    expect(callback).toHaveBeenCalledTimes(0);
    expect(results).toEqual([]);

    callback.mockClear();
    results = times(-2.5, callback);
    expect(callback).toHaveBeenCalledTimes(0);
    expect(results).toEqual([]);
  });
});
