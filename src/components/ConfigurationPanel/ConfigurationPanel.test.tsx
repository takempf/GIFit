import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect, afterEach } from 'vitest';
import ConfigurationPanel from './ConfigurationPanel';
// import { secondsToTimecode } from '@/utils/secondsToTimecode'; // Not directly used
import { useAppStore } from '@/stores/appStore';
import { useConfigurationPanelStore } from '@/stores/configurationPanelStore';
import { createMockVideoElement } from '@/test-utils/testHelpers';

vi.mock('@/stores/appStore', async () => {
  const actualAppStoreModule = await vi.importActual('@/stores/appStore');
  const { createMockVideoElement: createMockVideoElementInFactory } =
    await import('@/test-utils/testHelpers');
  const mockVideoEl = createMockVideoElementInFactory();
  const mockGetState = vi.fn(() => ({
    videoElement: mockVideoEl,
    isOpen: true,
    status: 'configuring'
  }));
  const mockSubscribe = vi.fn(() => () => {});
  const mockSetState = vi.fn();
  const mockHook = vi.fn((selector) => selector(mockGetState()));
  Object.assign(mockHook, {
    getState: mockGetState,
    setState: mockSetState,
    subscribe: mockSubscribe,
    ...Object.fromEntries(
      Object.entries(actualAppStoreModule.useAppStore).filter(
        ([, value]) => typeof value !== 'function'
      )
    )
  });
  return { useAppStore: mockHook, __mockGetState: mockGetState };
});

vi.mock('@/stores/configurationPanelStore');
vi.mock('@/utils/logger', () => ({ log: vi.fn() }));

