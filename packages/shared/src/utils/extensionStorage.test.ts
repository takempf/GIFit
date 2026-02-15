import { describe, it, expect, vi } from 'vitest';
import { storedConfig } from './extensionStorage';

// Mock wxt/utils/storage
vi.mock('wxt/utils/storage', () => ({
  storage: {
    defineItem: vi.fn((key, options) => ({ key, options }))
  }
}));

describe('storedConfig', () => {
  it('should define width configuration', () => {
    expect(storedConfig.width).toEqual({
      key: 'local:configWidth',
      options: { fallback: 420 }
    });
  });

  it('should define fps configuration', () => {
    expect(storedConfig.fps).toEqual({
      key: 'local:configFps',
      options: { fallback: 10 }
    });
  });

  it('should define quality configuration', () => {
    expect(storedConfig.quality).toEqual({
      key: 'local:configQuality',
      options: { fallback: 5 }
    });
  });
});
