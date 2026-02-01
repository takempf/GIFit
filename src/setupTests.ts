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

// Extend Window interface to include chrome and browser
declare global {
  interface Window {
    chrome: unknown;
    browser: unknown;
  }
}

if (typeof window !== 'undefined') {
  window.chrome = mockBrowser;
  window.browser = mockBrowser;
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