describe('ConfigurationPanel', () => {
  let mockVideoElement: HTMLVideoElement;
  const mockOnSubmit = vi.fn();
  let mockConfigStoreState: any;
  let mockConfigStoreActions: any;
  let appStoreMockGetState: vi.Mock;

  beforeEach(async () => {
    const appStoreMock = await import('@/stores/appStore');
    // @ts-ignore
    appStoreMockGetState = appStoreMock.__mockGetState;
    vi.clearAllMocks();
    mockVideoElement = createMockVideoElement(); // Default readyState is 1
    appStoreMockGetState.mockReturnValue({
      videoElement: mockVideoElement,
      isOpen: true,
      status: 'configuring'
    });
    (useAppStore as unknown as vi.Mock).mockImplementation(
      (selector?: (state: any) => any) => {
        const currentState = appStoreMockGetState();
        return selector ? selector(currentState) : currentState;
      }
    );
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
      handleSetStartToCurrentTime: vi.fn(),
      seekVideo: vi.fn(),
      resetState: vi.fn()
    };
    (useConfigurationPanelStore as vi.Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions
    });
    (useConfigurationPanelStore as any).getState = vi.fn(
      () => mockConfigStoreState
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders correctly with initial values from store', () => {
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText('Start').value).toBe('0:00.0');
    expect(screen.getByLabelText('Duration').value).toBe(
      String(mockConfigStoreState.duration)
    );
    expect(screen.getByLabelText('Width').value).toBe(
      String(mockConfigStoreState.width)
    );
    expect(screen.getByLabelText('Height').value).toBe(
      String(mockConfigStoreState.height)
    );
    expect(screen.getByLabelText('FPS').value).toBe(
      String(mockConfigStoreState.framerate)
    );
    expect(screen.getByLabelText('Quality').value).toBe(
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

  test('calls store action on start time change and seeks video', () => {
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    act(() => {
      mockVideoElement.currentTime = 25;
    });
    fireEvent.click(screen.getByRole('button', { name: /Now/i }));
    expect(
      mockConfigStoreActions.handleSetStartToCurrentTime
    ).toHaveBeenCalledWith({ currentTime: 25 });
  });

  test('calls store action on link dimensions toggle', () => {
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    // The ButtonToggle contains an input checkbox with name="linkDimensions"
    const linkCheckbox = screen.getByRole('checkbox', {
      name: 'linkDimensions'
    });
    fireEvent.click(linkCheckbox);
    expect(mockConfigStoreActions.handleInputChange).toHaveBeenCalledWith({
      name: 'linkDimensions',
      value: !mockConfigStoreState.linkDimensions
    });
  });

  test('submits form with current config from store', () => {
    const submittedState = {
      ...mockConfigStoreState,
      videoDuration: mockVideoElement.duration,
      videoWidth: mockVideoElement.videoWidth,
      videoHeight: mockVideoElement.videoHeight
    };
    (useConfigurationPanelStore as any).getState = vi.fn(() => submittedState);
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /Create GIF/i }));
    expect(mockOnSubmit).toHaveBeenCalledWith(submittedState);
  });

  test('handles video loaded metadata callback', () => {
    // Ensure videoElement for this test has readyState >= 1 from the start
    // to test the direct call path in useEffect.
    mockVideoElement = createMockVideoElement(0, 120, 1920, 1080, 1); // readyState is 1
    appStoreMockGetState.mockReturnValue({
      videoElement: mockVideoElement,
      isOpen: true,
      status: 'configuring'
    });
    (useAppStore as unknown as vi.Mock).mockImplementation(
      (selector?: (state: any) => any) => selector(appStoreMockGetState())
    );

    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);

    // The useEffect should call handleVideoLoadedData directly because readyState is 1
    expect(mockConfigStoreActions.handleVideoLoadedData).toHaveBeenCalledWith({
      aspectRatio: 1920 / 1080,
      duration: 120,
      videoWidth: 1920,
      videoHeight: 1080
    });
  });

  test('cleans up "loadedmetadata" event listener on unmount', () => {
    const { unmount } = render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    expect(mockVideoElement.addEventListener).toHaveBeenCalledWith(
      'loadedmetadata',
      expect.any(Function)
    );
    unmount();
    expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith(
      'loadedmetadata',
      expect.any(Function)
    );
  });

  test('renders null if no video element', () => {
    appStoreMockGetState.mockReturnValue({
      videoElement: null,
      isOpen: true,
      status: 'configuring'
    });
    (useAppStore as unknown as vi.Mock).mockImplementation(
      (selector?: (state: any) => any) => selector(appStoreMockGetState())
    );
    const { container } = render(
      <ConfigurationPanel onSubmit={mockOnSubmit} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('duration input change seeks video', () => {
    (useConfigurationPanelStore as vi.Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      start: 5
    });
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    act(() => {
      fireEvent.change(screen.getByLabelText('Duration'), {
        target: { name: 'duration', value: '10' }
      });
    });
    expect(mockConfigStoreActions.handleInputChange).toHaveBeenCalledWith({
      name: 'duration',
      value: 10
    });
    expect(mockConfigStoreActions.seekVideo).toHaveBeenCalledWith(15);
  });

  test('max values for inputs are calculated correctly', () => {
    (useConfigurationPanelStore as vi.Mock).mockReturnValue({
      ...mockConfigStoreState,
      ...mockConfigStoreActions,
      start: 10,
      duration: 5,
      videoDuration: 60,
      videoWidth: 1920,
      videoHeight: 1080
    });
    mockVideoElement = createMockVideoElement(10, 60, 1920, 1080);
    appStoreMockGetState.mockReturnValue({
      videoElement: mockVideoElement,
      isOpen: true,
      status: 'configuring'
    });
    (useAppStore as unknown as vi.Mock).mockImplementation(
      (selector?: (state: any) => any) => selector(appStoreMockGetState())
    );
    render(<ConfigurationPanel onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText('Duration')).toHaveAttribute('max', '30');
    expect(screen.getByLabelText('Width')).toHaveAttribute('max', '1920');
    expect(screen.getByLabelText('Height')).toHaveAttribute('max', '1080');
  });
});
