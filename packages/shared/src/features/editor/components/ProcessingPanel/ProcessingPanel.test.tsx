import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessingPanel } from './ProcessingPanel';
import { useGifStore } from '@shared/features/generator/stores/gifGeneratorStore';
import { useAppStore } from '@shared/stores/appStore';

import { useAdapters, AdapterSet } from '@shared/adapters/context';

// Mock stores
vi.mock('@shared/features/generator/stores/gifGeneratorStore');
vi.mock('@shared/stores/appStore');
vi.mock('@shared/adapters/context');

describe('ProcessingPanel', () => {
  const abortGifMock = vi.fn();
  const adapterAbortGifMock = vi.fn();
  const setStatusMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGifStore).mockReturnValue({
      progress: 0.5,
      abortGif: abortGifMock
    } as unknown);

    vi.mocked(useAppStore).mockImplementation((selector) => {
      if (selector.toString().includes('setStatus')) return setStatusMock;
      return null;
    });

    vi.mocked(useAdapters).mockReturnValue({
      gif: {
        abortGif: adapterAbortGifMock
      }
    } as unknown as AdapterSet);
  });

  it('should render progress correctly', () => {
    render(<ProcessingPanel />);
    expect(screen.getByText(/Generating GIF/)).toBeInTheDocument();
    // Assuming Progress component or Base UI renders the value "50" for 0.5 * 100
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('should cancel generation and reset status when cancel button is clicked', () => {
    render(<ProcessingPanel />);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(abortGifMock).toHaveBeenCalled();
    expect(adapterAbortGifMock).toHaveBeenCalled();
    expect(setStatusMock).toHaveBeenCalledWith('configuring');
  });
});
