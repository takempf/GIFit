import { useRef } from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputNumber.module.css';

export function InputNumber({ name, label, value, onChange, ...restProps }) {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef(null);

  function handleUpClick() {
    // onChange({ target: { name, type: 'number', value: value + stepNumber } });
    inputRef.current?.stepUp();
  }

  function handleDownClick() {
    // onChange({ target: { name, type: 'number', value: value - stepNumber } });
    inputRef.current?.stepDown();
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
      onChange={onChange}
      {...restProps}
      ref={inputRef}
    />
  );
}
