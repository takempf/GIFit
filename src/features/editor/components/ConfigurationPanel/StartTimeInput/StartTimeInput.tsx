import React from 'react';
import { useConfigurationPanelStore } from '@/stores/storeContext';
import { InputTime } from '@/components/ui/InputTime/InputTime';
import css from './StartTimeInput.module.css';

interface StartTimeInputProps {
  onPreviewRequest: (timeMs: number) => void;
  maxStart: number;
}

export function StartTimeInput({
  onPreviewRequest,
  maxStart
}: StartTimeInputProps) {
  const start = useConfigurationPanelStore((state) => state.start);
  const framerate = useConfigurationPanelStore((state) => state.framerate);
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  function handleStartTimeChange(newStartMs: number) {
    storeHandleInputChange({
      name: 'start',
      value: newStartMs
    });
    onPreviewRequest(newStartMs);
  }

  function handleStep(
    currentValue: number,
    direction: 'up' | 'down',
    multiplier: number
  ) {
    const frameDurationMs = 1000 / framerate;
    const stepAmount = frameDurationMs * multiplier;
    let newValue =
      currentValue + (direction === 'up' ? stepAmount : -stepAmount);

    // Clamp
    newValue = Math.max(0, Math.min(maxStart, newValue));
    return newValue;
  }

  return (
    <div className={css.start}>
      <InputTime
        name="start"
        label="Start"
        value={start}
        min={0}
        max={maxStart}
        step={1} // Allow 1ms precision (3 decimal places)
        onStep={handleStep}
        onChange={handleStartTimeChange}
        data-testid="start-input"
      />
    </div>
  );
}
