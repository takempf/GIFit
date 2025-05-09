import { useRef } from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputNumber.module.css';

interface InputNumberProps {
  name: string;
  label: React.ReactNode;
  value: string;
  onInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  ref: React.RefObject<HTMLInputElement>;
}

export function InputNumber({
  name,
  label,
  value,
  onInput,
  ...restProps
}: InputNumberProps) {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef(null);

  function handleUpClick() {
    // onInput({ target: { name, type: 'number', value: value + stepNumber } });
    inputRef.current?.stepUp();
    const event = new Event('input', { bubbles: true, cancelable: true });
    inputRef.current?.dispatchEvent(event);
  }

  function handleDownClick() {
    // onInput({ target: { name, type: 'number', value: value - stepNumber } });
    inputRef.current?.stepDown();
    const event = new Event('input', { bubbles: true, cancelable: true });
    inputRef.current?.dispatchEvent(event);
  }

  const controls = (
    <>
      <div
        className={css.buttonGrid} // Use CSS Module class
      >
        <Button size="small" variant="ghost" onClick={handleUpClick}>
          ▲
        </Button>
        <Button size="small" variant="ghost" onClick={handleDownClick}>
          ▼
        </Button>
      </div>
    </>
  );

  return (
    <Input
      name={name}
      label={label}
      append={controls}
      value={value}
      onInput={onInput}
      {...restProps}
      ref={inputRef}
    />
  );
}
