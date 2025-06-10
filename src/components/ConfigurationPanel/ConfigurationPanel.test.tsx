import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import ConfigurationPanel from './ConfigurationPanel'; // Adjust path if necessary
import { useAppStore } from '@/stores/appStore'; // Adjust path if necessary
import { secondsToTimecode } from '@/utils/secondsToTimecode'; // Helper for assertions

// Mock the useAppStore
vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn()
}));

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

  return videoElement;
};

describe('ConfigurationPanel', () => {
  let mockVideoElement: HTMLVideoElement;
  let mockAppStoreState: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    mockVideoElement = createMockVideoElement();
    mockAppStoreState = {
      isOpen: true,
      status: 'configuring',
      videoElement: mockVideoElement,
      // Mock other state properties and actions as needed by the component
      // For example, if ConfigurationPanel calls any actions on the store directly
      getState: () => mockAppStoreState // For listeners accessing store directly
    };

    // @ts-ignore
    useAppStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockAppStoreState);
      }
      return mockAppStoreState; // Fallback for direct store access if any part expects that
    });
  });

  test('updates start time on video seek when app is open and configuring', () => {
    render(<ConfigurationPanel onSubmit={vi.fn()} />);

    const newTime = 5;
    act(() => {
      mockVideoElement.currentTime = newTime;
      // Directly dispatch the event from the video element
      const event = new Event('seeked');
      mockVideoElement.dispatchEvent(event);
    });

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    // Assuming InputTime component formats the value, we need to check against the formatted string
    // If secondsToTimecode is used internally, use it for expected value
    expect(startTimeInput.value).toBe(secondsToTimecode(newTime));
  });

  test('does NOT update start time if app is not open', () => {
    mockAppStoreState.isOpen = false;
    // @ts-ignore
    useAppStore.mockImplementation((selector) => selector(mockAppStoreState));

    render(<ConfigurationPanel onSubmit={vi.fn()} />);
    const initialStartTime = mockVideoElement.currentTime; // Should be 0 from createMockVideoElement

    act(() => {
      mockVideoElement.currentTime = 7;
      const event = new Event('seeked');
      mockVideoElement.dispatchEvent(event);
    });

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    expect(startTimeInput.value).toBe(secondsToTimecode(initialStartTime));
  });

  test('does NOT update start time if status is not "configuring"', () => {
    mockAppStoreState.status = 'generating';
    // @ts-ignore
    useAppStore.mockImplementation((selector) => selector(mockAppStoreState));

    render(<ConfigurationPanel onSubmit={vi.fn()} />);
    const initialStartTime = mockVideoElement.currentTime;

    act(() => {
      mockVideoElement.currentTime = 8;
      const event = new Event('seeked');
      mockVideoElement.dispatchEvent(event);
    });

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    expect(startTimeInput.value).toBe(secondsToTimecode(initialStartTime));
  });

  test('cleans up "seeked" event listener on unmount', () => {
    const { unmount } = render(<ConfigurationPanel onSubmit={vi.fn()} />);

    expect(mockVideoElement.addEventListener).toHaveBeenCalledWith(
      'seeked',
      expect.any(Function), // The handler function
      undefined // Or whatever options are used, if any
    );

    unmount();

    expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith(
      'seeked',
      expect.any(Function), // Should be the same handler function instance
      undefined
    );
  });

  test('initial start time is set from video current time', () => {
    mockVideoElement.currentTime = 3; // Set an initial time before render
    mockAppStoreState.videoElement = mockVideoElement;
    // @ts-ignore
    useAppStore.mockImplementation((selector) => selector(mockAppStoreState));

    render(<ConfigurationPanel onSubmit={vi.fn()} />);

    const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
    expect(startTimeInput.value).toBe(secondsToTimecode(3));
  });
});
