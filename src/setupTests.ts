import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Element.prototype.getAnimations = () => [];

const mockRuntime = {
  id: 'test-id',
  getManifest: () => ({
    permissions: ['storage']
  })
};

const mockBrowser = {
  runtime: mockRuntime
} as unknown;

global.chrome = mockBrowser;
global.browser = mockBrowser;

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).chrome = mockBrowser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).browser = mockBrowser;
}

// Mock wxt/utils/storage since it runs at module scope and checks permissions
vi.mock('wxt/utils/storage', () => ({
  storage: {
    defineItem: (key: string, options: { fallback: unknown }) => ({
      getValue: async () => options.fallback,
      setValue: async () => {},
      watch: () => () => {}
    })
  }
}));
