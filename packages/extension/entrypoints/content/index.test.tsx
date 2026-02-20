import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

const {
  mockDefineContentScript,
  mockAddListener,
  mockRemoveListener,
  mockSendMessage,
  mockGetURL
} = vi.hoisted(() => ({
  mockDefineContentScript: vi.fn((config) => config),
  mockAddListener: vi.fn(),
  mockRemoveListener: vi.fn(),
  mockSendMessage: vi.fn().mockResolvedValue(undefined),
  mockGetURL: vi.fn()
}));

// Mock WXT modules
vi.mock('wxt/utils/define-content-script', () => ({
  defineContentScript: mockDefineContentScript
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onConnect: {
        addListener: mockAddListener,
        removeListener: mockRemoveListener
      },
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      sendMessage: mockSendMessage,
      getURL: mockGetURL
    }
  }
}));

// Mock Shared Services
vi.mock('@gifit/shared', () => ({
  GifService: class {
    on() {}
    abort() {}
  },
  createLogger: vi.fn(() => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })),
  findBestVideo: vi.fn()
}));

vi.mock('./MigrationNotice', () => ({
  MigrationNotice: () => null
}));

// Import the content script (this will trigger defineContentScript)
import contentScript from './index';

describe('Content Script Navigation Logic', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ctxMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let disconnectMock: any;
  let locationChangeHandler: (event: Event) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';

    disconnectMock = vi.fn();

    // Mock the context object passed to main
    ctxMock = {
      addEventListener: vi.fn((target, event, handler) => {
        if (event === 'wxt:locationchange') {
          locationChangeHandler = handler;
        }
      })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disconnects the popup port on navigation', async () => {
    // Run the content script's main function
    await contentScript.main(ctxMock);

    // Verify location change listener was added
    expect(ctxMock.addEventListener).toHaveBeenCalledWith(
      expect.anything(),
      'wxt:locationchange',
      expect.any(Function)
    );

    // Simulate popup connection
    const connectHandler = mockAddListener.mock.calls[0][0];
    const mockPort = {
      name: 'GIFIT_POPUP_CONTEXT',
      onDisconnect: { addListener: vi.fn() },
      disconnect: disconnectMock
    };

    // Connect the popup
    connectHandler(mockPort);

    // Trigger navigation event
    locationChangeHandler(new Event('wxt:locationchange'));

    // Verify disconnect was called
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('does not crash if port is already disconnected', async () => {
    await contentScript.main(ctxMock);

    const connectHandler = mockAddListener.mock.calls[0][0];
    const mockPort = {
      name: 'GIFIT_POPUP_CONTEXT',
      onDisconnect: { addListener: vi.fn() },
      disconnect: disconnectMock
    };

    connectHandler(mockPort);

    // Make disconnect throw (simulate already disconnected)
    disconnectMock.mockImplementation(() => {
      throw new Error('Extension context invalidated');
    });

    // Trigger navigation - should handle exception gracefully
    expect(() => {
      locationChangeHandler(new Event('wxt:locationchange'));
    }).not.toThrow();
  });
});
