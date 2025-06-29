import { useRef } from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputNumber.module.css';

import type { InputProps } from '../Input/Input';

interface InputNumberProps extends InputProps {
  name: string;
  label: React.ReactNode;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  append?: React.ReactNode; // Existing append for things like steppers
  onAppendButtonClick?: () => void;
  appendButtonIcon?: React.ReactNode;
  appendButtonLabel?: string;
}

export function InputNumber({
  name,
  label,
  value,
  onChange,
  append, // This will be the stepper controls passed from outside if needed, or similar
  onAppendButtonClick,
  appendButtonIcon,
  appendButtonLabel = 'Append button',
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

  const stepperControls = (
    <div
      className={css.buttonGrid} // Use CSS Module class
    >
      <Button
        size="x-small"
        variant="ghost"
        padding="none"
        onClick={handleUpClick}
        disabled={restProps.disabled}>
        ▲
      </Button>
      <Button
        size="x-small"
        variant="ghost"
        padding="none"
        onClick={handleDownClick}
        disabled={restProps.disabled}>
        ▼
      </Button>
    </div>
  );

  const appendElements: React.ReactNode[] = [];

  if (onAppendButtonClick && appendButtonIcon) {
    appendElements.push(
      <Button
        key="custom-append-button"
        size="x-small"
        variant="ghost"
        padding="none"
        onClick={onAppendButtonClick}
        disabled={restProps.disabled}
        aria-label={appendButtonLabel}
        className={css.appendButton} // Assuming similar styling to InputTime
      >
        {appendButtonIcon}
      </Button>
    );
  }

  // Add the standard stepper controls
  appendElements.push(stepperControls);

  // Add any other append content passed via props
  if (append) {
    appendElements.push(append);
  }

  const combinedAppend = (
    <div className={css.appendContainer}>{appendElements}</div>
  );

  return (
    <Input
      name={name}
      label={label}
      append={combinedAppend}
      value={value}
      onChange={onChange}
      type="number"
      {...restProps}
      ref={inputRef}
    />
  );
}
