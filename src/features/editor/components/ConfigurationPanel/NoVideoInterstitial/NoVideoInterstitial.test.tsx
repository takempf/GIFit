import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NoVideoInterstitial } from './NoVideoInterstitial';

describe('NoVideoInterstitial', () => {
  it('should render correctly', () => {
    const handleRetry = vi.fn();
    render(<NoVideoInterstitial onRetry={handleRetry} />);

    expect(screen.getByText('No Video Detected')).toBeInTheDocument();
    expect(screen.getByText(/GIFit couldn't find a video/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Retry Video Detection/i })
    ).toBeInTheDocument();
  });

  it('should call onRetry when the retry button is clicked', () => {
    const handleRetry = vi.fn();
    render(<NoVideoInterstitial onRetry={handleRetry} />);

    fireEvent.click(
      screen.getByRole('button', { name: /Retry Video Detection/i })
    );
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
