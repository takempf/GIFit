import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HeightInput } from './HeightInput';
import { useConfigurationPanelStore } from '@shared/features/editor/stores/configurationPanelStore';

vi.mock('@shared/features/editor/stores/configurationPanelStore');

vi.mock('@shared/components/ui/InputNumber/InputNumber', () => ({
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
      data-testid="height-input"
    />
  )
}));

describe('HeightInput', () => {
  const mockHandleInputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        height: 720,
        videoHeight: 1080,
        handleInputChange: mockHandleInputChange
      };
      return selector(state);
    });
  });

  it('renders with current height from store', () => {
    render(<HeightInput />);

    const input = screen.getByLabelText('Height');
    expect(input).toHaveValue('720');
  });

  it('calls handleInputChange on change', () => {
    render(<HeightInput />);

    fireEvent.change(screen.getByLabelText('Height'), {
      target: { value: '480' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'height',
      value: 480
    });
  });

  it('clamps to videoHeight max', () => {
    render(<HeightInput />);

    fireEvent.change(screen.getByLabelText('Height'), {
      target: { value: '2000' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'height',
      value: 1080
    });
  });

  it('sets max attribute to videoHeight', () => {
    render(<HeightInput />);

    const input = screen.getByLabelText('Height');
    expect(input).toHaveAttribute('max', '1080');
  });

  it('ignores NaN input', () => {
    render(<HeightInput />);

    fireEvent.change(screen.getByLabelText('Height'), {
      target: { value: 'abc' }
    });

    expect(mockHandleInputChange).not.toHaveBeenCalled();
  });
});
