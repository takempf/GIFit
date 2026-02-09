import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DurationInput } from './DurationInput';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';

vi.mock('@/features/editor/stores/configurationPanelStore');

vi.mock('@/components/ui/InputNumber/InputNumber', () => ({
  InputNumber: ({
    label,
    value,
    min,
    max,
    onChange
  }: {
    label: string;
    value: string;
    min: number;
    max: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <input
      aria-label={label}
      value={value}
      min={min}
      max={max}
      onChange={onChange}
      data-testid="duration-input"
    />
  )
}));

describe('DurationInput', () => {
  const mockOnPreviewRequest = vi.fn();
  const mockHandleInputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        start: 1000,
        duration: 2000,
        framerate: 10,
        handleInputChange: mockHandleInputChange
      };
      return selector(state);
    });
  });

  it('renders with current duration value from store', () => {
    render(
      <DurationInput
        onPreviewRequest={mockOnPreviewRequest}
        maxDuration={5000}
      />
    );

    const input = screen.getByLabelText('Duration');
    expect(input).toHaveValue('2');
  });

  it('calls handleInputChange with milliseconds on change', () => {
    render(
      <DurationInput
        onPreviewRequest={mockOnPreviewRequest}
        maxDuration={5000}
      />
    );

    fireEvent.change(screen.getByLabelText('Duration'), {
      target: { value: '3.5' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'duration',
      value: 3500
    });
  });

  it('clamps to maxDuration', () => {
    render(
      <DurationInput
        onPreviewRequest={mockOnPreviewRequest}
        maxDuration={2000}
      />
    );

    fireEvent.change(screen.getByLabelText('Duration'), {
      target: { value: '5' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'duration',
      value: 2000
    });
  });

  it('triggers onPreviewRequest with last frame time', () => {
    render(
      <DurationInput
        onPreviewRequest={mockOnPreviewRequest}
        maxDuration={5000}
      />
    );

    fireEvent.change(screen.getByLabelText('Duration'), {
      target: { value: '1' }
    });

    expect(mockOnPreviewRequest).toHaveBeenCalled();
  });

  it('ignores NaN input', () => {
    render(
      <DurationInput
        onPreviewRequest={mockOnPreviewRequest}
        maxDuration={5000}
      />
    );

    fireEvent.change(screen.getByLabelText('Duration'), {
      target: { value: 'abc' }
    });

    expect(mockHandleInputChange).not.toHaveBeenCalled();
  });
});
