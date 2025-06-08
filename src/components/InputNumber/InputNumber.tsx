import { useRef } from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputNumber.module.css';

interface InputNumberProps {
  name: string;
  label: React.ReactNode;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  append?: React.ReactNode;
  ref: React.RefObject<HTMLInputElement>;
}

export function InputNumber({
  name,
  label,
  value,
  onChange,
  append,
  disabled, // Destructure disabled from restProps
  ...restProps
}: InputNumberProps) {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef(null);

  function handleUpClick() {
    inputRef.current?.stepUp();

    // Dispatch an event manually, stepUp does not fire the event
    const event = new Event('input', { bubbles: true, cancelable: true });
    inputRef.current?.dispatchEvent(event);
  }

  function handleDownClick() {
    inputRef.current?.stepDown();

    // Dispatch an event manually, stepDown does not fire the event
    const event = new Event('input', { bubbles: true, cancelable: true });
    inputRef.current?.dispatchEvent(event);
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
          onClick={handleUpClick}
          disabled={disabled}> {/* Pass disabled prop */}
          ▲
        </Button>
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onClick={handleDownClick}
          disabled={disabled}> {/* Pass disabled prop */}
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
      disabled={disabled} // Pass disabled to the underlying Input
      {...restProps}
      ref={inputRef}
    />
  );
}
