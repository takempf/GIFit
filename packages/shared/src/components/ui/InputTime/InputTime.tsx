import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputTime.module.css';

const SPIN_INTERVAL = 150;

// --- Helper: Debounce Hook ---
function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number
): ((...args: A) => void) & { cancel: () => void } {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(() => {
    const func = (...args: A) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    };

    func.cancel = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    return func as ((...args: A) => void) & { cancel: () => void };
  }, [delay]);
}

// --- Helper: Time Formatting & Parsing ---

const getDecimalPlacesFromMsStep = (stepMs: number): number => {
  const stepSeconds = stepMs / 1000;
  const stepStr = String(stepSeconds);
  const decimalPointIndex = stepStr.indexOf('.');
  return decimalPointIndex === -1 ? 0 : stepStr.length - decimalPointIndex - 1;
};

const msToHMSs = (totalMs: number, decimalPlaces: number): string => {
  if (isNaN(totalMs) || totalMs < 0) {
    totalMs = 0;
  }

  totalMs = Math.round(totalMs);

  const totalSeconds = totalMs / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutesComponent = Math.floor((totalSeconds % 3600) / 60);
  const secondsComponent = totalSeconds % 60;

  const padTwo = (num: number) => String(num).padStart(2, '0');

  const effectiveDecimalPlaces = Math.min(decimalPlaces, 3);
  const formattedFullSeconds = secondsComponent.toFixed(effectiveDecimalPlaces);
  const [secIntStr, secDecStrCandidate] = formattedFullSeconds.split('.');

  let displaySeconds = padTwo(parseInt(secIntStr, 10));

  if (effectiveDecimalPlaces > 0) {
    const decimalPart = secDecStrCandidate || '';
    displaySeconds += `.${decimalPart.padEnd(effectiveDecimalPlaces, '0')}`;
  }

  if (hours > 0) {
    return `${hours}:${padTwo(minutesComponent)}:${displaySeconds}`;
  } else {
    return `${minutesComponent}:${displaySeconds}`;
  }
};

const hmsStringToMs = (hmsString: string): number | null => {
  if (!hmsString || typeof hmsString !== 'string') return null;

  const parts = hmsString.trim().split(':');
  let hours = 0,
    minutes = 0,
    seconds = 0;

  try {
    if (parts.length === 1) {
      seconds = parseFloat(parts[0]);
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0], 10);
      seconds = parseFloat(parts[1]);
    } else if (parts.length === 3) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      seconds = parseFloat(parts[2]);
    } else {
      return null;
    }

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return null;
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return Math.round(totalSeconds * 1000);
  } catch {
    return null;
  }
};

const roundToStep = (value: number, step: number): number => {
  if (step <= 0) return Math.round(value);
  const rounded = Math.round(value / step) * step;
  return rounded;
};

interface InputTimeProps {
  name: string;
  label: string;
  value: number; // Milliseconds
  onChange: (newValue: number) => void;
  step?: number; // Milliseconds
  min?: number; // Milliseconds
  max?: number; // Milliseconds
  debounceMs?: number;
  append?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  onStep?: (
    currentValue: number,
    direction: 'up' | 'down',
    multiplier: number
  ) => number;
}

