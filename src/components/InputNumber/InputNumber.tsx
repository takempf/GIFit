import { useRef } from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputNumber.module.css';

const SPIN_INTERVAL = 150;

import type { InputProps } from '../Input/Input';

interface InputNumberProps extends InputProps {
  name: string;
  label: React.ReactNode;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  append?: React.ReactNode;
}

// --- Helper: Rounding ---
const getStepDecimalPlaces = (step: number): number => {
  const stepStr = String(step);
  const decimalPointIndex = stepStr.indexOf('.');
  return decimalPointIndex === -1 ? 0 : stepStr.length - decimalPointIndex - 1;
};

const roundToStep = (
  value: number,
  step: number,
  decimalPlaces: number
): number => {
  if (step <= 0) return parseFloat(value.toFixed(decimalPlaces));
  const inverseStep = 1 / step;
  const rounded = Math.round(value * inverseStep) / inverseStep;
  return parseFloat(
    rounded.toFixed(Math.max(decimalPlaces, getStepDecimalPlaces(step)))
  );
};

export function InputNumber({
  name,
  label,
  value,
  onChange,
  append,
  ...restProps
}: InputNumberProps) {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep track of the latest value to avoid stale closures in setTimeout
  const valueRef = useRef(value);
  valueRef.current = value;

  // Determine actual step (default to 1 if not provided or 'any')
  const stepVal =
    restProps.step && restProps.step !== 'any'
      ? parseFloat(String(restProps.step))
      : 1;
  const decimalPlaces = getStepDecimalPlaces(stepVal);
  const minVal =
    restProps.min !== undefined ? Number(restProps.min) : -Infinity;
  const maxVal = restProps.max !== undefined ? Number(restProps.max) : Infinity;

  function performStep(direction: 'up' | 'down') {
    const currentVal = parseFloat(valueRef.current) || 0;
    let newValue = currentVal + (direction === 'up' ? stepVal : -stepVal);
    newValue = roundToStep(newValue, stepVal, decimalPlaces);
    newValue = Math.max(minVal, Math.min(maxVal, newValue));

    // Trigger change
    if (inputRef.current) {
      // We need to trigger the React onChange handler passed as prop.
      // We can create a synthetic event-like object or try to trigger native event.
      // Creating a full synthetic event is hard.
      // Easiest is to call onChange directly if we trust it doesn't need strictly native event properties (like bubbles).
      // Standard React pattern:

      // 1. Update native value (for UI consistency if controlled component is slow)
      // inputRef.current.value = String(newValue);

      // 2. Call parent handler
      // Create a mock event.
      const mockEvent = {
        target: {
          value: String(newValue),
          name: name,
          type: 'number'
        },
        currentTarget: inputRef.current
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      onChange(mockEvent);
    }

    return newValue;
  }

  function handleSpin(direction: 'up' | 'down') {
    performStep(direction);
    spinTimeoutRef.current = setTimeout(
      () => handleSpin(direction),
      SPIN_INTERVAL
    );
  }

  function handleDownPressStart() {
    handleSpin('down');
  }

  function handleDownPressEnd() {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  }

  function handleUpPressStart() {
    handleSpin('up');
  }

  function handleUpPressEnd() {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      performStep('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      performStep('down');
    }

    if (restProps.onKeyDown) {
      restProps.onKeyDown(e);
    }
  }

  const controls = (
    <>
      <div
        className={css.buttonGrid} // Use CSS Module class
      >
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onPointerDown={handleUpPressStart}
          onPointerUp={handleUpPressEnd}
          onPointerLeave={handleUpPressEnd} // Stop spinning if mouse leaves button while pressed
          disabled={restProps.disabled}
          aria-label="Increment">
          ▲
        </Button>
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onPointerDown={handleDownPressStart}
          onPointerUp={handleDownPressEnd}
          onPointerLeave={handleDownPressEnd} // Stop spinning if mouse leaves button while pressed
          disabled={restProps.disabled}
          aria-label="Decrement">
          ▼
        </Button>
      </div>
      {append}
    </>
  );

  return (
    <Input
      name={name}
      label={label}
      append={controls}
      value={value}
      onChange={onChange}
      type="number"
      {...restProps}
      onKeyDown={handleKeyDown}
      ref={inputRef}
    />
  );
}
