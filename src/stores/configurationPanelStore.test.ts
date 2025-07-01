import { act, renderHook, waitFor } from '@testing-library/react';
import { useConfigurationPanelStore } from './configurationPanelStore';
import { useAppStore } from './appStore';
import { storedConfig } from '@/utils/storage';

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

// Mock HTMLVideoElement
const mockVideoElement = {
  currentTime: 0,
  duration: 10,
  videoWidth: 640,
  videoHeight: 360,
  readyState: 1, // HAVE_METADATA
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
} as unknown as HTMLVideoElement;

const mockVideoElement2 = {
  currentTime: 5,
  duration: 20,
  videoWidth: 1280,
  videoHeight: 720,
  readyState: 1, // HAVE_METADATA
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
} as unknown as HTMLVideoElement;

describe('useConfigurationPanelStore', () => {
  // Helper function to reset mocks and stores
  const resetMocksAndStores = async () => {
    vi.mocked(storedConfig.width.getValue).mockResolvedValue(null);
    vi.mocked(storedConfig.fps.getValue).mockResolvedValue(null);
    vi.mocked(storedConfig.quality.getValue).mockResolvedValue(null);
    vi.mocked(storedConfig.width.setValue).mockResolvedValue(undefined);
    vi.mocked(storedConfig.fps.setValue).mockResolvedValue(undefined);
    vi.mocked(storedConfig.quality.setValue).mockResolvedValue(undefined);

    act(() => {
      useAppStore.getState().reset();
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
    // Set a default video element for most tests after resetting
    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement);
    });
    // Wait for the store to potentially update based on video element change
    await waitFor(() =>
      expect(useConfigurationPanelStore.getState().videoWidth).toBe(
        mockVideoElement.videoWidth
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clears all mock function calls and implementations
  });

  it('should initialize with default state (no stored values) based on mockVideoElement (width capped)', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    // Ensure that loadInitialConfig has resolved and defaults are used
    await waitFor(() => expect(result.current.width).toBe(420)); // Default width

    expect(result.current.start).toBe(0);
    expect(result.current.duration).toBe(2);
    expect(result.current.width).toBe(420);
    expect(result.current.height).toBe(
      Math.round(
        420 / (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
      )
    );
    expect(result.current.linkDimensions).toBe(true);
    expect(result.current.framerate).toBe(10);
    expect(result.current.quality).toBe(5);
    expect(result.current.aspectRatio).toBe(
      mockVideoElement.videoWidth / mockVideoElement.videoHeight
    );
    expect(result.current.videoDuration).toBe(10);
    expect(result.current.videoWidth).toBe(640);
    expect(result.current.videoHeight).toBe(360);
  });

  // Test Case 1: Initial state loading from storage
  it('should initialize with stored values', async () => {
    const storedWidthVal = 300;
    const storedFpsVal = 15;
    const storedQualityVal = 7;
    vi.mocked(storedConfig.width.getValue).mockResolvedValue(storedWidthVal);
    vi.mocked(storedConfig.fps.getValue).mockResolvedValue(storedFpsVal);
    vi.mocked(storedConfig.quality.getValue).mockResolvedValue(storedQualityVal);

    // Re-initialize store by calling loadInitialConfig manually for this test case
    // This simulates the store initializing after mocks are set.
    await act(async () => {
      useConfigurationPanelStore.getState().loadInitialConfig();
    });

    const { result } = renderHook(() => useConfigurationPanelStore());

    await waitFor(() => {
      expect(result.current.width).toBe(storedWidthVal);
      expect(result.current.framerate).toBe(storedFpsVal);
      expect(result.current.quality).toBe(storedQualityVal);
      expect(result.current.height).toBe(
        Math.round(
          storedWidthVal /
            (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
        )
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
      Math.round(
        newWidth / (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
      )
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
    const newHeight = 450; // approx 800 * (360/640)
    act(() => {
      result.current.handleInputChange({ name: 'height', value: newHeight });
    });
    const expectedWidth = Math.round(
      newHeight * (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
    );
    expect(result.current.height).toBe(newHeight);
    expect(result.current.width).toBe(expectedWidth);
    expect(storedConfig.width.setValue).toHaveBeenCalledWith(expectedWidth);
  });

  // Test Case 3: Height calculation with linked dimensions (covered by initial load and input change tests)
  // Test Case 4: Initial state with no stored values (covered by the first test 'should initialize with default state')

  it('handleInputChange should correctly toggle linkDimensions and adjust height', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    await waitFor(() => expect(result.current.width).toBe(420)); // Wait for initial load

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
    await waitFor(() => expect(result.current.width).toBe(420)); // Ensure initial state is set

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
    expect(result.current.videoDuration).toBe(15);
    expect(result.current.videoWidth).toBe(1920);
    expect(result.current.videoHeight).toBe(1080);
    // Height should adjust based on current display width and NEW video aspect ratio if linked
    expect(result.current.height).toBe(
      Math.round(currentWidthBeforeLoad / (1920 / 1080))
    );
  });

  it('handleSetStartToCurrentTime should update start time', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    act(() => {
      result.current.handleSetStartToCurrentTime({ currentTime: 3.5 });
    });
    expect(result.current.start).toBe(3.5);
  });

  it('seekVideo should call videoElement.currentTime and pause', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    act(() => {
      result.current.seekVideo(5);
    });
    expect(mockVideoElement.currentTime).toBe(5);
    expect(mockVideoElement.pause).toHaveBeenCalled();
  });

  it('resetState should reset to defaults and then load from storage', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    // Modify some state
    act(() => {
      result.current.handleInputChange({ name: 'width', value: 1000 });
      result.current.handleInputChange({ name: 'duration', value: 5 });
    });
    await waitFor(() => expect(result.current.width).toBe(1000));
    expect(result.current.duration).toBe(5);

    // Mock that storage has some values
    const storedWidthVal = 550;
    const storedFpsVal = 20;
    vi.mocked(storedConfig.width.getValue).mockResolvedValue(storedWidthVal);
    vi.mocked(storedConfig.fps.getValue).mockResolvedValue(storedFpsVal);
    vi.mocked(storedConfig.quality.getValue).mockResolvedValue(null); // No stored quality, should use default

    act(() => {
      result.current.resetState(mockVideoElement); // This will call loadInitialConfig internally
    });

    // Check that it resets to values from storage or defaults
    await waitFor(() => {
      expect(result.current.width).toBe(storedWidthVal); // From mocked storage
      expect(result.current.height).toBe(
        Math.round(
          storedWidthVal /
            (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
        )
      );
      expect(result.current.framerate).toBe(storedFpsVal); // From mocked storage
      expect(result.current.quality).toBe(5); // Default, as nothing in storage for quality
      expect(result.current.duration).toBe(2); // Default from getInitialState
      expect(result.current.start).toBe(mockVideoElement.currentTime);
      expect(result.current.aspectRatio).toBe(
        mockVideoElement.videoWidth / mockVideoElement.videoHeight
      );
    });
    // Verify that getValue was called during reset's loadInitialConfig part
    expect(storedConfig.width.getValue).toHaveBeenCalled();
    expect(storedConfig.fps.getValue).toHaveBeenCalled();
    expect(storedConfig.quality.getValue).toHaveBeenCalled();
  });

  it('should react to videoElement changes in appStore, reset and load config', async () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    await waitFor(() => expect(result.current.videoWidth).toBe(mockVideoElement.videoWidth));

    // Initial state assertions (width is default 420, height derived)
    expect(result.current.width).toBe(420); // Default or from non-conflicting storage
    const expectedHeight1 = Math.round(420 / (mockVideoElement.videoWidth / mockVideoElement.videoHeight));
    expect(result.current.height).toBe(expectedHeight1);
    expect(result.current.aspectRatio).toBe(mockVideoElement.videoWidth / mockVideoElement.videoHeight);
    expect(result.current.videoWidth).toBe(mockVideoElement.videoWidth);
    expect(result.current.videoHeight).toBe(mockVideoElement.videoHeight);
    expect(result.current.videoDuration).toBe(mockVideoElement.duration);

    // Mock stored values that might be loaded on video change/reset
    const newStoredWidth = 350;
    vi.mocked(storedConfig.width.getValue).mockResolvedValue(newStoredWidth);
    vi.mocked(storedConfig.fps.getValue).mockResolvedValue(null);
    vi.mocked(storedConfig.quality.getValue).mockResolvedValue(null);

    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement2); // 1280x720
    });

    // After video element changes, resetState is called, which calls loadInitialConfig.
    // We need to wait for these async operations.
    await waitFor(() => {
      // Check if width is from (newly) mocked storage
      expect(useConfigurationPanelStore.getState().width).toBe(newStoredWidth);
    });

    const newState = useConfigurationPanelStore.getState();
    expect(newState.width).toBe(newStoredWidth);
    expect(newState.height).toBe(
      Math.round(
        newStoredWidth / (mockVideoElement2.videoWidth / mockVideoElement2.videoHeight)
      )
    );
    expect(newState.aspectRatio).toBe(
      mockVideoElement2.videoWidth / mockVideoElement2.videoHeight
    );
    expect(newState.videoWidth).toBe(mockVideoElement2.videoWidth);
    expect(newState.videoHeight).toBe(mockVideoElement2.videoHeight);
    expect(newState.videoDuration).toBe(mockVideoElement2.duration);
    expect(newState.start).toBe(mockVideoElement2.currentTime); // Updated based on new video
    expect(newState.framerate).toBe(10); // Default, as per mock
    expect(newState.quality).toBe(5); // Default, as per mock
  });


  it('should handle video element being null initially then set, loading config correctly', async () => {
    // Reset mocks and stores, but don't set a video element initially
    await resetMocksAndStores(); // This sets videoElement to undefined in appStore via its internal reset.

    const initialStoredWidth = 250;
    vi.mocked(storedConfig.width.getValue).mockResolvedValue(initialStoredWidth);
    vi.mocked(storedConfig.fps.getValue).mockResolvedValue(8);
    vi.mocked(storedConfig.quality.getValue).mockResolvedValue(3);

    // Trigger the initial load that happens on store creation
    await act(async () => {
      useConfigurationPanelStore.getState().loadInitialConfig();
    });

    const { result: configStoreHook } = renderHook(() => useConfigurationPanelStore());

    // Check state with no video, but with stored values
    await waitFor(() => {
      expect(configStoreHook.current.width).toBe(initialStoredWidth);
      expect(configStoreHook.current.framerate).toBe(8);
      expect(configStoreHook.current.quality).toBe(3);
      // Height with no video uses default 16/9 aspect ratio
      expect(configStoreHook.current.height).toBe(Math.round(initialStoredWidth / (16 / 9)));
      expect(configStoreHook.current.videoDuration).toBe(0);
      expect(configStoreHook.current.aspectRatio).toBe(16 / 9); // Default aspect ratio
    });

    // Now set a video element
    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement); // 640x360
    });

    // The subscription in configurationPanelStore should trigger resetState, which calls loadInitialConfig.
    // Stored values should still be respected, but aspect ratio and video details will update.
    await waitFor(() => {
      expect(useConfigurationPanelStore.getState().videoWidth).toBe(mockVideoElement.videoWidth);
    });

    const updatedState = useConfigurationPanelStore.getState();
    expect(updatedState.width).toBe(initialStoredWidth); // Still from storage
    expect(updatedState.framerate).toBe(8); // Still from storage
    expect(updatedState.quality).toBe(3); // Still from storage
    // Height should now be based on stored width and *video's* aspect ratio
    expect(updatedState.height).toBe(
      Math.round(
        initialStoredWidth / (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
      )
    );
    expect(updatedState.aspectRatio).toBe(
      mockVideoElement.videoWidth / mockVideoElement.videoHeight // Updated to video's aspect ratio
    );
    expect(updatedState.videoDuration).toBe(mockVideoElement.duration);
    expect(updatedState.start).toBe(mockVideoElement.currentTime);
  });
});
