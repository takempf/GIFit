import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, createMockAdapters, act } from '@shared/test-utils';
import { GifProgressCallbacks } from '@shared/adapters/types';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { App } from './App';
import { useAppStore } from '@shared/stores/appStore';
import { useGifStore } from '@shared/features/generator/stores/gifGeneratorStore';
import { useConfigurationPanelStore } from '@shared/features/editor/stores/configurationPanelStore';

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
vi.mock('@shared/stores/appStore');
vi.mock('@shared/features/editor/stores/configurationPanelStore');
vi.mock('@shared/features/generator/stores/gifGeneratorStore');

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

  test('submits form data correctly and persists config to storage', async () => {
    const mockStorageAdapter = {
      ...createMockAdapters().storage,
      setWidth: vi.fn().mockResolvedValue(undefined),
      setFps: vi.fn().mockResolvedValue(undefined),
      setQuality: vi.fn().mockResolvedValue(undefined)
    };

    render(<App />, { adapters: { storage: mockStorageAdapter } });

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

    // Check persistence to storage
    expect(mockStorageAdapter.setWidth).toHaveBeenCalledWith(320);
    expect(mockStorageAdapter.setFps).toHaveBeenCalledWith(15);
    expect(mockStorageAdapter.setQuality).toHaveBeenCalledWith(8);

    // Check side effects
    expect(mockSetName).toHaveBeenCalledWith('Test Video');
    expect(mockSetStatus).toHaveBeenCalledWith('generating');
  });

  test('transitions to "generated" status when GIF_COMPLETE message is received', () => {
    const mockSetCallbacks = vi.fn();
    const gifAdapter = {
      ...createMockAdapters().gif,
      setCallbacks: mockSetCallbacks
    };

    render(<App />, { adapters: { gif: gifAdapter } });

    // Verify setCallbacks was called
    expect(mockSetCallbacks).toHaveBeenCalled();

    // Get the callbacks
    const callbacks = mockSetCallbacks.mock.calls[0][0] as GifProgressCallbacks;

    // Simulate GIF_COMPLETE message
    const completeData = {
      blob: new Blob(),
      dataUrl: 'data:image/gif;base64,...',
      width: 320,
      height: 240,
      size: 1024
    };

    act(() => {
      callbacks.onComplete(completeData);
    });

    expect(mockSetStatus).toHaveBeenCalledWith('generated');
  });
});
