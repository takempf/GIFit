import { describe, it, expect, vi, beforeEach } from 'vitest';
import { videoController } from './VideoController';
import { VideoAdapter } from '@shared/adapters/types';

describe('VideoController', () => {
  let mockAdapter: VideoAdapter;

  beforeEach(() => {
    mockAdapter = {
      seek: vi.fn(),
      pause: vi.fn(),
      getMetadata: vi.fn(),
      captureFrame: vi.fn(),
      getStoryboardSpec: vi.fn()
    };
    videoController.setAdapter(mockAdapter);
  });

  it('delegates seek to adapter', async () => {
    await videoController.seek(10);
    expect(mockAdapter.seek).toHaveBeenCalledWith(10);
  });

  it('delegates pause to adapter', async () => {
    await videoController.pause();
    expect(mockAdapter.pause).toHaveBeenCalled();
  });

  it('delegates getMetadata to adapter', async () => {
    const mockMetadata = {
      duration: 100,
      width: 1920,
      height: 1080,
      currentTime: 0
    };
    vi.mocked(mockAdapter.getMetadata).mockResolvedValue(mockMetadata);
    expect(await videoController.getMetadata()).toEqual(mockMetadata);
  });

  it('delegates captureFrame to adapter', async () => {
    const mockUrl = 'data:image/png;base64,...';
    vi.mocked(mockAdapter.captureFrame).mockResolvedValue(mockUrl);
    expect(await videoController.captureFrame()).toBe(mockUrl);
  });

  it('returns null/undefined when no adapter is set', async () => {
    // Force null to test safety checks
    (videoController as unknown as { adapter: null }).adapter = null;

    await expect(videoController.seek(10)).resolves.not.toThrow();
    await expect(videoController.pause()).resolves.not.toThrow();
    expect(await videoController.getMetadata()).toBeNull();
    expect(await videoController.captureFrame()).toBeNull();
  });
});
