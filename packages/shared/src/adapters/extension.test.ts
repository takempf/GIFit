import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupPopupPort } from './extension';

const mockConnect = vi.fn();
const mockQuery = vi.fn();
const mockAddListener = vi.fn();
const mockRuntime: { lastError: { message: string } | undefined } = {
  lastError: undefined
};

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      connect: (...args: unknown[]) => mockConnect(...args),
      query: (...args: unknown[]) => mockQuery(...args)
    },
    // Use a getter so mockRuntime is resolved at access time (after initialization)
    get runtime() {
      return mockRuntime;
    }
  }
}));

describe('setupPopupPort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime.lastError = undefined;

    // Default mock implementation
    mockQuery.mockResolvedValue([{ id: 123 }]);
    mockConnect.mockReturnValue({
      onDisconnect: {
        addListener: mockAddListener
      },
      disconnect: vi.fn()
    });

    // Mock window.close
    vi.stubGlobal('close', vi.fn());
  });

  it('connects to the active tab', async () => {
    setupPopupPort();

    // Wait for the promise chain in setupPopupPort to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockQuery).toHaveBeenCalledWith({
      active: true,
      currentWindow: true
    });
    expect(mockConnect).toHaveBeenCalledWith(123, {
      name: 'GIFIT_POPUP_CONTEXT'
    });
  });

  it('closes popup on clean port disconnect (e.g. tab navigated away)', async () => {
    setupPopupPort();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockAddListener).toHaveBeenCalled();

    // Simulate clean disconnect — no lastError
    const disconnectCallback = mockAddListener.mock.calls[0][0];
    disconnectCallback();

    expect(window.close).toHaveBeenCalled();
  });

  it('does not close popup when port fails to connect (content script not on tab)', async () => {
    setupPopupPort();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockAddListener).toHaveBeenCalled();

    // Simulate error disconnect — Chrome sets runtime.lastError when no
    // receiving end exists (e.g. popup opened outside of a YouTube tab)
    mockRuntime.lastError = {
      message: 'Could not establish connection. Receiving end does not exist.'
    };
    const disconnectCallback = mockAddListener.mock.calls[0][0];
    disconnectCallback();

    expect(window.close).not.toHaveBeenCalled();
  });
});
