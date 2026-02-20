import { render, screen, fireEvent, act } from '@shared/test-utils';
import {
  vi,
  describe,
  beforeEach,
  test,
  expect,
  afterEach,
  Mock
} from 'vitest';
import { ConfigurationPanel } from './ConfigurationPanel';
import {
  useConfigurationPanelStore,
  ConfigState,
  ConfigActions
} from '@shared/features/editor/stores/configurationPanelStore';

// Helper type for mocked store
type MockStore = Mock<
  (selector?: (state: ConfigState & ConfigActions) => unknown) => unknown
>;

vi.mock('@shared/features/editor/stores/configurationPanelStore');
vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn(),
      get: vi.fn()
    },
    runtime: {
      onMessage: { addListener: vi.fn() }
    }
  }
}));
vi.mock('@shared/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));
// Mock Input components to avoid complexity
vi.mock('@shared/components/ui/Input/Input', () => ({
  Input: (props: React.ComponentProps<'input'> & { label: string }) => (
    <input aria-label={props.label} {...props} />
  )
}));
vi.mock('@shared/components/ui/InputNumber/InputNumber', () => ({
  InputNumber: (
    props: React.ComponentProps<'input'> & {
      label: string;
      onStep?: (val: number, dir: 'up' | 'down') => number;
    }
  ) => (
    <div>
      <input
        aria-label={props.label}
        type="number"
        {...props}
        onChange={(e) => props.onChange && props.onChange(e)}
      />
      <button
        aria-label="Increment"
        onClick={() => {
          if (props.onStep && props.value !== undefined) {
            const val =
              typeof props.value === 'string'
                ? parseFloat(props.value)
                : Number(props.value);
            const newVal = props.onStep(val, 'up');
            // Simulate onChange
            if (props.onChange) {
              props.onChange({
                target: { value: String(newVal), name: props.name }
              } as React.ChangeEvent<HTMLInputElement>);
            }
          }
        }}>
        Increment
      </button>
    </div>
  )
}));
vi.mock('@shared/components/ui/InputTime/InputTime', () => ({
  InputTime: (
    props: React.ComponentProps<'input'> & {
      label: string;
      append?: React.ReactNode;
    }
  ) => (
    <div>
      <input aria-label={props.label} {...props} />
      {props.append}
    </div>
  )
}));
vi.mock('@shared/components/ui/Button/Button', () => ({
  Button: (props: React.ComponentProps<'button'>) => (
    <button {...props}>{props.children}</button>
  )
}));
vi.mock('@shared/components/ui/ButtonToggle/ButtonToggle', () => ({
  ButtonToggle: (props: {
    label: string;
    name: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <label>
      {props.label}
      <input
        type="checkbox"
        name={props.name}
        checked={props.checked}
        onChange={() => props.onChange(!props.checked)}
      />
    </label>
  )
}));

vi.mock('@shared/components/ui/Slider/Slider', () => ({
  Slider: (props: {
    label: string;
    value: number;
    onChange: (val: number) => void;
  }) => (
    <div aria-label={props.label}>
      <div
        role="slider"
        aria-label={props.label}
        aria-valuenow={props.value}
        data-testid="quality-input"
      />
    </div>
  )
}));

describe('ConfigurationPanel', () => {
  const mockOnSubmit = vi.fn();
  let mockConfigStoreState: Partial<ConfigState>;
  let mockConfigStoreActions: Partial<ConfigActions>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConfigStoreState = {
      start: 0,
      duration: 2000,
      width: 1280,
      height: 720,

      framerate: 10,
      quality: 5,
      aspectRatio: 1280 / 720,
      videoDuration: 100000,
      videoWidth: 1280,
      videoHeight: 720,
      previewImage: null,
      previewTime: 0
    };
    mockConfigStoreActions = {
      handleInputChange: vi.fn(),
      handleVideoLoadedData: vi.fn(),
      handleSetStartToCurrentTime: vi.fn(), // Removed from component usage, but kept in store interface
      seekVideo: vi.fn().mockResolvedValue(undefined),
      resetState: vi.fn(),
      fetchVideoMetadata: vi.fn().mockResolvedValue(undefined),
      syncStartToVideoTime: vi.fn().mockResolvedValue(undefined),
      captureFrame: vi.fn((timeMs?: number) => {
        if (timeMs !== undefined) {
          mockConfigStoreState.previewTime = timeMs;
        }
        return Promise.resolve();
      })
    };

    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        const currentFullState = {
          ...mockConfigStoreState,
          ...mockConfigStoreActions
        };
        if (selector) {
          return selector(currentFullState as ConfigState & ConfigActions);
        }
        return currentFullState;
      }
    );

    (
      useConfigurationPanelStore as unknown as {
        getState: () => Partial<ConfigState>;
      }
    ).getState = vi.fn(() => mockConfigStoreState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders correctly with initial values from store', () => {
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe(
      '0'
    ); // InputTime mock renders value as is
    expect((screen.getByLabelText('Duration') as HTMLInputElement).value).toBe(
      '2'
    );
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe(
      String(mockConfigStoreState.width)
    );
    expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe(
      String(mockConfigStoreState.height)
    );
    expect((screen.getByLabelText('FPS') as HTMLInputElement).value).toBe(
      String(mockConfigStoreState.framerate)
    );
    expect(screen.getByRole('slider', { name: /Quality/i })).toHaveAttribute(
      'aria-valuenow',
      String(mockConfigStoreState.quality)
    );
  });

  test('calls store action on input change', () => {
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByLabelText('Width'), {
      target: { name: 'width', value: '640' }
    });
    expect(mockConfigStoreActions.handleInputChange).toHaveBeenCalledWith({
      name: 'width',
      value: 640
    });
  });

  test('submits form with current config from store', () => {
    const submittedState = {
      ...mockConfigStoreState,
      videoDuration: 100000,
      videoWidth: 1280,
      videoHeight: 720
    };
    (
      useConfigurationPanelStore as unknown as {
        getState: () => Partial<ConfigState>;
      }
    ).getState = vi.fn(() => submittedState);
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /Create GIF/i }));
    expect(mockOnSubmit).toHaveBeenCalledWith(submittedState);
  });

  test('fetches video metadata on mount', () => {
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    expect(mockConfigStoreActions.fetchVideoMetadata).toHaveBeenCalled();
  });

  test('renders interstitial when videoDuration is 0', () => {
    const state = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      videoDuration: 0
    };
    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        return selector
          ? selector(state as ConfigState & ConfigActions)
          : state;
      }
    );
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    expect(screen.getByText('No Video Detected')).toBeInTheDocument();
    expect(
      screen.getByText(/couldn't find a video on this page/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retry video detection/i })
    ).toBeInTheDocument();
  });

  test('calls fetchVideoMetadata when retry button is clicked', () => {
    const state = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      videoDuration: 0
    };
    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        return selector
          ? selector(state as ConfigState & ConfigActions)
          : state;
      }
    );
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // Clear the initial mount call
    vi.mocked(mockConfigStoreActions.fetchVideoMetadata!).mockClear();

    fireEvent.click(
      screen.getByRole('button', { name: /retry video detection/i })
    );

    expect(mockConfigStoreActions.fetchVideoMetadata).toHaveBeenCalledTimes(1);
  });

  test('duration input change seeks video to last frame of duration', () => {
    vi.useFakeTimers();
    const state = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      start: 5000,
      framerate: 10
    };
    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        return selector
          ? selector(state as ConfigState & ConfigActions)
          : state;
      }
    );
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // Logic: Duration 1.05.
    // 10 FPS. Frame Dur = 0.1s.
    // 1.05s is in frame index ceil(1.05 * 10) - 1 = ceil(10.5) - 1 = 11 - 1 = 10.
    // Frame 10 time = 0 + (10/10) = 1.0s.
    // Relative to start 5: 5 + 1.0 = 6.0s.

    // Duration 1.01
    // ceil(10.1) - 1 = 11 - 1 = 10. Frame 10. Time 6.0.

    fireEvent.change(screen.getByLabelText('Duration'), {
      target: { name: 'duration', value: '1.05' }
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(mockConfigStoreActions.handleInputChange).toHaveBeenCalledWith({
      name: 'duration',
      value: 1050
    });

    // Seek should happen to calculated preview time
    expect(mockConfigStoreActions.seekVideo).toHaveBeenCalledWith(6000);
    vi.useRealTimers();
  });

  test('max values for inputs are calculated correctly', () => {
    const state = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      start: 10000,
      duration: 5000,
      videoDuration: 60000,
      videoWidth: 1920,
      videoHeight: 1080
    };
    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        return selector
          ? selector(state as ConfigState & ConfigActions)
          : state;
      }
    );
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText('Duration')).toHaveAttribute('max', '30');
    expect(screen.getByLabelText('Width')).toHaveAttribute('max', '1920'); // calculated from configVideoWidth
    expect(screen.getByLabelText('Height')).toHaveAttribute('max', '1080'); // calculated from configVideoHeight
  });
  test('increments duration on step up and honors flooring', () => {
    vi.useFakeTimers();
    const state = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      duration: 1000,
      framerate: 60
    };
    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        return selector
          ? selector(state as ConfigState & ConfigActions)
          : state;
      }
    );
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // Simulate stepping up: 1.0 + 1/60 (0.016666666666666666)
    // 1.016666... seconds = 1016.666... ms
    // Floor -> 1016 ms (Round would be 1017 ms)

    // We simulate the change event with the stepped value
    fireEvent.change(screen.getByLabelText('Duration'), {
      target: { name: 'duration', value: '1.01666666667' }
    });

    expect(mockConfigStoreActions.handleInputChange).toHaveBeenCalledWith({
      name: 'duration',
      value: 1016 // Floored
    });
    vi.useRealTimers();
  });

  test('allows arbitrary duration without snapping on blur', () => {
    vi.useFakeTimers();
    const state = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      duration: 1700
    };
    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        return selector
          ? selector(state as ConfigState & ConfigActions)
          : state;
      }
    );

    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    const durationInput = screen.getByLabelText('Duration');
    fireEvent.blur(durationInput);

    // Should NOT call handleInputChange with a snapped value
    expect(mockConfigStoreActions.handleInputChange).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  test('updates preview to new last frame when FPS changes if currently at last frame', async () => {
    vi.useFakeTimers();
    const startMs = 0;
    const durationMs = 1000;
    const oldFps = 10;
    // Last frame for 10 FPS, 1s duration:
    // Frame count = 10. Last index = 9. Time = 9/10 * 1000 = 900ms.

    // Update mockConfigStoreState directly so the global mock picks up changes from captureFrame
    mockConfigStoreState.start = startMs;
    mockConfigStoreState.duration = durationMs;
    mockConfigStoreState.framerate = oldFps;

    const { rerender } = render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // 1. Change Duration input. This sets previewTime to "last frame of old FPS".
    // 2. Change FPS input. This should detect we are at last frame, and update previewTime to "last frame of NEW FPS".

    const durationInput = screen.getByLabelText('Duration');
    fireEvent.change(durationInput, {
      target: { name: 'duration', value: '1.0' }
    });

    act(() => {
      vi.runAllTimers();
    });
    // Ensure async operations complete
    await Promise.resolve();

    // Now previewTime should be 900ms (for 10FPS).
    expect(mockConfigStoreActions.seekVideo).toHaveBeenLastCalledWith(900);

    // Force re-render to pick up the updated previewTime from the mocked store
    rerender(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // 2. Change FPS to 20.
    // New last frame for 1000ms @ 20fps:
    // Frames = 20. Last index = 19. Time = 19/20 * 1000 = 950ms.

    const fpsInput = screen.getByLabelText('FPS');
    fireEvent.change(fpsInput, { target: { name: 'framerate', value: '20' } });

    act(() => {
      vi.runAllTimers();
    });

    // Verify seekVideo was called with 950.
    expect(mockConfigStoreActions.seekVideo).toHaveBeenLastCalledWith(950);

    vi.useRealTimers();
  });
});
