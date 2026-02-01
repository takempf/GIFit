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

  const maxHeight = videoHeight;

  function handleHeightChange(event: React.ChangeEvent<HTMLInputElement>) {
    let value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      if (value > maxHeight) {
        value = maxHeight;
      }
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
