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
} from '@/stores/configurationPanelStore';

vi.mock('@/stores/configurationPanelStore');
vi.mock('@/utils/logger', () => ({ log: vi.fn() }));
// Mock Input components to avoid complexity
vi.mock('../Input/Input', () => ({
  Input: (props: React.ComponentProps<'input'> & { label: string }) => (
    <input aria-label={props.label} {...props} />
  )
}));
vi.mock('../InputNumber/InputNumber', () => ({
  InputNumber: (props: React.ComponentProps<'input'> & { label: string }) => (
    <input aria-label={props.label} type="number" {...props} />
  )
}));
vi.mock('../InputTime/InputTime', () => ({
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
vi.mock('../Button/Button', () => ({
  Button: (props: React.ComponentProps<'button'>) => (
    <button {...props}>{props.children}</button>
  )
}));
vi.mock('../ButtonToggle/ButtonToggle', () => ({
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

describe('ConfigurationPanel', () => {
  const mockOnSubmit = vi.fn();
  let mockConfigStoreState: Partial<ConfigState>;
  let mockConfigStoreActions: Partial<ConfigActions>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConfigStoreState = {
      start: 0,
      duration: 2,
      width: 1280,
      height: 720,
      linkDimensions: true,
      framerate: 10,
      quality: 5,
      aspectRatio: 1280 / 720,
      videoDuration: 100,
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
    (useConfigurationPanelStore as unknown as Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions
    });
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
      String(mockConfigStoreState.duration)
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
    expect((screen.getByLabelText('Quality') as HTMLInputElement).value).toBe(
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

  test('calls store action on link dimensions toggle', () => {
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    // The mocked ButtonToggle uses a checkbox
    // Searching for checkbox with name="linkDimensions" might not find it by role easily with my mock.
    // The mock is: <label>{props.label}<input type="checkbox" ... /></label>
    // But props.label is undefined in the component usage?
    // In component: <ButtonToggle ... name="linkDimensions" ... >
    // Let's find by type checkbox
    const linkCheckbox = screen
      .getAllByRole('checkbox')
      .find((el) => el.getAttribute('name') === 'linkDimensions');
    expect(linkCheckbox).toBeDefined();
    fireEvent.click(linkCheckbox!);
    expect(mockConfigStoreActions.handleInputChange).toHaveBeenCalledWith({
      name: 'linkDimensions',
      value: !mockConfigStoreState.linkDimensions
    });
  });

  test('submits form with current config from store', () => {
    const submittedState = {
      ...mockConfigStoreState,
      videoDuration: 100,
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
    (useConfigurationPanelStore as unknown as Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      videoDuration: 0
    });
    const { container } = render(
      <ConfigurationPanel onSubmit={mockOnSubmit} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('duration input change seeks video to last frame of duration', () => {
    vi.useFakeTimers();
    (useConfigurationPanelStore as unknown as Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      start: 5,
      framerate: 10
    });
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
      value: 1.05
    });

    // Seek should happen to calculated preview time
    expect(mockConfigStoreActions.seekVideo).toHaveBeenCalledWith(6.0);
    vi.useRealTimers();
  });

  test('max values for inputs are calculated correctly', () => {
    (useConfigurationPanelStore as unknown as Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      start: 10,
      duration: 5,
      videoDuration: 60,
      videoWidth: 1920, // configVideoWidth
      videoHeight: 1080 // configVideoHeight
    });
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText('Duration')).toHaveAttribute('max', '30');
    expect(screen.getByLabelText('Width')).toHaveAttribute('max', '1920'); // calculated from configVideoWidth
    expect(screen.getByLabelText('Height')).toHaveAttribute('max', '1080'); // calculated from configVideoHeight
  });
  test('increments duration on step up and honors rounding', () => {
    vi.useFakeTimers();
    (useConfigurationPanelStore as unknown as Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      duration: 1.0,
      framerate: 60
    });
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // Simulate stepping up: 1.0 + 1/60 (0.01666...) => 1.01666...
    // Should display rounded to 1.017

    // We can't easily simulate browser's native stepUp calculation perfectly via fireEvent.change alone unless we do the math
    // But we know our component receives the change event with the new value.
    // InputNumber sets step={1/framerate}.
    // We verify our rounding logic applies to the new value.

    fireEvent.change(screen.getByLabelText('Duration'), {
      target: { name: 'duration', value: '1.01666666667' }
    });

    expect(mockConfigStoreActions.handleInputChange).toHaveBeenCalledWith({
      name: 'duration',
      value: 1.017
    });
    vi.useRealTimers();
  });

  test('allows arbitrary duration without snapping on blur', () => {
    vi.useFakeTimers();
    (useConfigurationPanelStore as unknown as Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      duration: 1.7
    });

    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    const durationInput = screen.getByLabelText('Duration');
    fireEvent.blur(durationInput);

    // Should NOT call handleInputChange with a snapped value
    expect(mockConfigStoreActions.handleInputChange).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
