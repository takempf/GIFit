import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { App } from './App';
import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';

// Define hoisted mocks to be shared between factory and tests
const { addListenerMock, removeListenerMock } = vi.hoisted(() => ({
  addListenerMock: vi.fn(),
  removeListenerMock: vi.fn()
}));

// Mock wxt/browser
vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn().mockResolvedValue([{ title: 'Test Video - YouTube' }])
    },
    runtime: {
      onMessage: {
        addListener: addListenerMock,
        removeListener: removeListenerMock
      }
    }
  }
}));

// Mock ConfigurationPanel to simulate form submission
vi.mock(
  '../features/editor/components/ConfigurationPanel/ConfigurationPanel',
  () => ({
    ConfigurationPanel: ({
      onSubmit
    }: {
      onSubmit: (val: unknown) => void;
    }) => (
      <button
        data-testid="mock-submit-btn"
        onClick={() =>
          onSubmit({
            start: 1500, // 1.5s in ms
            duration: 2500, // 2.5s in ms
            width: 320,
            height: 240,
            framerate: 15,
            quality: 8,
            linkDimensions: true
          })
        }>
        Mock Submit
      </button>
    )
  })
);

// Mock other UI components
vi.mock('./AppLogo/AppLogo', () => ({ AppLogo: () => <div>Logo</div> }));
vi.mock('../features/generator/components/Progress/Progress', () => ({
  Progress: () => <div>Progress</div>
}));

// Mock Stores
vi.mock('@/stores/appStore');
vi.mock('@/features/editor/stores/configurationPanelStore');
vi.mock('@/features/generator/stores/gifGeneratorStore');

describe('App Integration', () => {
  const mockCreateGif = vi.fn();
  const mockSetName = vi.fn();
  const mockSetStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // App Store
    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: unknown) => unknown) => {
        return selector({
          status: 'configuring',
          setStatus: mockSetStatus
        });
      }
    );

    // Gif Gen Store
    (useGifStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: unknown) => unknown) => {
        return selector({
          createGif: mockCreateGif,
          setName: mockSetName,
          updateProgress: vi.fn(),
          complete: vi.fn(),
          setError: vi.fn(),
          status: 'idle'
        });
      }
    );

    // Config Panel Store
    (
      useConfigurationPanelStore as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation((selector: (state: unknown) => unknown) => {
      return selector({
        // Add necessary state for rendering
        width: 320,
        height: 240,
        previewImage: null
      });
    });
  });

  test('submits form data correctly to createGif without extra unit conversion', async () => {
    render(<App />);

    const submitBtn = screen.getByTestId('mock-submit-btn');
    fireEvent.click(submitBtn);

    // Wait for async calls (getVideoTitle)
    await waitFor(() => {
      expect(mockCreateGif).toHaveBeenCalledTimes(1);
    });

    // Check payload
    expect(mockCreateGif).toHaveBeenCalledWith({
      name: 'Test Video',
      quality: 8,
      width: 320,
      height: 240,
      start: 1500, // Should be passed as-is (ms)
      end: 4000, // start + duration (1500 + 2500)
      fps: 15
    });

    // Check side effects
    expect(mockSetName).toHaveBeenCalledWith('Test Video');
    expect(mockSetStatus).toHaveBeenCalledWith('generating');
  });

  test('transitions to "generated" status when GIF_COMPLETE message is received', () => {
    render(<App />);

    // Get the registered callback
    // Ensure addListener was called
    expect(addListenerMock).toHaveBeenCalled();
    const handleMessage = addListenerMock.mock.calls[0][0];

    // Simulate GIF_COMPLETE message
    const completeData = {
      blob: new Blob(),
      dataUrl: 'data:image/gif;base64,...',
      width: 320,
      height: 240,
      size: 1024
    };

    handleMessage({
      type: 'GIF_COMPLETE',
      data: completeData
    });

    expect(mockSetStatus).toHaveBeenCalledWith('generated');
  });
});
