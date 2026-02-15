import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QualityInput } from './QualityInput';
import { useConfigurationPanelStore } from '@shared/features/editor/stores/configurationPanelStore';

vi.mock('@shared/features/editor/stores/configurationPanelStore');

const mockOnValueChange = vi.fn();

vi.mock('@shared/components/ui/Slider/Slider', () => ({
  Slider: ({
    label,
    value,
    min,
    max,
    onValueChange
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onValueChange: (val: number) => void;
  }) => {
    mockOnValueChange.mockImplementation(onValueChange);
    return (
      <div
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        data-testid="quality-input"
      />
    );
  }
}));

describe('QualityInput', () => {
  const mockHandleInputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        quality: 5,
        handleInputChange: mockHandleInputChange
      };
      return selector(state);
    });
  });

  it('renders slider with quality value from store', () => {
    render(<QualityInput />);

    const slider = screen.getByRole('slider', { name: 'Quality' });
    expect(slider).toHaveAttribute('aria-valuenow', '5');
  });

  it('calls handleInputChange with new quality on change', () => {
    render(<QualityInput />);

    mockOnValueChange(8);

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'quality',
      value: 8
    });
  });

  it('renders slider with correct min and max', () => {
    render(<QualityInput />);

    const slider = screen.getByRole('slider', { name: 'Quality' });
    expect(slider).toHaveAttribute('aria-valuemin', '1');
    expect(slider).toHaveAttribute('aria-valuemax', '10');
  });

  it('defaults to 5 when quality is null', () => {
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        quality: null,
        handleInputChange: mockHandleInputChange
      };
      return selector(state);
    });

    render(<QualityInput />);

    const slider = screen.getByRole('slider', { name: 'Quality' });
    expect(slider).toHaveAttribute('aria-valuenow', '5');
  });
});
