import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useAppStore } from '@/stores/appStore';

// Mock Zustand store
vi.mock('@/stores/appStore');

// Mock child components and motion/react for simplicity
vi.mock('./Popup/Popup', () => ({
  Popup: () => <div data-testid="mock-popup" />
}));
vi.mock('./AppLogo/AppLogo', () => ({
  AppLogo: () => <div data-testid="mock-applogo" />
}));
vi.mock('./AppFrame/AppFrame', () => ({
  AppFrame: ({ children }) => <div data-testid="mock-appframe">{children}</div>
}));

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AnimatePresence: vi.fn(({ children }) => <>{children}</>),
    motion: {
      div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>)
      // Add other motion components if App directly uses them, though it seems not.
    }
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: vi.fn()
}));

describe('App', () => {
  const mockToggle = vi.fn();
  const mockVideoElementPause = vi.fn();
  let mockVideoElement: HTMLVideoElement | null;

  const mockUseAppStore = useAppStore as vi.Mock;

  beforeEach(() => {
    mockToggle.mockClear();
    mockVideoElementPause.mockClear();
    mockVideoElement = {
      pause: mockVideoElementPause
    } as unknown as HTMLVideoElement;

    // Default store state
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        videoElement: mockVideoElement,
        isOpen: false,
        toggle: mockToggle
      };
      return selector(state);
    });
  });

  it('renders the "GifIt" button when isOpen is false', () => {
    render(<App />);
    expect(screen.getByRole('button')).toBeInTheDocument(); // The main button
    expect(screen.getByTestId('mock-applogo')).toBeInTheDocument(); // Inside the button
    expect(screen.getByTestId('mock-appframe')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-popup')).not.toBeInTheDocument();
  });

  it('clicking the "GifIt" button calls appStore.toggle() and videoElement.pause()', async () => {
    render(<App />);
    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
    expect(mockVideoElementPause).toHaveBeenCalledTimes(1);
  });

  it('does not call videoElement.pause() if videoElement is null', async () => {
    mockVideoElement = null;
    // Update store mock to return null videoElement for this specific test
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        videoElement: null,
        isOpen: false,
        toggle: mockToggle
      };
      return selector(state);
    });

    render(<App />);
    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
    expect(mockVideoElementPause).not.toHaveBeenCalled();
  });

  it('renders the Popup component when isOpen is true', () => {
    // Set store state for this test
    mockUseAppStore.mockImplementation((selector) => {
      const state = {
        videoElement: mockVideoElement,
        isOpen: true,
        toggle: mockToggle
      };
      return selector(state);
    });

    render(<App />);
    expect(screen.getByTestId('mock-popup')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); // The main button should not be there
  });
});
