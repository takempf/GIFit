import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

Element.prototype.getAnimations = () => [];
Element.prototype.scrollIntoView = () => {};

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
  var chrome: unknown;
  var browser: unknown;
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
