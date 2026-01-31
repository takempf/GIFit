import { vi, describe, beforeEach, afterEach, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useConfigurationPanelStore } from './configurationPanelStore';
import { storedConfig } from '@/utils/storage';
import { videoController } from '@/services/VideoController';

// Mock VideoController
vi.mock('@/services/VideoController', () => ({
  videoController: {
    seek: vi.fn(),
    pause: vi.fn(),
    getMetadata: vi.fn(),
    captureFrame: vi.fn()
  }
}));

// Mock storedConfig
vi.mock('@/utils/storage', () => ({
  storedConfig: {
    width: {
      getValue: vi.fn(),
      setValue: vi.fn()
    },
    fps: {
      getValue: vi.fn(),
      setValue: vi.fn()
    },
    quality: {
      getValue: vi.fn(),
      setValue: vi.fn()
    }
  }
}));

const mockMetadata = {
  currentTime: 0,
  duration: 10,
  width: 640,
  height: 360,
  aspectRatio: 640 / 360
};

describe('useConfigurationPanelStore', () => {
  // Helper function to reset mocks and stores
  const resetMocksAndStores = async () => {
    vi.mocked(storedConfig.width.getValue).mockResolvedValue(0);
    vi.mocked(storedConfig.fps.getValue).mockResolvedValue(0);
    vi.mocked(storedConfig.quality.getValue).mockResolvedValue(0);
    vi.mocked(storedConfig.width.setValue).mockResolvedValue(undefined);
    vi.mocked(storedConfig.fps.setValue).mockResolvedValue(undefined);
    vi.mocked(storedConfig.quality.setValue).mockResolvedValue(undefined);

    vi.mocked(videoController.seek).mockResolvedValue();
    vi.mocked(videoController.pause).mockResolvedValue();
    vi.mocked(videoController.getMetadata).mockResolvedValue(null);
    vi.mocked(videoController.captureFrame).mockResolvedValue(null);

    act(() => {
      // Directly calling resetState which now internally calls loadInitialConfig
      useConfigurationPanelStore.getState().resetState(undefined);
    });
    // Ensure any async operations from reset (like loadInitialConfig) complete
    await act(async () => {
      await useConfigurationPanelStore.getState().loadInitialConfig();
    });
  };

  beforeEach(async () => {
    await resetMocksAndStores();
    // Simulate fetching metadata
    vi.mocked(videoController.getMetadata).mockResolvedValue(mockMetadata);
    await act(async () => {
      await useConfigurationPanelStore.getState().fetchVideoMetadata();
    });
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clears all mock function calls and implementations
  });

  it('should initialize with default state (no stored values) based on mockMetadata', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());

    // Check if fetchVideoMetadata updated the state
    expect(result.current.videoWidth).toBe(mockMetadata.width);
    expect(result.current.videoHeight).toBe(mockMetadata.height);
    expect(result.current.width).toBe(420); // Default width
    expect(result.current.height).toBe(
      Math.round(420 / (mockMetadata.width / mockMetadata.height))
    );
  });

  // Test Case 1: Initial state loading from storage
  it('should initialize with stored values', async () => {
    const storedWidthVal = 300;
    const storedFpsVal = 15;
    const storedQualityVal = 7;
    vi.mocked(storedConfig.width.getValue).mockResolvedValue(storedWidthVal);
    vi.mocked(storedConfig.fps.getValue).mockResolvedValue(storedFpsVal);
    vi.mocked(storedConfig.quality.getValue).mockResolvedValue(
      storedQualityVal
    );

    // Re-initialize store by calling loadInitialConfig manually for this test case
    await act(async () => {
      useConfigurationPanelStore.getState().loadInitialConfig();
    });

    const { result } = renderHook(() => useConfigurationPanelStore());

    await waitFor(() => {
      expect(result.current.width).toBe(storedWidthVal);
      expect(result.current.framerate).toBe(storedFpsVal);
      expect(result.current.quality).toBe(storedQualityVal);
      expect(result.current.height).toBe(
        Math.round(storedWidthVal / (mockMetadata.width / mockMetadata.height))
      );
    });
  });

  // Test Case 2: Persisting changes to storage
  it('handleInputChange should update state and persist to storage', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    const newWidth = 800;
    const newFramerate = 24;
    const newQuality = 3;

    act(() => {
      result.current.handleInputChange({ name: 'width', value: newWidth });
    });
    expect(result.current.width).toBe(newWidth);
    expect(storedConfig.width.setValue).toHaveBeenCalledWith(newWidth);
    expect(result.current.height).toBe(
      Math.round(newWidth / (mockMetadata.width / mockMetadata.height))
    );

    act(() => {
      result.current.handleInputChange({
        name: 'framerate',
        value: newFramerate
      });
    });
    expect(result.current.framerate).toBe(newFramerate);
    expect(storedConfig.fps.setValue).toHaveBeenCalledWith(newFramerate);

    act(() => {
      result.current.handleInputChange({ name: 'quality', value: newQuality });
    });
    expect(result.current.quality).toBe(newQuality);
    expect(storedConfig.quality.setValue).toHaveBeenCalledWith(newQuality);

    // Test persisting width when height is changed and dimensions are linked
    vi.mocked(storedConfig.width.setValue).mockClear(); // Clear previous calls
    const newHeight = 450;
    act(() => {
      result.current.handleInputChange({ name: 'height', value: newHeight });
    });
    const expectedWidth = Math.round(
      newHeight * (mockMetadata.width / mockMetadata.height)
    );
    expect(result.current.height).toBe(newHeight);
    expect(result.current.width).toBe(expectedWidth);
    expect(storedConfig.width.setValue).toHaveBeenCalledWith(expectedWidth);
  });

  it('handleInputChange should correctly toggle linkDimensions and adjust height', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    const initialWidth = result.current.width;
    const initialAspectRatio = result.current.aspectRatio;

    act(() => {
      result.current.handleInputChange({
        name: 'linkDimensions',
        value: false
      });
    });
    expect(result.current.linkDimensions).toBe(false);
    const manualHeight = 300;
    act(() => {
      result.current.handleInputChange({ name: 'height', value: manualHeight });
    });
    expect(result.current.width).toBe(initialWidth); // Width should not change
    expect(result.current.height).toBe(manualHeight);

    act(() => {
      result.current.handleInputChange({ name: 'linkDimensions', value: true });
    });
    expect(result.current.linkDimensions).toBe(true);
    // Height should re-calculate based on current width and aspect ratio
    expect(result.current.height).toBe(
      Math.round(initialWidth / initialAspectRatio)
    );
  });

  it('handleVideoLoadedData should update video-related state and recalculate height if linked', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());

    const currentWidthBeforeLoad = result.current.width;
    const newVideoData = {
      aspectRatio: 1920 / 1080, // 16/9
      duration: 15,
      videoWidth: 1920,
      videoHeight: 1080
    };
    act(() => {
      result.current.handleVideoLoadedData(newVideoData);
    });
    expect(result.current.aspectRatio).toBe(1920 / 1080);
    expect(result.current.videoDuration).toBe(15000); // 15s * 1000
    expect(result.current.videoWidth).toBe(1920);
    expect(result.current.videoHeight).toBe(1080);
    // Height should adjust based on current display width and NEW video aspect ratio if linked
    expect(result.current.height).toBe(
      Math.round(currentWidthBeforeLoad / (1920 / 1080))
    );
  });

  it('handleVideoLoadedData should set start time on initial load', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());

    const initialData = {
      aspectRatio: 16 / 9,
      duration: 100,
      videoWidth: 1920,
      videoHeight: 1080,
      currentTime: 50
    };

    act(() => {
      // Ensure videoDuration starts at 0 (initial state)
      useConfigurationPanelStore.setState({ videoDuration: 0, start: 0 });
      result.current.handleVideoLoadedData(initialData);
    });

    expect(result.current.videoDuration).toBe(100000); // 100s * 1000
    expect(result.current.start).toBe(50000); // 50s * 1000

    // Subsequent updates should NOT overwrite start time
    act(() => {
      result.current.handleVideoLoadedData({
        ...initialData,
        currentTime: 75 // Different time
      });
    });

    // Start time should remain 50
    expect(result.current.start).toBe(50000);
  });

  it('syncStartToVideoTime should update start time based on fetched metadata', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());

    vi.mocked(videoController.getMetadata).mockResolvedValue({
      ...mockMetadata,
      currentTime: 3.5
    });

    await act(async () => {
      await result.current.syncStartToVideoTime();
    });

    expect(result.current.start).toBe(3500); // 3.5s * 1000
  });

  it('seekVideo should call videoController.seek', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    await act(async () => {
      await result.current.seekVideo(5000); // 5000ms = 5s
    });
    expect(videoController.seek).toHaveBeenCalledWith(5);
  });

  it('fetchVideoMetadata should update store with video metadata', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());

    const newMetadata = {
      width: 1280,
      height: 720,
      duration: 30,
      currentTime: 10,
      aspectRatio: 1280 / 720
    };
    vi.mocked(videoController.getMetadata).mockResolvedValue(newMetadata);

    await act(async () => {
      await result.current.fetchVideoMetadata();
    });

    expect(result.current.videoWidth).toBe(1280);
    expect(result.current.videoHeight).toBe(720);
    expect(result.current.videoDuration).toBe(30000); // 30s in ms
  });

  it('pauseVideo should call videoController.pause', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    await act(async () => {
      await result.current.pauseVideo();
    });
    expect(videoController.pause).toHaveBeenCalled();
  });

  it('captureFrame should call videoController.captureFrame and update previewImage', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    const mockUrl = 'data:image/png;base64,...';
    vi.mocked(videoController.captureFrame).mockResolvedValue(mockUrl);

    await act(async () => {
      await result.current.captureFrame();
    });

    expect(videoController.captureFrame).toHaveBeenCalled();
    expect(result.current.previewImage).toBe(mockUrl);
  });
});
