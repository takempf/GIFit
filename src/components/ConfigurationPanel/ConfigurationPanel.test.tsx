import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import ConfigurationPanel from './ConfigurationPanel'; // Adjust path if necessary
import { secondsToTimecode } from '@/utils/secondsToTimecode'; // Helper for assertions
// Mocked icons that would be used by the buttons
// vi.mock('@/assets/arrow-right.svg?react', () => ({ default: () => 'ArrowRightIcon' }));
// vi.mock('@/assets/arrow-down.svg?react', () => ({ default: () => 'ArrowDownIcon' }));

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

  describe('Append Buttons Functionality', () => {
    test('clicking "Set start to current time" button updates start time input', async () => {
      mockVideoElement.currentTime = 15.5; // Video's current time
      mockAppStoreState.videoElement = mockVideoElement;
      (
        actualAppStore.useAppStore.getState as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockAppStoreState);
      // @ts-ignore
      (
        actualAppStore.useAppStore as ReturnType<typeof vi.fn>
      ).mockImplementation((selector) => selector(mockAppStoreState));

      render(<ConfigurationPanel onSubmit={vi.fn()} />);

      const setStartTimeButton = screen.getByLabelText(
        'Set start to current time'
      );
      await userEvent.click(setStartTimeButton);

      const startTimeInput = screen.getByLabelText('Start') as HTMLInputElement;
      // InputTime formats to M:SS.s, e.g., 0:15.5
      expect(startTimeInput.value).toBe(
        secondsToHMSsForTest(15.5, 1) // Assuming step 0.1 for start time
      );
    });

    test('clicking "Set duration to current time" button updates duration input', async () => {
      mockVideoElement.currentTime = 25.0; // Video's current time
      mockAppStoreState.videoElement = mockVideoElement;
      // Initial start time for the panel state will be 0 unless set otherwise
      // Let's assume panel's initial start time is 5s for this test.
      // We need to simulate the panel's internal state for 'start' being 5.
      // The easiest way is to first set the start time via its button or input change.

      const { rerender } = render(<ConfigurationPanel onSubmit={vi.fn()} />);

      // Simulate setting start time to 5s
      // First, set video current time to 5s and click the "set start" button
      mockVideoElement.currentTime = 5.0;
      await userEvent.click(screen.getByLabelText('Set start to current time'));
      // At this point, the panel's internal state for 'start' should be 5.0

      // Now, set video current time to 25s for duration calculation
      mockVideoElement.currentTime = 25.0;
      // Rerender or ensure state update if necessary;
      // for this direct button click leading to dispatch, it should be fine.

      const setDurationButton = screen.getByLabelText(
        'Set duration to current time'
      );
      await userEvent.click(setDurationButton);

      const durationInput = screen.getByLabelText(
        'Duration'
      ) as HTMLInputElement;
      // Expected duration = 25.0 (current) - 5.0 (start) = 20.0
      expect(durationInput.value).toBe('20'); // InputNumber shows plain number
    });

    test('"Set duration to current time" does nothing if current time is before start time', async () => {
      mockVideoElement.currentTime = 2.0; // Video's current time, before start
      mockAppStoreState.videoElement = mockVideoElement;

      render(<ConfigurationPanel onSubmit={vi.fn()} />);

      // Simulate setting start time to 5s
      mockVideoElement.currentTime = 5.0;
      await userEvent.click(screen.getByLabelText('Set start to current time'));
      const durationInput = screen.getByLabelText(
        'Duration'
      ) as HTMLInputElement;
      const initialDuration = durationInput.value; // Should be default '2'

      // Now, set video current time to be BEFORE start time (e.g., 2s)
      mockVideoElement.currentTime = 2.0;

      const setDurationButton = screen.getByLabelText(
        'Set duration to current time'
      );
      await userEvent.click(setDurationButton);

      expect(durationInput.value).toBe(initialDuration); // Duration should not change
    });
  });
});

// Helper function to mimic secondsToHMSs formatting for test assertions,
// as it's internal to InputTime.
// This is a simplified version for clarity.
const secondsToHMSsForTest = (
  totalSeconds: number,
  decimalPlaces: number
): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, '0');

  let formattedSeconds = seconds.toFixed(decimalPlaces);
  // Ensure seconds part is padded if it becomes like "5.0" -> "05.0" when minutes > 0 or hours > 0
  if ((hours > 0 || minutes > 0) && formattedSeconds.indexOf('.') !== -1) {
    const [secInt, secDec] = formattedSeconds.split('.');
    formattedSeconds = `${pad(parseInt(secInt, 10))}.${secDec}`;
  } else if (
    (hours > 0 || minutes > 0) &&
    formattedSeconds.indexOf('.') === -1
  ) {
    formattedSeconds = pad(parseInt(formattedSeconds, 10));
  }

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${formattedSeconds}`;
  }
  return `${minutes}:${formattedSeconds.padStart(
    2 + (decimalPlaces > 0 ? decimalPlaces + 1 : 0),
    '0'
  )}`;
};
