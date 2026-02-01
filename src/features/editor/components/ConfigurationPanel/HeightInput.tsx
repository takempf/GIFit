import React from 'react';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { InputNumber } from '@/components/ui/InputNumber/InputNumber';
import css from './ConfigurationPanel.module.css';

export function HeightInput() {
  const height = useConfigurationPanelStore((state) => state.height);
  const videoHeight = useConfigurationPanelStore((state) => state.videoHeight);
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  const maxHeight = Math.min(videoHeight, 1080);

  function handleHeightChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      storeHandleInputChange({
        name: 'height',
        value: value
      });
    }
  }

  return (
    <div className={css.height}>
      <InputNumber
        name="height"
        label="Height"
        type="number"
        value={String(height)}
        min={32}
        max={maxHeight}
        onChange={handleHeightChange}
        data-testid="height-input"
      />
    </div>
  );
}
