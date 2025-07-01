import { act, renderHook } from '@testing-library/react';
import { useConfigurationPanelStore } from './configurationPanelStore';
import { useAppStore } from './appStore';

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
  beforeEach(() => {
    // Resetting stores before each test
    act(() => {
      useAppStore.getState().reset();
      // Pass undefined to resetState to use the default initial state logic
      useConfigurationPanelStore.getState().resetState(undefined);
    });
    // Set a default video element in appStore for consistent testing environment
    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state based on mockVideoElement', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    expect(result.current.start).toBe(0);
    expect(result.current.duration).toBe(2);
    expect(result.current.width).toBe(640); // from mockVideoElement
    expect(result.current.height).toBe(360); // from mockVideoElement
    expect(result.current.linkDimensions).toBe(true);
    expect(result.current.framerate).toBe(10);
    expect(result.current.quality).toBe(5);
    expect(result.current.aspectRatio).toBe(640 / 360);
    expect(result.current.videoDuration).toBe(10);
  });

  it('handleInputChange should update state correctly', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());

    act(() => {
      result.current.handleInputChange({ name: 'width', value: 800 });
    });
    expect(result.current.width).toBe(800);
    // Height should also change because linkDimensions is true and aspectRatio is 640/360
    expect(result.current.height).toBe(Math.round(800 / (640 / 360)));

    act(() => {
      result.current.handleInputChange({
        name: 'linkDimensions',
        value: false
      });
    });
    expect(result.current.linkDimensions).toBe(false);

    act(() => {
      result.current.handleInputChange({ name: 'height', value: 400 });
    });
    // Width should not change now
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(400);

    act(() => {
      result.current.handleInputChange({ name: 'linkDimensions', value: true });
    });
    // When linkDimensions is turned back on, height should adjust to width based on current aspect ratio
    expect(result.current.height).toBe(
      Math.round(result.current.width / result.current.aspectRatio)
    );

    act(() => {
      result.current.handleInputChange({ name: 'framerate', value: 24 });
    });
    expect(result.current.framerate).toBe(24);
  });

  it('handleVideoLoadedData should update video-related state', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    const newVideoData = {
      aspectRatio: 16 / 9,
      duration: 15,
      videoWidth: 1920,
      videoHeight: 1080
    };

    act(() => {
      result.current.handleVideoLoadedData(newVideoData);
    });

    expect(result.current.aspectRatio).toBe(16 / 9);
    expect(result.current.videoDuration).toBe(15);
    expect(result.current.videoWidth).toBe(1920);
    expect(result.current.videoHeight).toBe(1080);
    // Height should adjust if linked or was default
    expect(result.current.height).toBe(
      Math.round(result.current.width / (16 / 9))
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

  it('resetState should reset to initial state based on current videoElement', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    // Change some state
    act(() => {
      result.current.handleInputChange({ name: 'width', value: 1000 });
      result.current.handleInputChange({ name: 'duration', value: 5 });
    });
    expect(result.current.width).toBe(1000);
    expect(result.current.duration).toBe(5);

    // Reset state
    act(() => {
      result.current.resetState(mockVideoElement); // Explicitly pass for clarity, though it would pick from appStore
    });

    // Check if state is reset to initial values based on mockVideoElement
    expect(result.current.start).toBe(mockVideoElement.currentTime);
    expect(result.current.duration).toBe(2); // Default duration
    expect(result.current.width).toBe(mockVideoElement.videoWidth);
    expect(result.current.height).toBe(mockVideoElement.videoHeight);
    expect(result.current.aspectRatio).toBe(
      mockVideoElement.videoWidth / mockVideoElement.videoHeight
    );
  });

  it('should react to videoElement changes in appStore', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());

    // Initial state based on mockVideoElement
    expect(result.current.videoWidth).toBe(mockVideoElement.videoWidth);
    expect(result.current.videoHeight).toBe(mockVideoElement.videoHeight);
    expect(result.current.videoDuration).toBe(mockVideoElement.duration);

    // Change videoElement in appStore
    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement2);
    });

    // Wait for subscribers to be notified and state to update
    // Zustand updates are synchronous, but renderHook might need a tick
    // Forcing a re-render or checking after a timeout might be more robust in complex scenarios
    // but here, direct check should work due to direct subscription model.
    // However, renderHook's result doesn't auto-update on external store changes directly.
    // We need to get the latest state from the store itself, or re-render the hook.

    const newState = useConfigurationPanelStore.getState();
    expect(newState.videoWidth).toBe(mockVideoElement2.videoWidth);
    expect(newState.videoHeight).toBe(mockVideoElement2.videoHeight);
    expect(newState.videoDuration).toBe(mockVideoElement2.duration);
    expect(newState.start).toBe(mockVideoElement2.currentTime);
    expect(newState.width).toBe(mockVideoElement2.videoWidth); // Width should update
    expect(newState.height).toBe(mockVideoElement2.videoHeight); // Height should update
    expect(newState.aspectRatio).toBe(
      mockVideoElement2.videoWidth / mockVideoElement2.videoHeight
    );
  });

  it('handleInputChange should correctly toggle linkDimensions and adjust dimensions', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    const initialWidth = result.current.width;
    const initialHeight = result.current.height;
    const initialAspectRatio = result.current.aspectRatio;

    // Turn off linkDimensions
    act(() => {
      result.current.handleInputChange({
        name: 'linkDimensions',
        value: false
      });
    });
    expect(result.current.linkDimensions).toBe(false);

    // Change width, height should not change
    act(() => {
      result.current.handleInputChange({
        name: 'width',
        value: initialWidth + 100
      });
    });
    expect(result.current.width).toBe(initialWidth + 100);
    expect(result.current.height).toBe(initialHeight); // Height remains unchanged

    // Turn on linkDimensions
    act(() => {
      result.current.handleInputChange({ name: 'linkDimensions', value: true });
    });
    expect(result.current.linkDimensions).toBe(true);
    // Height should now adjust to the new width, based on the original aspect ratio
    expect(result.current.height).toBe(
      Math.round((initialWidth + 100) / initialAspectRatio)
    );
  });

  it('should handle video element being null initially then set', () => {
    // Reset appStore to have no video element initially
    act(() => {
      useAppStore.getState().reset();
      useAppStore.getState().setVideoElement(null as any); // Explicitly set to null
      // Reset config store, it should use default values as videoElement is null
      useConfigurationPanelStore.getState().resetState(undefined);
    });

    const { result: configStoreHook } = renderHook(() =>
      useConfigurationPanelStore()
    );

    // Check for default initial state when no video
    expect(configStoreHook.current.width).toBe(320); // DEFAULT_WIDTH
    expect(configStoreHook.current.height).toBe(180); // DEFAULT_HEIGHT
    expect(configStoreHook.current.videoDuration).toBe(0);

    // Now set a video element in appStore
    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement);
    });

    // State should update based on the new video element
    const updatedState = useConfigurationPanelStore.getState();
    expect(updatedState.width).toBe(mockVideoElement.videoWidth);
    expect(updatedState.height).toBe(mockVideoElement.videoHeight);
    expect(updatedState.videoDuration).toBe(mockVideoElement.duration);
    expect(updatedState.start).toBe(mockVideoElement.currentTime);
  });
});
