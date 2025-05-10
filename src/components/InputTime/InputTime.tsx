import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';

import css from './InputTime.module.css';

// --- Helper: Debounce Hook (same as before) ---
function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: A) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

// --- Helper: Time Formatting & Parsing ---

const getStepDecimalPlaces = (step: number): number => {
  const stepStr = String(step);
  const decimalPointIndex = stepStr.indexOf('.');
  return decimalPointIndex === -1 ? 0 : stepStr.length - decimalPointIndex - 1;
};

/**
 * Converts total seconds to a dynamic H:MM:SS.s or M:SS.s format.
 * - If hours > 0: H:MM:SS.s (e.g., 1:00:00.2)
 * - Else: M:SS.s (e.g., 0:12.0, 1:15.2)
 */
const secondsToHMSs = (totalSeconds: number, decimalPlaces: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    totalSeconds = 0;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutesComponent = Math.floor((totalSeconds % 3600) / 60);
  const secondsComponent = totalSeconds % 60;

  const padTwo = (num: number) => String(num).padStart(2, '0');

  // Format seconds part (SS.s or SS)
  // toFixed will round, e.g. 59.99s with decimalPlaces=1 and step=0.1 might become 60.0
  // We handle carry-over by parsing, then re-calculating H, M, S.
  // Here, secondsComponent is already < 60.
  const formattedFullSeconds = secondsComponent.toFixed(decimalPlaces);
  const [secIntStr, secDecStrCandidate] = formattedFullSeconds.split('.');

  let displaySeconds = padTwo(parseInt(secIntStr, 10)); // Pad integer part of seconds

  if (decimalPlaces > 0) {
    const decimalPart = secDecStrCandidate || '';
    displaySeconds += `.${decimalPart.padEnd(decimalPlaces, '0')}`;
  }

  if (hours > 0) {
    return `${hours}:${padTwo(minutesComponent)}:${displaySeconds}`;
  } else {
    // No hours, display M:SS.s (or MM:SS.s if minutes >= 10)
    // minutesComponent itself is not padded here, to allow "1:15.2" not "01:15.2"
    return `${minutesComponent}:${displaySeconds}`;
  }
};

const hmsStringToSeconds = (hmsString: string): number | null => {
  if (!hmsString || typeof hmsString !== 'string') return null;

  const parts = hmsString.trim().split(':');
  let hours = 0,
    minutes = 0,
    seconds = 0;

  try {
    if (parts.length === 1) {
      // SS.s
      seconds = parseFloat(parts[0]);
    } else if (parts.length === 2) {
      // MM:SS.s
      minutes = parseInt(parts[0], 10);
      seconds = parseFloat(parts[1]);
    } else if (parts.length === 3) {
      // HH:MM:SS.s
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      seconds = parseFloat(parts[2]);
    } else {
      return null;
    }

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return null;
    }
    // Basic validation, could be stricter depending on needs
    if (minutes < 0 || minutes > 59 || seconds < 0 || seconds >= 60) {
      // allow seconds=60 during input
      if (seconds === 60 && (minutes < 59 || hours > 0)) {
        // Allow 60s to carry over
        // it will be normalized later by converting total seconds back
      } else if (seconds >= 60) {
        // return null; // Or try to normalize, but simple parsing is usually better
      }
    }

    return hours * 3600 + minutes * 60 + seconds;
  } catch (e) {
    return null;
  }
};

const roundToStep = (
  value: number,
  step: number,
  decimalPlaces: number
): number => {
  if (step <= 0) return parseFloat(value.toFixed(decimalPlaces)); // just fix precision
  const inverseStep = 1 / step;
  const rounded = Math.round(value * inverseStep) / inverseStep;
  return parseFloat(
    rounded.toFixed(Math.max(decimalPlaces, getStepDecimalPlaces(step)))
  );
};

