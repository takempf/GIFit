import { useRef, useState } from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputNumber.module.css';

import type { InputProps } from '../Input/Input';

interface InputNumberProps extends InputProps {
  name: string;
  label: React.ReactNode;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  append?: React.ReactNode;
}

export function InputNumber({
  name,
  label,
  value,
  onChange,
  append,
  ...restProps
}: InputNumberProps) {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const dispatchChangeEvent = () => {
    // Dispatch an event manually, stepUp/stepDown does not fire the event
    const event = new Event('input', { bubbles: true, cancelable: true });
    inputRef.current?.dispatchEvent(event);
  };

  const handleStepUp = () => {
    inputRef.current?.stepUp();
    dispatchChangeEvent();
  };

  const handleStepDown = () => {
    inputRef.current?.stepDown();
    dispatchChangeEvent();
  };

  const startStepping = (stepFunction: () => void) => {
    stepFunction(); // Initial step
    const id = setInterval(stepFunction, 250);
    setIntervalId(id);
  };

  const stopStepping = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const controls = (
    <>
      <div
        className={css.buttonGrid} // Use CSS Module class
      >
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onMouseDown={() => startStepping(handleStepUp)}
          onMouseUp={stopStepping}
          onMouseLeave={stopStepping}
          onTouchStart={() => startStepping(handleStepUp)}
          onTouchEnd={stopStepping}
          onClick={handleStepUp} // For single click accessibility
          disabled={restProps.disabled}>
          ▲
        </Button>
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onMouseDown={() => startStepping(handleStepDown)}
          onMouseUp={stopStepping}
          onMouseLeave={stopStepping}
          onTouchStart={() => startStepping(handleStepDown)}
          onTouchEnd={stopStepping}
          onClick={handleStepDown} // For single click accessibility
          disabled={restProps.disabled}>
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
      ref={inputRef}
    />
  );
}
