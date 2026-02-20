import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrationNotice } from './MigrationNotice';

const STORAGE_KEY = 'gifit:show_v4_migration_notice';

// --- Mocks ---

const mockGet = vi.fn<(keys: string) => Promise<Record<string, unknown>>>();
const mockRemove = vi.fn<(keys: string) => Promise<void>>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      sync: {
        get: (...args: unknown[]) => mockGet(...(args as [string])),
        remove: (...args: unknown[]) => mockRemove(...(args as [string]))
      }
    }
  }
}));

vi.mock('@gifit/shared/assets/gifit-logo.svg?react', () => ({
  default: (props: Record<string, unknown>) => (
    <svg data-testid="gifit-logo" {...props} />
  )
}));

vi.mock('@gifit/shared/assets/gifit-icon.svg?react', () => ({
  default: (props: Record<string, unknown>) => (
    <svg data-testid="gifit-icon" {...props} />
  )
}));

vi.mock('./MigrationNotice.module.css', () => ({
  default: new Proxy(
    {},
    { get: (_target, prop) => (typeof prop === 'string' ? prop : undefined) }
  )
}));

// --- Tests ---

describe('MigrationNotice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('does not render when the storage flag is absent', async () => {
    mockGet.mockResolvedValue({});

    const { container } = render(<MigrationNotice />);

    // Wait for the async storage check to settle
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(STORAGE_KEY);
    });

    expect(container.innerHTML).toBe('');
  });

  it('renders the notice when the storage flag is true', async () => {
    mockGet.mockResolvedValue({ [STORAGE_KEY]: true });

    render(<MigrationNotice />);

    expect(await screen.findByText(/has moved!/i)).toBeInTheDocument();

    expect(screen.getByText(/toolbar icon/i)).toBeInTheDocument();
  });

  it('dismisses the notice and removes the storage key', async () => {
    mockGet.mockResolvedValue({ [STORAGE_KEY]: true });
    mockRemove.mockResolvedValue(undefined);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<MigrationNotice />);

    const dismissButton = await screen.findByRole('button', {
      name: /dismiss migration notice/i
    });

    await user.click(dismissButton);

    expect(mockRemove).toHaveBeenCalledWith(STORAGE_KEY);

    // Advance past the 300ms exit animation
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText(/has moved!/i)).not.toBeInTheDocument();
    });
  });
});
