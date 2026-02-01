import React from 'react';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { InputTime } from '@/components/ui/InputTime/InputTime';
import css from './ConfigurationPanel.module.css';

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

  return (
    <div className={css.start}>
      <InputTime
        name="start"
        label="Start"
        value={start}
        min={0}
        max={maxStart}
        step={1000 / framerate}
        onChange={handleStartTimeChange}
        data-testid="start-input"
      />
    </div>
  );
}
