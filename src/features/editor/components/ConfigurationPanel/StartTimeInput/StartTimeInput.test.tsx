import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { StartTimeInput } from './StartTimeInput';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';

// Mock the store
vi.mock('@/features/editor/stores/configurationPanelStore');

// Mock InputTime but capture onStep to trigger it
vi.mock('@/components/ui/InputTime/InputTime', () => ({
  InputTime: ({
    onStep,
    value,
    onChange,
    label
  }: {
    onStep: (val: number, dir: 'up' | 'down', multiplier: number) => number;
    value: number;
    onChange: (val: number) => void;
    label: string;
  }) => (
    <div>
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid="mock-input-time"
      />
      <button
        aria-label="Step Up"
        onClick={() => {
          // Simulate stepping up with default multiplier
          const newVal = onStep(value, 'up', 1);
          onChange(newVal);
        }}>
        Step Up
      </button>
      <button
        aria-label="Step Up Shift"
        onClick={() => {
          // Simulate stepping up with shift multiplier
          const newVal = onStep(value, 'up', 5);
          onChange(newVal);
        }}>
        Step Up Shift
      </button>
    </div>
  )
}));

describe('StartTimeInput Stepping Logic', () => {
  const mockOnPreviewRequest = vi.fn();
  const mockStoreHandleInputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      useConfigurationPanelStore as unknown as {
        getState: import('vitest').Mock;
      }
    ).getState = vi.fn();

    // Mock the selector hook
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      if (!selector) return {};
      // Mock state values
      const state = {
        start: 0,
        framerate: 10, // 10 FPS => 100ms per frame
        handleInputChange: mockStoreHandleInputChange
      };
      return selector(state);
    });
  });

  it('steps up by 1 frame duration (100ms at 10fps)', () => {
    // Initial start is 0
    render(
      <StartTimeInput onPreviewRequest={mockOnPreviewRequest} maxStart={5000} />
    );

    fireEvent.click(screen.getByLabelText('Step Up'));

    // Should call handleInputChange with 100
    expect(mockStoreHandleInputChange).toHaveBeenCalledWith({
      name: 'start',
      value: 100
    });
    // And preview request
    expect(mockOnPreviewRequest).toHaveBeenCalledWith(100);
  });

  it('steps up by 5 frames (500ms at 10fps) when shift multiplier used', () => {
    render(
      <StartTimeInput onPreviewRequest={mockOnPreviewRequest} maxStart={5000} />
    );

    fireEvent.click(screen.getByLabelText('Step Up Shift'));

    expect(mockStoreHandleInputChange).toHaveBeenCalledWith({
      name: 'start',
      value: 500
    });
  });

  it('clamps value to maxStart', () => {
    // Mock start near max
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        start: 4950,
        framerate: 10,
        handleInputChange: mockStoreHandleInputChange
      };
      return selector(state);
    });

    render(
      <StartTimeInput onPreviewRequest={mockOnPreviewRequest} maxStart={5000} />
    );

    fireEvent.click(screen.getByLabelText('Step Up'));

    // 4950 + 100 = 5050 -> Clamped to 5000
    expect(mockStoreHandleInputChange).toHaveBeenCalledWith({
      name: 'start',
      value: 5000
    });
  });
});
