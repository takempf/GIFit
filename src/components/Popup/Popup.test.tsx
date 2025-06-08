import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popup } from './Popup';
import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';

// --- Mock Stores ---
vi.mock('@/stores/appStore');
vi.mock('@/stores/gifGeneratorStore');

// --- Mock Child Components & Motion ---
vi.mock('../ConfigurationPanel/ConfigurationPanel', () => ({
  default: vi.fn(({ onSubmit }) => (
    <div data-testid="mock-config-panel">
      <button
        data-testid="mock-submit-button"
        onClick={() =>
          onSubmit({
            start: 0,
            duration: 1, // Changed from end: 1
            width: 100,
            height: 80, // Example height
            linkDimensions: true, // Example
            framerate: 10,
            quality: 5,
            aspectRatio: 100 / 80 // Example
          })
        }>
        Mock Submit
      </button>
    </div>
  ))
}));
vi.mock('../Progress/Progress', () => ({
  default: () => <div data-testid="mock-progress" />
}));
vi.mock('../Button/Button', () => ({
  Button: vi.fn(({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ))
}));
vi.mock('../AppLogo/AppLogo', () => ({
  AppLogo: () => <div data-testid="mock-applogo-popup" />
}));
vi.mock('../AppFrame/AppFrame', () => ({
  AppFrame: ({ children }) => (
    <div data-testid="mock-appframe-popup">{children}</div>
  )
}));
vi.mock('@/assets/tk.svg', () => ({
  default: () => <img data-testid="tk-logo-svg" alt="TK Logo" />
}));

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AnimatePresence: vi.fn(({ children }) => children), // Render children directly
    motion: {
      div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
      section: vi.fn(({ children, ...props }) => (
        <section {...props}>{children}</section>
      ))
    }
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: vi.fn()
}));

describe('Popup', () => {
  const mockAppClose = vi.fn();
  const mockAppSetStatus = vi.fn();
  let mockVideoElement = document.createElement('video'); // Basic mock

  const mockGifSetName = vi.fn();
  const mockGifCreateGif = vi.fn();
  const mockGifAbortGif = vi.fn();
  // Add mockClearResult and mockResetStores if they exist and are used by "Back" button.
  // Assuming for now 'Back' button in 'complete' status might call setStatus in appStore or reset in gifStore.
  // The Progress component itself has a "Back" button that calls appStore.setStatus('configuring').
  // Popup doesn't seem to have its own "Back" button apart from the one in Progress.

  const mockUseAppStore = useAppStore as vi.Mock;
  const mockUseGifStore = useGifStore as vi.Mock;

  beforeEach(() => {
    // Mock scrollIntoView for JSDOM
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    mockAppClose.mockClear();
    mockAppSetStatus.mockClear();
    // Create a proper HTMLVideoElement mock
    mockVideoElement = document.createElement('video');
    vi.spyOn(mockVideoElement, 'pause'); // Spy on its methods if needed
    mockVideoElement.currentTime = 0;
    // JSDOM doesn't implement all video properties like videoWidth, videoHeight, duration by default.
    // We need to define them if the component relies on them for instanceof checks or direct property access.
    Object.defineProperty(mockVideoElement, 'videoWidth', {
      value: 640,
      writable: true
    });
    Object.defineProperty(mockVideoElement, 'videoHeight', {
      value: 360,
      writable: true
    });
    Object.defineProperty(mockVideoElement, 'duration', {
      value: 10,
      writable: true
    });
    Object.defineProperty(mockVideoElement, 'paused', {
      value: true,
      writable: true
    }); // Ensure it's writable if component tries to set it

    mockGifSetName.mockClear();
    mockGifCreateGif.mockClear();
    mockGifAbortGif.mockClear();

    // Default App Store State
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        videoElement: mockVideoElement,
        status: 'configuring', // Default or current app status
        close: mockAppClose,
        setStatus: mockAppSetStatus
      };
      return selector(state);
    });

    // Default Gif Store State
    mockUseGifStore.mockImplementation((selector) => {
      const state = {
        status: 'idle', // Default gif generation status
        generationId: 'test-id-123',
        setName: mockGifSetName,
        createGif: mockGifCreateGif,
        abortGif: mockGifAbortGif,
        result: null // For 'complete' state
      };
      return selector(state);
    });

    // Mock document.querySelector for #title
    const mockTitleElement = document.createElement('div');
    mockTitleElement.id = 'title';
    mockTitleElement.innerText = 'Test Page Title';
    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '#title') return mockTitleElement;
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders ConfigurationPanel when gifStore status is "idle"', () => {
    render(<Popup />);
    expect(screen.getByTestId('mock-config-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-progress')).not.toBeInTheDocument();
  });

  it('calls handleSubmit which calls createGif and setName when ConfigurationPanel submits', async () => {
    render(<Popup />);
    const submitButton = screen.getByTestId('mock-submit-button'); // From mocked ConfigurationPanel
    await userEvent.click(submitButton);

    expect(mockGifCreateGif).toHaveBeenCalledTimes(1);
    expect(mockGifSetName).toHaveBeenCalledWith('Test Page Title'); // From mocked #title
    expect(mockAppSetStatus).toHaveBeenCalledWith('generating'); // App status set by Popup's handleSubmit
  });

  it('renders Progress component when gifStore status is "generating"', () => {
    mockUseGifStore.mockImplementation((selector) =>
      selector({
        status: 'generating',
        setName: mockGifSetName,
        createGif: mockGifCreateGif,
        abortGif: mockGifAbortGif,
        generationId: 'gen-id'
      })
    );
    render(<Popup />);
    expect(screen.getByTestId('mock-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-config-panel')).not.toBeInTheDocument();
    // Note: The "Cancel" button is part of the actual Progress component, not directly in Popup.
    // Testing cancel would be part of Progress.test.tsx or an integration test.
  });

  it('does NOT render Progress component directly when gifStore status is "complete"', () => {
    // Popup.tsx only renders Progress when status is 'generating'.
    // If Progress or another component shows for 'complete', that's internal to them or ConfigurationPanel.
    const mockBlob = new Blob(['gif data'], { type: 'image/gif' });
    mockUseGifStore.mockImplementation((selector) =>
      selector({
        status: 'complete',
        result: { blob: mockBlob },
        setName: mockGifSetName,
        createGif: mockGifCreateGif,
        abortGif: mockGifAbortGif,
        generationId: 'gen-id'
      })
    );
    render(<Popup />);
    expect(screen.queryByTestId('mock-progress')).not.toBeInTheDocument();
  });

  it('calls appStore.close and appStore.setStatus when main close button is clicked', async () => {
    render(<Popup />);
    // The close button is from the mocked Button component.
    // It's the one in the header with "✕".
    const closeButton = screen.getByRole('button', { name: '✕' });
    await userEvent.click(closeButton);

    expect(mockAppSetStatus).toHaveBeenCalledWith('configuring');
    expect(mockAppClose).toHaveBeenCalledTimes(1);
  });

  it('renders the credit link with correct attributes', () => {
    render(<Popup />);
    const creditLink = screen.getByRole('link', { name: /Crafted by/i });
    expect(creditLink).toBeInTheDocument();
    expect(creditLink).toHaveAttribute('href', 'https://kempf.dev/#gifit');
    expect(creditLink).toHaveAttribute('target', '_blank');
    expect(creditLink).toHaveAttribute('rel', 'noreferrer');
    expect(creditLink).toHaveAttribute('referrerPolicy', 'unsafe-url');
    expect(screen.getByTestId('tk-logo-svg')).toBeInTheDocument();
  });
});
