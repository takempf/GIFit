import { render, screen, fireEvent, act } from '@testing-library/react';
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
} from '@/features/editor/stores/configurationPanelStore';

// Helper type for mocked store
type MockStore = Mock<
  (selector?: (state: ConfigState & ConfigActions) => unknown) => unknown
>;

vi.mock('@/features/editor/stores/configurationPanelStore');
vi.mock('@/utils/logger', () => ({ log: vi.fn() }));
// Mock Input components to avoid complexity
vi.mock('@/components/ui/Input/Input', () => ({
  Input: (props: React.ComponentProps<'input'> & { label: string }) => (
    <input aria-label={props.label} {...props} />
  )
}));
vi.mock('@/components/ui/InputNumber/InputNumber', () => ({
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
vi.mock('@/components/ui/InputTime/InputTime', () => ({
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
vi.mock('@/components/ui/Button/Button', () => ({
  Button: (props: React.ComponentProps<'button'>) => (
    <button {...props}>{props.children}</button>
  )
}));
vi.mock('@/components/ui/ButtonToggle/ButtonToggle', () => ({
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

vi.mock('@/components/ui/Slider/Slider', () => ({
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
      videoHeight: 720
    };
    mockConfigStoreActions = {
      handleInputChange: vi.fn(),
      handleVideoLoadedData: vi.fn(),
      handleSetStartToCurrentTime: vi.fn(), // Removed from component usage, but kept in store interface
      seekVideo: vi.fn(),
      resetState: vi.fn(),
      fetchVideoMetadata: vi.fn().mockResolvedValue(undefined),
      syncStartToVideoTime: vi.fn().mockResolvedValue(undefined),
      captureFrame: vi.fn()
    };

    // Update mock to support atomic selectors
    const fullState = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions
    };

    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        if (selector) {
          return selector(fullState as ConfigState & ConfigActions);
        }
        return fullState;
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

  test('renders null if videoDuration is 0', () => {
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
    const { container } = render(
      <ConfigurationPanel onSubmit={mockOnSubmit} />
    );
    expect(container.firstChild).toBeNull();
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

  test('updates preview to new last frame when FPS changes if currently at last frame', () => {
    vi.useFakeTimers();
    const startMs = 0;
    const durationMs = 1000;
    const oldFps = 10;
    // Last frame for 10 FPS, 1s duration:
    // Frame count = 10. Last index = 9. Time = 9/10 * 1000 = 900ms.

    const state = {
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      start: startMs,
      duration: durationMs,
      framerate: oldFps
    };
    (useConfigurationPanelStore as unknown as MockStore).mockImplementation(
      (selector?: (state: ConfigState & ConfigActions) => unknown) => {
        return selector
          ? selector(state as ConfigState & ConfigActions)
          : state;
      }
    );

    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // 1. Position preview at the calculated last frame manually
    // We can't easily set state directly, but we can trigger it via handleTimelineChange 'end' logic
    // OR just use our knowledge that previewTime init state is `start` (0).
    // Let's trigger a timeline change "end" to snap it to last frame.
    // However, timeline change updates store.
    // Easier way: The component has `handlePreviewRequest` which updates state.
    // We can't access that directly.
    // But! initial state for previewTime is `start`.
    // Let's set start to what the last frame IS, just to trick it? No, that's messy.

    // Better: Simulate clicking the "end" handle on the Timeline?
    // The timeline mock is just a div but we can assume the real Timeline calls onChange.
    // But Timeline is NOT mocked in this file! It's imported real?
    // Looking at imports: `import { Timeline } from '../Timeline/Timeline';`
    // And mocks... Timeline IS NOT mocked. Great.

    // We can fire the onChange prop of Timeline.
    // But we don't have reference to the prop passed to Timeline.
    // Actually, looking at the code for ConfigurationPanel, it renders Timeline.
    // We can just rely on the fact that if we change FPS, it should behave.

    // Wait, to test "if currently at last frame", we need to BE at last frame.
    // How to get `previewTime` state to be `900`?
    // `handleTimelineChange(..., 'end')` does:
    // previewTime = calculateLastFramePreview(...).

    // So we need to trigger `onChange` on the Timeline component.
    // Since Timeline is real, we can find the timeline component in the render.
    // But doing `fireEvent` on internal Timeline logic is hard.

    // Let's Mock Timeline to expose its onChange?
    // Or just re-render with a different store state? No, previewTime is local state.

    // Strategy:
    // 1. Mock 'calculateLastFramePreview' to be sure? No, logic is simple.
    // 2. We can trigger `handleTimelineChange` by simulating an interaction if we understood Timeline better.
    //    Timeline calls onChange when dragging.
    //    Timeline has `onChange` prop.

    // Let's just mock Timeline for THIS test file (or generally) to make it easier to trigger onChange.
    // Currently Timeline IS NOT mocked locally.
    // It might be better to Mock Timeline for the whole file since we are testing ConfigurationPanel, not Timeline integration.
    // But existing tests might rely on it.
    // Let-s look at existing tests. `test('renders correctly...')`.

    // Let's add a Mock for Timeline at the top of the file if it's not too disruptive.
    // Actually, I can just use `handleTimelineChange` if I can access it. I can't.

    // Alternative: The `InputTime` for start updates preview. But that updates `start` too.

    // Let's look at `handleDurationChange`.
    // input change -> `handleDurationChangeMs` -> `handlePreviewRequest(calculatedLastFrame)`.
    // So if I update duration, it sets preview to last frame.
    // PERFECT.

    // 1. Change Duration input. This sets previewTime to "last frame of old FPS".
    // 2. Change FPS input. This should detect we are at last frame, and update previewTime to "last frame of NEW FPS".

    const durationInput = screen.getByLabelText('Duration');
    fireEvent.change(durationInput, {
      target: { name: 'duration', value: '1.0' }
    });

    act(() => {
      vi.runAllTimers();
    });

    // Now previewTime should be 900ms (for 10FPS).
    expect(mockConfigStoreActions.seekVideo).toHaveBeenLastCalledWith(900);

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
