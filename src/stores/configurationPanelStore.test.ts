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
    act(() => {
      useAppStore.getState().reset();
      useConfigurationPanelStore.getState().resetState(undefined);
    });
    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state based on mockVideoElement (width capped)', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
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

  it('handleInputChange should update state correctly', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    act(() => {
      result.current.handleInputChange({ name: 'width', value: 800 });
    });
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(
      Math.round(
        800 / (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
      )
    );
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
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(400);
    act(() => {
      result.current.handleInputChange({ name: 'linkDimensions', value: true });
    });
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
    const currentWidthBeforeLoad = result.current.width; // Should be 420 (capped from mockVideoElement)
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

  it('resetState should reset to initial state based on current videoElement', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    act(() => {
      result.current.handleInputChange({ name: 'width', value: 1000 });
      result.current.handleInputChange({ name: 'duration', value: 5 });
    });
    expect(result.current.width).toBe(1000);
    expect(result.current.duration).toBe(5);
    act(() => {
      result.current.resetState(mockVideoElement);
    });
    expect(result.current.start).toBe(mockVideoElement.currentTime);
    expect(result.current.duration).toBe(2);
    expect(result.current.width).toBe(420);
    expect(result.current.height).toBe(
      Math.round(
        420 / (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
      )
    );
    expect(result.current.aspectRatio).toBe(
      mockVideoElement.videoWidth / mockVideoElement.videoHeight
    );
  });

  it('should react to videoElement changes in appStore', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    expect(result.current.width).toBe(420);
    expect(result.current.height).toBe(
      Math.round(
        420 / (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
      )
    );
    expect(result.current.aspectRatio).toBe(
      mockVideoElement.videoWidth / mockVideoElement.videoHeight
    );
    expect(result.current.videoWidth).toBe(mockVideoElement.videoWidth);
    expect(result.current.videoHeight).toBe(mockVideoElement.videoHeight);
    expect(result.current.videoDuration).toBe(mockVideoElement.duration);

    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement2); // 1280x720
    });

    const newState = useConfigurationPanelStore.getState();
    expect(newState.width).toBe(420);
    expect(newState.height).toBe(
      Math.round(
        420 / (mockVideoElement2.videoWidth / mockVideoElement2.videoHeight)
      )
    );
    expect(newState.aspectRatio).toBe(
      mockVideoElement2.videoWidth / mockVideoElement2.videoHeight
    );
    expect(newState.videoWidth).toBe(mockVideoElement2.videoWidth);
    expect(newState.videoHeight).toBe(mockVideoElement2.videoHeight);
    expect(newState.videoDuration).toBe(mockVideoElement2.duration);
    expect(newState.start).toBe(mockVideoElement2.currentTime);
  });

  it('handleInputChange should correctly toggle linkDimensions and adjust dimensions', () => {
    const { result } = renderHook(() => useConfigurationPanelStore());
    const initialWidth = result.current.width;
    const initialHeight = result.current.height;
    const initialAspectRatio = result.current.aspectRatio;
    act(() => {
      result.current.handleInputChange({
        name: 'linkDimensions',
        value: false
      });
    });
    expect(result.current.linkDimensions).toBe(false);
    act(() => {
      result.current.handleInputChange({
        name: 'width',
        value: initialWidth + 100
      });
    });
    expect(result.current.width).toBe(initialWidth + 100);
    expect(result.current.height).toBe(initialHeight);
    act(() => {
      result.current.handleInputChange({ name: 'linkDimensions', value: true });
    });
    expect(result.current.linkDimensions).toBe(true);
    expect(result.current.height).toBe(
      Math.round((initialWidth + 100) / initialAspectRatio)
    );
  });

  it('should handle video element being null initially then set', () => {
    act(() => {
      useAppStore.getState().reset();
      useAppStore.getState().setVideoElement(null as any);
      useConfigurationPanelStore.getState().resetState(undefined);
    });
    const { result: configStoreHook } = renderHook(() =>
      useConfigurationPanelStore()
    );
    expect(configStoreHook.current.width).toBe(420);
    expect(configStoreHook.current.height).toBe(Math.round(420 / (16 / 9)));
    expect(configStoreHook.current.videoDuration).toBe(0);
    expect(configStoreHook.current.aspectRatio).toBe(16 / 9);
    act(() => {
      useAppStore.getState().setVideoElement(mockVideoElement); // 640x360
    });
    const updatedState = useConfigurationPanelStore.getState();
    expect(updatedState.width).toBe(420);
    expect(updatedState.height).toBe(
      Math.round(
        420 / (mockVideoElement.videoWidth / mockVideoElement.videoHeight)
      )
    );
    expect(updatedState.aspectRatio).toBe(
      mockVideoElement.videoWidth / mockVideoElement.videoHeight
    );
    expect(updatedState.videoDuration).toBe(mockVideoElement.duration);
    expect(updatedState.start).toBe(mockVideoElement.currentTime);
  });
});
