import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
import { InputTime } from './InputTime';

describe('InputTime', { timeout: 10000 }, () => {
  let user: ReturnType<typeof userEvent.setup>;
  const getInput = () => screen.getByLabelText('Time') as HTMLInputElement;
  const getIncrementButton = () =>
    screen.getByLabelText('Increment time') as HTMLButtonElement;
  const getDecrementButton = () =>
    screen.getByLabelText('Decrement time') as HTMLButtonElement;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultProps = {
    name: 'time-input',
    label: 'Time',
    value: 0,
    onChange: vi.fn()
  };

  beforeEach(() => {
    defaultProps.onChange.mockClear();
  });

  it('renders with default props and formats initial value (0s)', () => {
    render(<InputTime {...defaultProps} />);
    expect(getInput()).toBeDefined();
    expect(getInput().value).toBe('0:00.0'); // Default step 0.1
    expect(getIncrementButton()).toBeDefined();
    expect(getDecrementButton()).toBeDefined();
  });

  it('renders with initial value and correct formatting (e.g. 90.5s)', () => {
    render(<InputTime {...defaultProps} value={90.5} />); // 1m 30.5s
    expect(getInput().value).toBe('1:30.5');
  });

  it('renders with initial value and correct formatting for hours (e.g. 3661.2s)', () => {
    render(<InputTime {...defaultProps} value={3661.2} step={0.1} />); // 1h 1m 1.2s
    expect(getInput().value).toBe('1:01:01.2');
  });

  it('updates display value on user input and calls onChange after debounce', async () => {
    const handleChange = vi.fn();
    const debounceMs = 500;
    render(
      <InputTime
        {...defaultProps}
        onChange={handleChange}
        debounceMs={debounceMs}
      />
    );
    const input = getInput();

    await user.clear(input);
    await user.type(input, '1:23.4');
    expect(input.value).toBe('1:23.4');

    // Wait for the debounce period for onChange to be called
    await vi.waitFor(
      () => {
        expect(handleChange).toHaveBeenCalledWith(83.4);
      },
      { timeout: debounceMs + 200 }
    ); // Wait a bit longer than debounce
  });

  it('handles invalid user input and reverts on blur', async () => {
    const handleChange = vi.fn();
    render(<InputTime {...defaultProps} value={10} onChange={handleChange} />);
    const input = getInput();
    expect(input.value).toBe('0:10.0');

    await user.clear(input);
    await user.type(input, 'invalid-time');
    expect(input.value).toBe('invalid-time');

    await user.tab();
    expect(input.value).toBe('0:10.0');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('calls onChange with new value when step buttons are clicked', async () => {
    const handleChange = vi.fn();
    let value = 5;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        step={1}
        onChange={(_newVal) => {
          handleChange(_newVal);
          value = _newVal;
        }}
      />
    );

    await user.click(getIncrementButton());
    expect(handleChange).toHaveBeenCalledWith(6);
    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        step={1}
        onChange={(_newVal) => {
          handleChange(_newVal);
          value = _newVal;
        }}
      />
    );

    await user.click(getDecrementButton());
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it('respects min and max props on step button clicks', async () => {
    const handleChange = vi.fn();
    let value = 0.5;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        step={0.1}
        min={0.5}
        max={0.7}
        onChange={(_newVal) => {
          handleChange(_newVal);
          value = _newVal;
        }}
      />
    );

    expect(getDecrementButton().disabled).toBe(true);

    await user.click(getIncrementButton());
    expect(handleChange).toHaveBeenCalledWith(0.6);
    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        step={0.1}
        min={0.5}
        max={0.7}
        onChange={(_newVal) => {
          handleChange(_newVal);
          value = _newVal;
        }}
      />
    );

    await user.click(getIncrementButton());
    expect(handleChange).toHaveBeenCalledWith(0.7);
    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        step={0.1}
        min={0.5}
        max={0.7}
        onChange={(_newVal) => {
          handleChange(_newVal);
          value = _newVal;
        }}
      />
    );
    expect(getIncrementButton().disabled).toBe(true);
  });

  it('respects min and max props on direct input', async () => {
    const handleChange = vi.fn();
    let value = 5;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        step={1}
        min={0}
        max={10}
        onChange={(_newVal) => {
          handleChange(_newVal);
          value = _newVal;
        }}
      />
    );
    const input = getInput();

    await user.clear(input);
    await user.type(input, '15');
    await user.tab();
    expect(handleChange).toHaveBeenCalledWith(10);
    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        step={1}
        min={0}
        max={10}
        onChange={(_newVal) => {
          handleChange(_newVal);
          value = _newVal;
        }}
      />
    );

    await user.clear(input);
    await user.type(input, '-5');
    await user.tab();
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it('handles keyboard arrow up/down for stepping', async () => {
    const handleChange = vi.fn();
    let value = 5;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        step={1}
        onChange={(newVal) => {
          handleChange(newVal);
          value = newVal;
        }}
      />
    );
    const input = getInput();

    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(handleChange).toHaveBeenCalledWith(6);
    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        step={1}
        onChange={(newVal) => {
          handleChange(newVal);
          value = newVal;
        }}
      />
    );

    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it('commits change on Enter key press', async () => {
    const handleChange = vi.fn();
    const debounceMs = 50;
    render(
      <InputTime
        {...defaultProps}
        onChange={handleChange}
        debounceMs={debounceMs}
      />
    );
    const input = getInput();

    await user.clear(input);
    await user.type(input, '3:00');
    await user.keyboard('{Enter}');

    // Enter calls blur which calls commitChange directly.
    // If commitChange itself has async aspects or if state updates are not immediate, waitFor might be needed.
    await vi.waitFor(
      () => {
        expect(handleChange).toHaveBeenCalledWith(180);
      },
      { timeout: debounceMs + 200 }
    ); // Allow time for any debounce to be cancelled and commit to occur
  });

  it('is disabled when disabled prop is true', () => {
    render(<InputTime {...defaultProps} disabled />);
    expect(getInput().disabled).toBe(true);
    expect(getIncrementButton().disabled).toBe(true);
    expect(getDecrementButton().disabled).toBe(true);
  });

  it('formats value based on step (e.g. step 1 -> no decimals)', () => {
    render(<InputTime {...defaultProps} value={10.5} step={1} />);
    expect(getInput().value).toBe('0:11');
  });

  it('formats value with specified decimal places from step (e.g. step 0.01)', () => {
    render(<InputTime {...defaultProps} value={5.123} step={0.01} />);
    expect(getInput().value).toBe('0:05.12');
  });

  it('re-formats prop value change if not editing', () => {
    const { rerender } = render(<InputTime {...defaultProps} value={10} />);
    expect(getInput().value).toBe('0:10.0');

    rerender(<InputTime {...defaultProps} value={20.5} />);
    expect(getInput().value).toBe('0:20.5');
  });

  it('does not re-format prop value change if editing', async () => {
    const handleChange = vi.fn(); // Add a handler to see if it's called
    const debounceMs = 50;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={10}
        onChange={handleChange}
        debounceMs={debounceMs}
      />
    );
    const input = getInput();

    await user.click(input); // Focus
    await user.clear(input);
    await user.type(input, '1:0'); // User is typing "1 minute" (60s)

    // Simulate prop update while user is typing
    rerender(
      <InputTime
        {...defaultProps}
        value={30}
        onChange={handleChange}
        debounceMs={debounceMs}
      />
    );
    expect(input.value).toBe('1:0'); // User's input should be preserved

    // Wait for any potential debounced call triggered by '1:0'
    // If it was called, it would be with 60.
    // We are primarily checking that the display value didn't change due to prop update.
    // The onChange for "1:0" might or might not fire depending on how quickly the prop changed.
    // Let's ensure it's stable and onChange wasn't called with 30 (the new prop value)
    await vi.waitFor(
      async () => {
        /* allow potential state updates */
      },
      { timeout: debounceMs + 200 }
    );
    expect(handleChange).not.toHaveBeenCalledWith(30);
    // It might have been called with 60 if the debounce for '1:0' completed.
    // If it was, that's fine. The main point is '1:0' display and no overwrite from '30'.
  });

  it('handles input of just seconds like "3.5"', async () => {
    const handleChange = vi.fn();
    let value = 0; // Simulating parent state for value prop
    const debounceMs = 50;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value} // Start with initial value
        onChange={(newVal) => {
          handleChange(newVal);
          value = newVal; // Update "parent state"
        }}
        debounceMs={debounceMs}
      />
    );
    const input = getInput();

    await user.clear(input);
    await user.type(input, '3.5');

    await vi.waitFor(
      () => {
        expect(handleChange).toHaveBeenCalledWith(3.5);
      },
      { timeout: debounceMs + 200 }
    );

    // Rerender with the new value to check formatting
    rerender(
      <InputTime
        {...defaultProps}
        value={value} // Use updated "parent state" value
        onChange={(_newVal) => {
          /* ... */
        }}
        debounceMs={debounceMs}
      />
    );
    expect(input.value).toBe('0:03.5');
  });

  it('handles input of "MM:SS" like "2:30"', async () => {
    const handleChange = vi.fn();
    let value = 0;
    const debounceMs = 50;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(newVal) => {
          handleChange(newVal);
          value = newVal;
        }}
        debounceMs={debounceMs}
      />
    );
    const input = getInput();

    await user.clear(input);
    await user.type(input, '2:30');
    await vi.waitFor(
      () => {
        expect(handleChange).toHaveBeenCalledWith(150);
      },
      { timeout: debounceMs + 200 }
    );

    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(_newVal) => {
          /* ... */
        }}
        debounceMs={debounceMs}
      />
    );
    expect(input.value).toBe('2:30.0');
  });

  it('handles input of "HH:MM:SS" like "1:05:10"', async () => {
    const handleChange = vi.fn();
    let value = 0;
    const debounceMs = 50;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(newVal) => {
          handleChange(newVal);
          value = newVal;
        }}
        debounceMs={debounceMs}
      />
    );
    const input = getInput();

    await user.clear(input);
    await user.type(input, '1:05:10');
    await vi.waitFor(
      () => {
        expect(handleChange).toHaveBeenCalledWith(3910);
      },
      { timeout: debounceMs + 200 }
    );

    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(_newVal) => {
          /* ... */
        }}
        debounceMs={debounceMs}
      />
    );
    expect(input.value).toBe('1:05:10.0');
  });

  it('correctly parses and formats time around 60 seconds, like "0:59.9" stepping up', async () => {
    const handleChange = vi.fn();
    let value = 59.9;
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(v) => {
          value = v;
          handleChange(v);
        }}
        step={0.1}
      />
    );
    expect(getInput().value).toBe('0:59.9');

    await user.click(getIncrementButton());
    expect(handleChange).toHaveBeenCalledWith(60.0);
    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(v) => {
          value = v;
          handleChange(v);
        }}
        step={0.1}
      />
    );
    expect(getInput().value).toBe('1:00.0');
  });

  it('correctly parses and formats time around 60 minutes, like "59:59.0" stepping up with step 1s', async () => {
    const handleChange = vi.fn();
    let value = 3599; // 59m 59s
    const { rerender } = render(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(v) => {
          value = v;
          handleChange(v);
        }}
        step={1}
      />
    );
    expect(getInput().value).toBe('59:59');

    await user.click(getIncrementButton());
    expect(handleChange).toHaveBeenCalledWith(3600);
    rerender(
      <InputTime
        {...defaultProps}
        value={value}
        onChange={(v) => {
          value = v;
          handleChange(v);
        }}
        step={1}
      />
    );
    expect(getInput().value).toBe('1:00:00');
  });

  describe('InputTime Stepper Hold Functionality', { timeout: 20000 }, () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('increment button hold calls onChange multiple times and updates value', async () => {
      const handleChange = vi.fn();
      let currentValue = 0;
      const step = 0.1;
      const SPIN_INTERVAL = 150; // Should match component's SPIN_INTERVAL

      const { rerender } = render(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );

      const incrementButton = getIncrementButton();

      // Simulate pointer down
      // await user.pointer({ keys: '[MouseLeft>]', target: incrementButton });
      fireEvent.pointerDown(incrementButton);
      await act(async () => {}); // Flush updates

      // First immediate call
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(currentValue).toBeCloseTo(0.1);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getInput().value).toBe('0:00.1');

      // Advance time for the first interval
      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL);
      // expect(handleChange).toHaveBeenCalledTimes(2);
      expect(handleChange).toHaveBeenNthCalledWith(2, 0.2);
      expect(currentValue).toBeCloseTo(0.2); // This will still fail if called with 0.1
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getInput().value).toBe('0:00.2');

      // Advance time for the second interval
      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL);
      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(currentValue).toBeCloseTo(0.3);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getInput().value).toBe('0:00.3');

      // Simulate pointer up
      // await user.pointer({ keys: '[/MouseLeft]', target: incrementButton });
      fireEvent.pointerUp(incrementButton);
      await act(async () => {}); // Flush updates

      // Advance time a bit more to ensure no more calls
      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL * 2);
      expect(handleChange).toHaveBeenCalledTimes(3); // Should not have changed
    });

    it('decrement button hold calls onChange multiple times and updates value', async () => {
      const handleChange = vi.fn();
      let currentValue = 0.3;
      const step = 0.1;
      const SPIN_INTERVAL = 150;

      const { rerender } = render(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getInput().value).toBe('0:00.3');
      const decrementButton = getDecrementButton();

      // await user.pointer({ keys: '[MouseLeft>]', target: decrementButton });
      fireEvent.pointerDown(decrementButton);
      await act(async () => {});

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(currentValue).toBeCloseTo(0.2);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getInput().value).toBe('0:00.2');

      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL);
      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(currentValue).toBeCloseTo(0.1);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getInput().value).toBe('0:00.1');

      // await user.pointer({ keys: '[/MouseLeft]', target: decrementButton });
      fireEvent.pointerUp(decrementButton);
      await act(async () => {});
      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL * 2);
      expect(handleChange).toHaveBeenCalledTimes(2);
    });

    it('increment button hold stops at max value', async () => {
      const handleChange = vi.fn();
      let currentValue = 0.8;
      const step = 0.1;
      const max = 1.0;
      const SPIN_INTERVAL = 150;

      const { rerender } = render(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          max={max}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );

      const incrementButton = getIncrementButton();
      // await user.pointer({ keys: '[MouseLeft>]', target: incrementButton }); // 0.8 -> 0.9 (call 1)
      fireEvent.pointerDown(incrementButton);
      await act(async () => {});
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(currentValue).toBeCloseTo(0.9);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          max={max}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );

      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL); // 0.9 -> 1.0 (call 2)
      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(currentValue).toBeCloseTo(1.0);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          max={max}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getIncrementButton().disabled).toBe(true);

      // Try to advance time again, should not call handleChange or change value
      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL);
      expect(handleChange).toHaveBeenCalledTimes(2); // Still 2
      expect(currentValue).toBeCloseTo(1.0);

      // await user.pointer({ keys: '[/MouseLeft]', target: incrementButton });
      fireEvent.pointerUp(incrementButton);
      await act(async () => {});
    });

    it('decrement button hold stops at min value', async () => {
      const handleChange = vi.fn();
      let currentValue = 0.2;
      const step = 0.1;
      const min = 0.0;
      const SPIN_INTERVAL = 150;

      const { rerender } = render(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          min={min}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );

      const decrementButton = getDecrementButton();
      // await user.pointer({ keys: '[MouseLeft>]', target: decrementButton }); // 0.2 -> 0.1 (call 1)
      fireEvent.pointerDown(decrementButton);
      await act(async () => {});
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(currentValue).toBeCloseTo(0.1);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          min={min}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );

      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL); // 0.1 -> 0.0 (call 2)
      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(currentValue).toBeCloseTo(0.0);
      rerender(
        <InputTime
          {...defaultProps}
          value={currentValue}
          step={step}
          min={min}
          onChange={(newValue) => {
            handleChange(newValue);
            currentValue = newValue;
          }}
        />
      );
      expect(getDecrementButton().disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(SPIN_INTERVAL);
      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(currentValue).toBeCloseTo(0.0);

      // await user.pointer({ keys: '[/MouseLeft]', target: decrementButton });
      fireEvent.pointerUp(decrementButton);
      await act(async () => {});
    });
  });
});
