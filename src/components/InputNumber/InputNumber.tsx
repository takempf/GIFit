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

export function InputNumber({
  name,
  label,
  value,
  onChange,
  append,
  ...restProps
}: InputNumberProps) {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef(null);
  const downTimeoutRef: React.RefObject<NodeJS.Timeout | null> = useRef(null);
  const upTimeoutRef: React.RefObject<NodeJS.Timeout | null> = useRef(null);

  function stepUp() {
    inputRef.current?.stepUp();

    // Dispatch an event manually, stepUp does not fire the event
    const event = new Event('input', { bubbles: true, cancelable: true });
    inputRef.current?.dispatchEvent(event);

    upTimeoutRef.current = setTimeout(stepUp, SPIN_INTERVAL);
  }

  function stepDown() {
    inputRef.current?.stepDown();

    // Dispatch an event manually, stepDown does not fire the event
    const event = new Event('input', { bubbles: true, cancelable: true });
    inputRef.current?.dispatchEvent(event);

    downTimeoutRef.current = setTimeout(stepDown, SPIN_INTERVAL);
  }

  function handleDownPressStart() {
    stepDown();
  }

  function handleDownPressEnd() {
    if (downTimeoutRef.current) {
      clearTimeout(downTimeoutRef.current);
    }
  }

  function handleUpPressStart() {
    stepUp();
  }

  function handleUpPressEnd() {
    if (upTimeoutRef.current) {
      clearTimeout(upTimeoutRef.current);
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
          disabled={restProps.disabled}>
          ▲
        </Button>
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onPointerDown={handleDownPressStart}
          onPointerUp={handleDownPressEnd}
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
