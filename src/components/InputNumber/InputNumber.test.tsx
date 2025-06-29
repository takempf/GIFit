import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi, describe, it } from 'vitest';
import { InputNumber } from './InputNumber';

describe('InputNumber', () => {
  const getInputElement = () =>
    screen.getByLabelText('Test Input') as HTMLInputElement;

  // Reset mocks for onChange in defaultProps-like scenarios if needed, though not strictly necessary here
  // as each test defines its own onChange or doesn't rely on its state across tests.

  it('renders with default props', () => {
    render(
      <InputNumber
        name="test-input"
        label="Test Input"
        value="0"
        onChange={() => {}}
      />
    );
    expect(getInputElement()).toBeDefined();
    expect(screen.getByText('▲')).toBeDefined();
    expect(screen.getByText('▼')).toBeDefined();
  });

  it('calls onChange when typing and updates input value', async () => {
    const handleChange = vi.fn();
    let currentValue = '0';
    const handleChangeFn = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e); // Call the mock for counting
      currentValue = e.target.value; // Update test-scoped variable
      // Re-render the component with the new value
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={currentValue}
          onChange={handleChangeFn}
        />
      );
    };

    const { rerender } = render(
      <InputNumber
        name="test-input"
        label="Test Input"
        value={currentValue}
        onChange={handleChangeFn}
      />
    );

    const inputElement = getInputElement();

    // Test clear
    await userEvent.clear(inputElement);
    // handleChangeFn (and thus rerender) should have been called by clear if value changed
    expect(handleChange).toHaveBeenCalled();
    expect(inputElement.value).toBe(''); // Value after clear

    // Test type
    await userEvent.type(inputElement, '123');
    expect(handleChange).toHaveBeenCalledTimes(1 + 3); // 1 for clear, 3 for "123"
    expect(inputElement.value).toBe('123'); // Assert final value
  });

  it('calls onChange when clicking step up/down buttons', async () => {
    const handleChange = vi.fn();
    render(
      <InputNumber
        name="test-input"
        label="Test Input"
        value="0"
        onChange={handleChange}
        type="number" // Ensure type is number for stepUp/stepDown
      />
    );

    const upButton = screen.getByText('▲');
    const downButton = screen.getByText('▼');

    await userEvent.click(upButton);
    expect(handleChange).toHaveBeenCalledTimes(1);

    await userEvent.click(downButton);
    expect(handleChange).toHaveBeenCalledTimes(2);
  });

  it('updates input value when clicking step up/down buttons', async () => {
    let value = '5';
    const handleChange = vi.fn((e: React.ChangeEvent<HTMLInputElement>) => {
      value = e.target.value; // Simulate parent component updating state
    });

    const { rerender } = render(
      <InputNumber
        name="test-input"
        label="Test Input"
        value={value}
        onChange={handleChange}
        type="number"
      />
    );

    const inputElement = getInputElement();
    const upButton = screen.getByText('▲');
    const downButton = screen.getByText('▼');

    expect(inputElement.value).toBe('5');

    await userEvent.click(upButton);
    // Rerender with the new value that would have been set by the parent via onChange
    rerender(
      <InputNumber
        name="test-input"
        label="Test Input"
        value={value}
        onChange={handleChange}
        type="number"
      />
    );
    expect(inputElement.value).toBe('6');

    await userEvent.click(downButton);
    rerender(
      <InputNumber
        name="test-input"
        label="Test Input"
        value={value}
        onChange={handleChange}
        type="number"
      />
    );
    expect(inputElement.value).toBe('5');
  });

  it('renders with append element', () => {
    render(
      <InputNumber
        name="test-input"
        label="Test Input"
        value="0"
        onChange={() => {}}
        append={<span>Appended</span>}
      />
    );
    expect(screen.getByText('Appended')).toBeDefined();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <InputNumber
        name="test-input"
        label="Test Input"
        value="0"
        onChange={() => {}}
        disabled
      />
    );
    const inputElement = getInputElement();
    expect(inputElement.disabled).toBe(true);
    // Check buttons are disabled (InputNumber should pass disabled to underlying Button)
    // Assuming Button component correctly handles its disabled state based on prop.
    // If Button itself doesn't become disabled, this would need more specific checks or component changes.
    expect(screen.getByText('▲').closest('button')?.disabled).toBe(true);
    expect(screen.getByText('▼').closest('button')?.disabled).toBe(true);
  });

  describe('long press functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('increments value repeatedly when holding up button', async () => {
      let value = '0';
      const handleChange = vi.fn((e: React.ChangeEvent<HTMLInputElement>) => {
        value = e.target.value;
      });
      const { rerender } = render(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      const upButton = screen.getByText('▲');
      const inputElement = getInputElement();

      // Simulate mouse down
      await userEvent.pointer({ keys: '[MouseLeft>]', target: upButton });
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('1'); // Initial step

      vi.advanceTimersByTime(250);
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('2');

      vi.advanceTimersByTime(500);
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('4'); // Two more steps

      // Simulate mouse up
      await userEvent.pointer({ keys: '[/MouseLeft]', target: upButton });
      vi.advanceTimersByTime(250); // Should not trigger further increments
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('4');
    });

    it('decrements value repeatedly when holding down button', async () => {
      let value = '10';
      const handleChange = vi.fn((e: React.ChangeEvent<HTMLInputElement>) => {
        value = e.target.value;
      });
      const { rerender } = render(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      const downButton = screen.getByText('▼');
      const inputElement = getInputElement();

      // Simulate mouse down
      await userEvent.pointer({ keys: '[MouseLeft>]', target: downButton });
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('9'); // Initial step

      vi.advanceTimersByTime(250);
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('8');

      vi.advanceTimersByTime(500);
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('6'); // Two more steps

      // Simulate mouse up
      await userEvent.pointer({ keys: '[/MouseLeft]', target: downButton });
      vi.advanceTimersByTime(250); // Should not trigger further decrements
      rerender(
        <InputNumber
          name="test-input"
          label="Test Input"
          value={value}
          onChange={handleChange}
          type="number"
        />
      );
      expect(inputElement.value).toBe('6');
    });
  });
});
