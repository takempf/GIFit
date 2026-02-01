import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { App } from './App';
import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';

// Mock wxt/browser
vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn().mockResolvedValue([{ title: 'Test Video - YouTube' }])
    },
    runtime: {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      }
    }
  }
}));

// Mock ConfigurationPanel to simulate form submission
vi.mock(
  '../features/editor/components/ConfigurationPanel/ConfigurationPanel',
  () => ({
    ConfigurationPanel: ({ onSubmit }: { onSubmit: (val: any) => void }) => (
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
  const mockPauseVideo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // App Store
    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => {
        return selector({
          status: 'idle',
          setStatus: mockSetStatus
        });
      }
    );

    // Gif Gen Store
    (useGifStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => {
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
    ).mockImplementation((selector: any) => {
      return selector({
        pauseVideo: mockPauseVideo
      });
    });
  });

  test('submits form data correctly to createGif without extra unit conversion', async () => {
    render(<App />);

    // confirm pauseVideo is called on mount
    expect(mockPauseVideo).toHaveBeenCalled();

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
});