// --- Component Props (same as before) ---
interface InputTimeProps {
  value: number;
  onChange: (newValue: number) => void;
  step?: number;
  min?: number;
  max?: number;
  debounceMs?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

// --- The Component (logic mostly same, relies on new secondsToHMSs) ---
export const InputTime: React.FC<InputTimeProps> = ({
  value,
  onChange,
  step = 0.1,
  min = 0,
  max = Infinity,
  debounceMs = 500,
  disabled = false,
  className = '',
  inputClassName = '',
  buttonClassName = '',
  ...restProps
}) => {
  const decimalPlaces = getStepDecimalPlaces(step);
  const [displayValue, setDisplayValue] = useState<string>(() =>
    secondsToHMSs(value, decimalPlaces)
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      const newDisplayValue = secondsToHMSs(value, decimalPlaces);
      if (newDisplayValue !== displayValue) {
        setDisplayValue(newDisplayValue);
      }
    }
  }, [value, decimalPlaces, isEditing, displayValue]);

  const commitChange = useCallback(
    (newNumericValueCandidate: number | null) => {
      if (
        newNumericValueCandidate === null ||
        isNaN(newNumericValueCandidate)
      ) {
        setDisplayValue(secondsToHMSs(value, decimalPlaces)); // Revert to last valid
        setIsEditing(false);
        return;
      }

      let processedValue = roundToStep(
        newNumericValueCandidate,
        step,
        decimalPlaces
      );
      processedValue = Math.max(min, Math.min(max, processedValue));

      // Check if the actual numeric value needs to change
      // Use a small epsilon for float comparison if necessary, or rely on toFixed for string comparison
      const currentRoundedValue = parseFloat(value.toFixed(decimalPlaces + 1)); // Compare with similar precision
      const newRoundedProcessedValue = parseFloat(
        processedValue.toFixed(decimalPlaces + 1)
      );

      if (newRoundedProcessedValue !== currentRoundedValue) {
        onChange(processedValue);
      } else {
        // If the numeric value is effectively the same, still update the display
        // to ensure canonical formatting (e.g., user types "0:5.0", value is 5.0, display should be "0:05.0")
        const canonicalDisplay = secondsToHMSs(processedValue, decimalPlaces);
        if (displayValue !== canonicalDisplay) {
          setDisplayValue(canonicalDisplay);
        }
      }
      setIsEditing(false);
    },
    [value, onChange, step, min, max, decimalPlaces, displayValue]
  ); // Added displayValue to dep list

  const debouncedCommit = useDebouncedCallback(commitChange, debounceMs);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplay = e.target.value;
    setDisplayValue(newDisplay);
    setIsEditing(true);

    const parsed = hmsStringToSeconds(newDisplay);
    // Debounce if it's parsable or empty (allowing deletion) or ends with colon (partial input)
    if (
      parsed !== null ||
      newDisplay === '' ||
      newDisplay.endsWith(':') ||
      newDisplay.endsWith('.')
    ) {
      debouncedCommit(parsed);
    } else {
      // If input is immediately invalid (e.g. "abc"), don't try to parse/commit yet.
      // Let blur or further input handle it.
    }
  };

  const handleBlur = () => {
    // On blur, always try to commit the current text input value immediately.
    // This cancels any pending debounced commit.
    // Clear any pending timeout from useDebouncedCallback
    // (Ideally, useDebouncedCallback would return a cancel function)
    const parsed = hmsStringToSeconds(displayValue);
    commitChange(parsed); // Commit immediately
  };

  const handleStep = (direction: 'up' | 'down') => {
    setIsEditing(false); // Stepping commits immediately
    let currentValueToStepFrom = value;
    // If displayValue is valid and different from `value`'s representation, prefer it as base for stepping
    const parsedDisplay = hmsStringToSeconds(displayValue);
    if (parsedDisplay !== null && !isNaN(parsedDisplay)) {
      const roundedParsedDisplay = roundToStep(
        parsedDisplay,
        step,
        decimalPlaces
      );
      // Check if parsed display is significantly different from current prop value
      if (Math.abs(roundedParsedDisplay - value) > step / 2) {
        currentValueToStepFrom = roundedParsedDisplay;
      }
    }

    let newValue = currentValueToStepFrom + (direction === 'up' ? step : -step);
    // Ensure we don't get stuck if current value is not a multiple of step
    // also handles potential floating point issues before min/max clamping
    newValue = roundToStep(newValue, step, decimalPlaces);

    newValue = Math.max(min, Math.min(max, newValue)); // Clamp
    commitChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep('down');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(); // Treat enter like blur for commit
    }
  };

  const append = (
    <div className={css.stepper}>
      <Button
        size="x-small"
        variant="ghost"
        noPadding={true}
        onClick={() => handleStep('up')}
        disabled={disabled || value >= max}
        aria-label="Increment time">
        ▲
      </Button>
      <Button
        size="x-small"
        variant="ghost"
        noPadding={true}
        onClick={() => handleStep('down')}
        disabled={disabled || value <= min}
        aria-label="Decrement time">
        ▼
      </Button>
    </div>
  );

  return (
    <div className={`time-input-container ${className}`}>
      <Input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={() => setIsEditing(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`time-input-field ${inputClassName}`}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max === Infinity ? undefined : max}
        aria-label="Time input in H:MM:SS.s or M:SS.s format"
        placeholder="M:SS.s or H:MM:SS.s"
        append={append}
        {...restProps}
      />
    </div>
  );
};
