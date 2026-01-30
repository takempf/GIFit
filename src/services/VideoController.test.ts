import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { videoController } from './VideoController';
import { browser } from 'wxt/browser';

// Mock wxt/browser
vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn()
    }
  }
}));

describe('VideoController', () => {
  const mockTabId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    (browser.tabs.query as unknown as Mock).mockResolvedValue([
      { id: mockTabId }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('seek', () => {
    it('should send SEEK_VIDEO message to active tab', async () => {
      await videoController.seek(10);
      expect(browser.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, {
        type: 'SEEK_VIDEO',
        time: 10
      });
    });

    it('should handle missing tab ID gracefully', async () => {
      (browser.tabs.query as unknown as Mock).mockResolvedValue([]);
      await videoController.seek(10);
      expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle sendMessage errors', async () => {
      (browser.tabs.sendMessage as unknown as Mock).mockRejectedValue(
        new Error('Failed')
      );
      // Should not throw
      await expect(videoController.seek(10)).resolves.not.toThrow();
    });
  });

  describe('pause', () => {
    it('should send PAUSE_VIDEO message', async () => {
      await videoController.pause();
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, {
        type: 'PAUSE_VIDEO'
      });
    });
  });

  describe('getMetadata', () => {
    it('should return metadata when successful', async () => {
      const mockMetadata = { duration: 100, width: 1920, height: 1080 };
      (browser.tabs.sendMessage as unknown as Mock).mockResolvedValue(
        mockMetadata
      );

      const result = await videoController.getMetadata();
      expect(result).toEqual(mockMetadata);
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, {
        type: 'GET_VIDEO_METADATA'
      });
    });

    it('should return null on error', async () => {
      (browser.tabs.sendMessage as unknown as Mock).mockRejectedValue(
        new Error('Failed')
      );
      const result = await videoController.getMetadata();
      expect(result).toBeNull();
    });
  });

  describe('captureFrame', () => {
    it('should return data URL when successful', async () => {
      const mockDataUrl = 'data:image/png;base64,...';
      (browser.tabs.sendMessage as unknown as Mock).mockResolvedValue(
        mockDataUrl
      );

      const result = await videoController.captureFrame();
      expect(result).toBe(mockDataUrl);
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(mockTabId, {
        type: 'CAPTURE_VISIBLE_FRAME'
      });
    });
  });
});
