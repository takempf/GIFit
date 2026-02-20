import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders correctly with default props', async () => {
    const handleChange = vi.fn();
    render(<Slider value={50} onValueChange={handleChange} />);
    await act(async () => {
      vi.runAllTimers();
    });

    const slider = screen.getByRole('slider', { hidden: true });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('min', '0'); // native input min
    expect(slider).toHaveAttribute('max', '100'); // native input max
  });

  test('renders with label', async () => {
    const handleChange = vi.fn();
    render(<Slider value={50} onValueChange={handleChange} label="Volume" />);
    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByText('Volume')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { hidden: true });
    expect(slider).toBeInTheDocument();
  });

  test('renders with custom min, max, step', async () => {
    const handleChange = vi.fn();
    render(
      <Slider
        value={5}
        onValueChange={handleChange}
        min={1}
        max={10}
        step={1}
      />
    );
    await act(async () => {
      vi.runAllTimers();
    });

    const slider = screen.getByRole('slider', { hidden: true });
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '10');
    expect(slider).toHaveAttribute('aria-valuenow', '5');
  });

  test('calls onValueChange when interaction occurs', async () => {
    const handleChange = vi.fn();
    render(<Slider value={50} onValueChange={handleChange} />);
    await act(async () => {
      vi.runAllTimers();
    });

    const slider = screen.getByRole('slider', { hidden: true });
    fireEvent.change(slider, { target: { value: '51' } });

    expect(handleChange).toHaveBeenCalled();
  });

  test('renders marks when enabled', async () => {
    const handleChange = vi.fn();
    // 0 to 10 step 2 -> 0, 2, 4, 6, 8, 10 (6 marks)
    render(
      <Slider
        value={0}
        onValueChange={handleChange}
        min={0}
        max={10}
        step={2}
        marks={true}
      />
    );
    await act(async () => {
      vi.runAllTimers();
    });

    const marks = screen.getAllByTestId('slider-mark');
    expect(marks).toHaveLength(6);
  });

  test('does not render marks when disabled', async () => {
    const handleChange = vi.fn();
    render(
      <Slider
        value={0}
        onValueChange={handleChange}
        min={0}
        max={10}
        step={2}
        marks={false}
      />
    );
    await act(async () => {
      vi.runAllTimers();
    });

    const marks = screen.queryAllByTestId('slider-mark');
    expect(marks).toHaveLength(0);
  });

  test('disables the slider', async () => {
    const handleChange = vi.fn();
    render(<Slider value={50} onValueChange={handleChange} disabled />);
    await act(async () => {
      vi.runAllTimers();
    });
    const slider = screen.getByRole('slider', { hidden: true });
    expect(slider).toBeDisabled();
  });
});
