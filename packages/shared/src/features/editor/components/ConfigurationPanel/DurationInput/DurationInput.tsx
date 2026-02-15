import React from 'react';
import { useConfigurationPanelStore } from '@shared/features/editor/stores/configurationPanelStore';
import { InputNumber } from '@shared/components/ui/InputNumber/InputNumber';
import { toSeconds, calculateLastFramePreview } from '@shared/utils/time';
import css from './DurationInput.module.css';

interface DurationInputProps {
  onPreviewRequest: (timeMs: number) => void;
  maxDuration: number;
}

export function DurationInput({
  onPreviewRequest,
  maxDuration
}: DurationInputProps) {
  const start = useConfigurationPanelStore((state) => state.start);
  const duration = useConfigurationPanelStore((state) => state.duration);
  const framerate = useConfigurationPanelStore((state) => state.framerate);
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  function handleDurationChangeMs(roundedMs: number) {
    storeHandleInputChange({
      name: 'duration',
      value: roundedMs
    });

    const previewTimeMs = calculateLastFramePreview(
      start,
      roundedMs,
      framerate
    );
    onPreviewRequest(previewTimeMs);
  }

  function handleDurationChange(event: React.ChangeEvent<HTMLInputElement>) {
    const valueSeconds = parseFloat(event.target.value);
    if (isNaN(valueSeconds)) return;

    // Convert to MS
    let roundedMs = Math.floor(valueSeconds * 1000);

    // Clamping
    const maxDurationMs = maxDuration;
    if (roundedMs > maxDurationMs) {
      roundedMs = maxDurationMs;
    }

    handleDurationChangeMs(roundedMs);
  }

  return (
    <div className={css.duration}>
      <InputNumber
        name="duration"
        label="Duration"
        type="number"
        value={String(toSeconds(duration))}
        min={1 / framerate} // Seconds
        max={toSeconds(maxDuration)} // Seconds
        step={1 / framerate} // Seconds (standard InputNumber step)
        onChange={handleDurationChange}
        data-testid="duration-input"
      />
    </div>
  );
}
