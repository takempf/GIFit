import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FrameRateInput } from './FrameRateInput';
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
      data-testid="fps-input"
    />
  )
}));

describe('FrameRateInput', () => {
  const mockOnPreviewRequest = vi.fn();
  const mockHandleInputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        start: 0,
        duration: 1000,
        framerate: 10,
        handleInputChange: mockHandleInputChange
      };
      return selector(state);
    });
  });

  it('renders with current framerate from store', () => {
    render(
      <FrameRateInput onPreviewRequest={mockOnPreviewRequest} previewTime={0} />
    );

    const input = screen.getByLabelText('FPS');
    expect(input).toHaveValue('10');
  });

  it('calls handleInputChange on change', () => {
    render(
      <FrameRateInput onPreviewRequest={mockOnPreviewRequest} previewTime={0} />
    );

    fireEvent.change(screen.getByLabelText('FPS'), {
      target: { value: '30' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'framerate',
      value: 30
    });
  });

  it('clamps framerate to max 60', () => {
    render(
      <FrameRateInput onPreviewRequest={mockOnPreviewRequest} previewTime={0} />
    );

    fireEvent.change(screen.getByLabelText('FPS'), {
      target: { value: '100' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'framerate',
      value: 60
    });
  });

  it('clamps framerate to min 1', () => {
    render(
      <FrameRateInput onPreviewRequest={mockOnPreviewRequest} previewTime={0} />
    );

    fireEvent.change(screen.getByLabelText('FPS'), {
      target: { value: '0' }
    });

    expect(mockHandleInputChange).toHaveBeenCalledWith({
      name: 'framerate',
      value: 1
    });
  });

  it('ignores NaN input', () => {
    render(
      <FrameRateInput onPreviewRequest={mockOnPreviewRequest} previewTime={0} />
    );

    fireEvent.change(screen.getByLabelText('FPS'), {
      target: { value: 'abc' }
    });

    expect(mockHandleInputChange).not.toHaveBeenCalled();
  });

  it('updates preview to new last frame when at last frame of old framerate', () => {
    (
      useConfigurationPanelStore as unknown as import('vitest').Mock
    ).mockImplementation((selector) => {
      const state = {
        start: 0,
        duration: 1000,
        framerate: 10,
        handleInputChange: mockHandleInputChange
      };
      return selector(state);
    });

    render(
      <FrameRateInput
        onPreviewRequest={mockOnPreviewRequest}
        previewTime={900}
      />
    );

    fireEvent.change(screen.getByLabelText('FPS'), {
      target: { value: '20' }
    });

    expect(mockOnPreviewRequest).toHaveBeenCalledWith(950);
  });
});
