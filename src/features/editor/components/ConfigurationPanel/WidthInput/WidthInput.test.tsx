import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WidthInput } from './WidthInput';
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
      data-testid="width-input"
    />
  )
}));

describe('WidthInput', () => {
  const mockHandleInputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        width: 1280,
        videoWidth: 1920,
        handleInputChange: mockHandleInputChange
      };
      return selector(state);
    });
  });

  it('renders with current width from store', () => {
    render(<WidthInput />);

    const input = screen.getByLabelText('Width');
    expect(input).toHaveValue('1280');
  });

  it('calls handleInputChange on change', () => {
    render(<WidthInput />);

    fireEvent.change(screen.getByLabelText('Width'), {
      target: { value: '640' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'width',
      value: 640
    });
  });

  it('clamps to videoWidth max', () => {
    render(<WidthInput />);

    fireEvent.change(screen.getByLabelText('Width'), {
      target: { value: '3000' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'width',
      value: 1920
    });
  });

  it('sets max attribute to videoWidth', () => {
    render(<WidthInput />);

    const input = screen.getByLabelText('Width');
    expect(input).toHaveAttribute('max', '1920');
  });

  it('ignores NaN input', () => {
    render(<WidthInput />);

    fireEvent.change(screen.getByLabelText('Width'), {
      target: { value: 'abc' }
    });

    expect(mockHandleInputChange).not.toHaveBeenCalled();
  });
});
