import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResultPanel } from './ResultPanel';
import { useGifStore } from '@shared/features/generator/stores/gifGeneratorStore';
import { useAppStore } from '@shared/stores/appStore';

// Mock stores
vi.mock('@shared/features/generator/stores/gifGeneratorStore');
vi.mock('@shared/stores/appStore');

describe('ResultPanel', () => {
  const resetMock = vi.fn();
  const setNameMock = vi.fn();
  const setStatusMock = vi.fn();

  const mockResult = {
    dataUrl: 'data:image/gif;base64,fake',
    size: 1024 * 1500, // 1.5MB
    width: 640,
    height: 480
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGifStore).mockReturnValue({
      result: mockResult,
      name: 'test-gif',
      frameCount: 10,
      reset: resetMock,
      setName: setNameMock
    } as unknown);

    vi.mocked(useAppStore).mockImplementation((selector) => {
      if (selector.toString().includes('setStatus')) return setStatusMock;
      return null;
    });
  });

  it('should render stats correctly', () => {
    render(<ResultPanel />);
    expect(screen.getByText('10 frames')).toBeInTheDocument();
    expect(screen.getByText(/1.5 MB/)).toBeInTheDocument();
    expect(screen.getByText('640x480')).toBeInTheDocument();
  });

  it('should render name input', () => {
    render(<ResultPanel />);
    const input = screen.getByDisplayValue('test-gif');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'new-name' } });
    expect(setNameMock).toHaveBeenCalledWith('new-name');
  });

  it('should handle reset', () => {
    render(<ResultPanel />);
    const resetButton = screen.getByTestId('back-to-config-button');
    fireEvent.click(resetButton);

    expect(setStatusMock).toHaveBeenCalledWith('configuring');
    expect(resetMock).toHaveBeenCalled();
  });

  it('should handle download', () => {
    render(<ResultPanel />);
    const downloadButton = screen.getByTestId('download-gif-button');
    expect(downloadButton).toHaveAttribute('href', mockResult.dataUrl);
    expect(downloadButton).toHaveAttribute('download', 'test-gif.gif');
  });

  it('should disable download if no result', () => {
    vi.mocked(useGifStore).mockReturnValue({
      result: null,
      name: 'test-gif',
      frameCount: 0,
      reset: resetMock,
      setName: setNameMock
    } as unknown);

    render(<ResultPanel />);
    const downloadButton = screen.getByTestId('download-gif-button');
    expect(downloadButton).toHaveAttribute('aria-disabled', 'true');
  });
});
