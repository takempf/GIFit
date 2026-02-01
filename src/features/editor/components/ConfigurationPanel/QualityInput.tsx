import React from 'react';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { Input } from '@/components/ui/Input/Input';
import css from './ConfigurationPanel.module.css';

export function QualityInput() {
  const quality = useConfigurationPanelStore((state) => state.quality);
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  function handleQualityChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      storeHandleInputChange({
        name: 'quality',
        value: value
      });
    }
  }

  return (
    <div className={css.quality}>
      <Input
        name="quality"
        label="Quality"
        type="range"
        min={1}
        max={10}
        value={String(quality)}
        onChange={handleQualityChange}
        data-testid="quality-input"
      />
    </div>
  );
}