export const InputTime: React.FC<InputTimeProps> = ({
  name,
  label,
  value,
  onChange,
  step = 100, // Default 100ms
  min = 0,
  max = Infinity,
  debounceMs = 500,
  disabled = false,
  className = '',
  inputClassName = '',
  buttonClassName: _buttonClassName = '',
  append = null,
  onStep,
  ...restProps
}) => {
  const decimalPlaces = getDecimalPlacesFromMsStep(step);
  const [displayValue, setDisplayValue] = useState<string>(() =>
    msToHMSs(value, decimalPlaces)
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      const newDisplayValue = msToHMSs(value, decimalPlaces);
      if (newDisplayValue !== displayValue) {
        setDisplayValue(newDisplayValue);
      }
    }
  }, [value, decimalPlaces, isEditing, displayValue]);

  const commitChange = useCallback(
    (newMsValueCandidate: number | null) => {
      if (newMsValueCandidate === null || isNaN(newMsValueCandidate)) {
        setDisplayValue(msToHMSs(value, decimalPlaces)); // Revert
        setIsEditing(false);
        return;
      }

      let processedValue = newMsValueCandidate;
      processedValue = Math.max(min, Math.min(max, processedValue));

      if (processedValue !== value) {
        onChange(processedValue);
      } else {
        const canonicalDisplay = msToHMSs(processedValue, decimalPlaces);
        if (displayValue !== canonicalDisplay) {
          setDisplayValue(canonicalDisplay);
        }
      }
      setIsEditing(false);
    },
    [value, onChange, min, max, decimalPlaces, displayValue]
  );

  const debouncedCommit = useDebouncedCallback(commitChange, debounceMs);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplay = e.target.value;
    setDisplayValue(newDisplay);
    setIsEditing(true);

    const parsedMs = hmsStringToMs(newDisplay);
    if (
      parsedMs !== null ||
      newDisplay === '' ||
      newDisplay.endsWith(':') ||
      newDisplay.endsWith('.')
    ) {
      debouncedCommit(parsedMs);
    }
  };

  const handleBlur = () => {
    debouncedCommit.cancel();
    const parsedMs = hmsStringToMs(displayValue);
    commitChange(parsedMs);
  };

  const performStep = useCallback(
    (
      currentVal: number,
      direction: 'up' | 'down',
      multiplier: number = 1
    ): number => {
      if (onStep) {
        return onStep(currentVal, direction, multiplier);
      }

      const effectiveStep = step * multiplier;
      let newValue =
        currentVal + (direction === 'up' ? effectiveStep : -effectiveStep);
      newValue = roundToStep(newValue, step); // Rounding usually wants the base step to keep clean intervals?
      // Actually if we step by 5*step, we might want to round to base step anyway to ensure we land on clean numbers.
      // passing `step` (not effectiveStep) to roundToStep ensures we stay on the grid.
      newValue = Math.max(min, Math.min(max, newValue));
      return newValue;
    },
    [step, min, max, onStep]
  );

  const handleStep = useCallback(
    (direction: 'up' | 'down', multiplier: number = 1) => {
      const newValue = performStep(value, direction, multiplier);
      commitChange(newValue);
    },
    [value, performStep, commitChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const multiplier = e.shiftKey ? 5 : 1;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep('up', multiplier);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep('down', multiplier);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpinDirection = useRef<'up' | 'down' | null>(null);

  const stepContinuously = useCallback(
    (currentValForStep: number, multiplier: number) => {
      if (!currentSpinDirection.current) return;

      const newValue = performStep(
        currentValForStep,
        currentSpinDirection.current,
        multiplier
      );

      let continueSpinning = true;

      if (newValue !== currentValForStep) {
        onChange(newValue);
        setDisplayValue(msToHMSs(newValue, decimalPlaces));
      } else {
        setDisplayValue(msToHMSs(newValue, decimalPlaces));
        continueSpinning = false;
      }

      if (
        (currentSpinDirection.current === 'up' && newValue >= max) ||
        (currentSpinDirection.current === 'down' && newValue <= min)
      ) {
        continueSpinning = false;
      }

      if (currentSpinDirection.current && continueSpinning) {
        spinTimeoutRef.current = setTimeout(
          () => stepContinuously(newValue, multiplier),
          SPIN_INTERVAL
        );
      } else {
        if (spinTimeoutRef.current) {
          clearTimeout(spinTimeoutRef.current);
          spinTimeoutRef.current = null;
        }
        currentSpinDirection.current = null;
        setDisplayValue(msToHMSs(newValue, decimalPlaces));
      }
    },
    [performStep, onChange, decimalPlaces, min, max]
  );

  const handlePressStart = (
    direction: 'up' | 'down',
    e: React.PointerEvent
  ) => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }
    currentSpinDirection.current = direction;

    const multiplier = e.shiftKey ? 5 : 1;
    const initialMsValue = hmsStringToMs(displayValue) ?? value;
    const firstStepValue = performStep(initialMsValue, direction, multiplier);

    if (firstStepValue !== initialMsValue) {
      onChange(firstStepValue);
    }
    setDisplayValue(msToHMSs(firstStepValue, decimalPlaces));
    setIsEditing(true);

    if (
      (direction === 'up' && firstStepValue < max) ||
      (direction === 'down' && firstStepValue > min)
    ) {
      spinTimeoutRef.current = setTimeout(
        () => stepContinuously(firstStepValue, multiplier),
        SPIN_INTERVAL
      );
    }
  };

  const handlePressEnd = () => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
    currentSpinDirection.current = null;
    const finalMsValue = hmsStringToMs(displayValue);
    if (finalMsValue !== null) {
      let processedValue = roundToStep(finalMsValue, step);
      processedValue = Math.max(min, Math.min(max, processedValue));

      setDisplayValue(msToHMSs(processedValue, decimalPlaces));
      setIsEditing(false);
    } else {
      setDisplayValue(msToHMSs(value, decimalPlaces));
    }
  };

  const appendWithStepper = (
    <>
      {append}
      <div className={css.stepper}>
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onPointerDown={(e) => handlePressStart('up', e)}
          onPointerUp={handlePressEnd}
          onPointerLeave={handlePressEnd}
          disabled={disabled || value >= max}
          aria-label="Increment time"
          tabIndex={-1}>
          ▲
        </Button>
        <Button
          size="x-small"
          variant="ghost"
          padding="none"
          onPointerDown={(e) => handlePressStart('down', e)}
          onPointerUp={handlePressEnd}
          onPointerLeave={handlePressEnd}
          disabled={disabled || value <= min}
          aria-label="Decrement time"
          tabIndex={-1}>
          ▼
        </Button>
      </div>
    </>
  );

  return (
    <div className={className}>
      <Input
        name={name}
        label={label}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={() => setIsEditing(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={inputClassName}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max === Infinity ? undefined : max}
        aria-label="Time input in H:MM:SS.s or M:SS.s format"
        placeholder="M:SS.s or H:MM:SS.s"
        append={appendWithStepper}
        {...restProps}
      />
    </div>
  );
};
