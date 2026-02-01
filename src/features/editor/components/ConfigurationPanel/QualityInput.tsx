import React from 'react';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { Slider } from '@/components/ui/Slider/Slider';
import css from './ConfigurationPanel.module.css';

export function QualityInput() {
  const quality = useConfigurationPanelStore((state) => state.quality);
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  function handleQualityChange(value: number) {
    storeHandleInputChange({
      name: 'quality',
      value: value
    });
  }

  return (
    <div className={css.quality}>
      <Slider
        label="Quality"
        min={1}
        max={10}
        step={1}
        value={quality ?? 5}
        onValueChange={handleQualityChange}
        marks
        data-testid="quality-input"
      />
    </div>
  );
}
