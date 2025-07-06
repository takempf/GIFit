// src/setupTests.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the browser APIs that @wxt-dev/storage might use.
// Based on the error, 'runtime' is the key one.
// The actual storage calls are mocked per-test file where necessary (e.g., configurationPanelStore.test.ts)
// This global mock prevents 'browser.runtime' from being undefined.
vi.stubGlobal('browser', {
  runtime: {
    sendMessage: vi.fn((message) => {
      // console.log('browser.runtime.sendMessage called in test with:', message);
      // Simulate a response if specific tests depend on it, though for storage it might not be needed
      // or might be a fire-and-forget.
      if (message?.type === 'wxt:storage-service-message') {
        // This is a guess at how @wxt-dev/storage might communicate for some operations.
        // For basic local storage getItem/setItem, it might not even use sendMessage.
        return Promise.resolve({});
      }
      return Promise.resolve();
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false)
    },
    id: 'test-extension-id', // Some extensions check id
    getURL: vi.fn((path) => `chrome-extension://test-extension-id/${path}`),
    // Add any other properties that @wxt-dev/storage might access during initialization or use.
    // For example, lastError might be checked.
    lastError: undefined // or null
  },
  // Mock other browser APIs if they become problematic in other tests.
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve())
    },
    sync: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve())
    },
    managed: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve())
    },
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve())
    }
    // onChained also exists on storage, but might not be needed for this mock
  }
});
