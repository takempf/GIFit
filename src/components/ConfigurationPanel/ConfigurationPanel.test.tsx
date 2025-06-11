import { render, screen, act } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import ConfigurationPanel from './ConfigurationPanel'; // Adjust path if necessary
import { secondsToTimecode } from '@/utils/secondsToTimecode'; // Helper for assertions

// Mock the useAppStore
vi.mock('@/stores/appStore', () => {
  const mockGetStateFn = vi.fn();
  return {
    useAppStore: Object.assign(vi.fn(), { getState: mockGetStateFn })
  };
});

// Mock the logger utility
vi.mock('@/utils/logger', () => ({
  log: vi.fn()
}));

// Helper to create a mock video element
const createMockVideoElement = () => {
  const videoElement = document.createElement('video');
  vi.spyOn(videoElement, 'pause');
  vi.spyOn(videoElement, 'addEventListener');
  vi.spyOn(videoElement, 'removeEventListener');

  // Define properties that might be accessed
  Object.defineProperty(videoElement, 'currentTime', {
    writable: true,
    value: 0
  });
  Object.defineProperty(videoElement, 'duration', {
    writable: true,
    value: 100 // Default duration
  });
  Object.defineProperty(videoElement, 'videoWidth', {
    writable: true,
    value: 1280
  });
  Object.defineProperty(videoElement, 'videoHeight', {
    writable: true,
    value: 720
  });
  Object.defineProperty(videoElement, 'paused', {
    writable: true,
    value: true
  });

  return videoElement;
};

describe('ConfigurationPanel', () => {
  let mockVideoElement: HTMLVideoElement;
  let mockAppStoreState: any;
  let actualAppStore: any; // To get the hoisted mockGetState

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Dynamically import the mocked store to access its functions
    actualAppStore = await import('@/stores/appStore');

    mockVideoElement = createMockVideoElement();
    mockAppStoreState = {
      isOpen: true,
      status: 'configuring',
      videoElement: mockVideoElement
    };
    // Now use actualAppStore.useAppStore.getState to set the mock return value
    (
      actualAppStore.useAppStore.getState as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockAppStoreState);

    // @ts-ignore
    (actualAppStore.useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) => {
        if (typeof selector === 'function') {
          return selector(mockAppStoreState);
        }
        return mockAppStoreState;
      }
    );
  });

  test('updates start time on video seek when app is open and configuring and video is paused', () => {
    render(<ConfigurationPanel onSubmit={vi.fn()} />);

    const newTime = 5;
    act(() => {
      mockVideoElement.currentTime = newTime;
      // Directly dispatch the event from the video element
      const event = new Event('seeked');
      mockVideoElement.dispatchEvent(event);
    });

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    // InputTime component formats with one decimal for seconds (e.g., "0:05.0")
    expect(startTimeInput.value).toBe(`${secondsToTimecode(newTime)}.0`);
  });

  test('does not update start time on video seek when app is open and configuring and video is not paused', () => {
    render(<ConfigurationPanel onSubmit={vi.fn()} />);

    Object.defineProperty(mockVideoElement, 'paused', { value: false });
    const newTime = 5;
    act(() => {
      mockVideoElement.currentTime = newTime;
      // Directly dispatch the event from the video element
      const event = new Event('seeked');
      mockVideoElement.dispatchEvent(event);
    });

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    // InputTime component formats with one decimal for seconds (e.g., "0:05.0")
    expect(startTimeInput.value).toBe(`0:00.0`);
  });

  test('does NOT update start time if app is not open', () => {
    mockAppStoreState.isOpen = false;
    // Update the mock return value for getState for this specific test case
    (
      actualAppStore.useAppStore.getState as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockAppStoreState);
    // @ts-ignore
    (actualAppStore.useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) => selector(mockAppStoreState)
    );

    render(<ConfigurationPanel onSubmit={vi.fn()} />);
    const initialStartTime = mockVideoElement.currentTime; // Should be 0 from createMockVideoElement

    act(() => {
      mockVideoElement.currentTime = 7;
      const event = new Event('seeked');
      mockVideoElement.dispatchEvent(event);
    });

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    expect(startTimeInput.value).toBe(
      `${secondsToTimecode(initialStartTime)}.0`
    );
  });

  test('does NOT update start time if status is not "configuring"', () => {
    mockAppStoreState.status = 'generating';
    // Update the mock return value for getState for this specific test case
    (
      actualAppStore.useAppStore.getState as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockAppStoreState);
    // @ts-ignore
    (actualAppStore.useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) => selector(mockAppStoreState)
    );

    render(<ConfigurationPanel onSubmit={vi.fn()} />);
    const initialStartTime = mockVideoElement.currentTime;

    act(() => {
      mockVideoElement.currentTime = 8;
      const event = new Event('seeked');
      mockVideoElement.dispatchEvent(event);
    });

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    expect(startTimeInput.value).toBe(
      `${secondsToTimecode(initialStartTime)}.0`
    );
  });

  test('cleans up "seeked" event listener on unmount', () => {
    const { unmount } = render(<ConfigurationPanel onSubmit={vi.fn()} />);

    expect(mockVideoElement.addEventListener).toHaveBeenCalledWith(
      'seeked',
      expect.any(Function) // The handler function
    );

    unmount();

    expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith(
      'seeked',
      expect.any(Function) // Should be the same handler function instance
    );
  });

  test('initial start time is set from video current time', () => {
    mockVideoElement.currentTime = 3; // Set an initial time before render
    mockAppStoreState.videoElement = mockVideoElement;
    // Update the mock return value for getState for this specific test case
    (
      actualAppStore.useAppStore.getState as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockAppStoreState);
    // @ts-ignore
    (actualAppStore.useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector) => selector(mockAppStoreState)
    );

    render(<ConfigurationPanel onSubmit={vi.fn()} />);

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    // InputTime component formats with one decimal for seconds (e.g., "0:03.0")
    expect(startTimeInput.value).toBe(`${secondsToTimecode(3)}.0`);
  });
});
