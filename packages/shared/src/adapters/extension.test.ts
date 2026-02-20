import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupPopupPort } from './extension';

const mockConnect = vi.fn();
const mockQuery = vi.fn();
const mockAddListener = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      connect: (...args: unknown[]) => mockConnect(...args),
      query: (...args: unknown[]) => mockQuery(...args)
    }
  }
}));

describe('setupPopupPort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('closes screen when port disconnects', async () => {
    setupPopupPort();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockAddListener).toHaveBeenCalled();

    // Trigger the disconnect listener
    const disconnectCallback = mockAddListener.mock.calls[0][0];
    disconnectCallback();

    expect(window.close).toHaveBeenCalled();
  });
});
