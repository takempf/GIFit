import React from 'react';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { InputNumber } from '@/components/ui/InputNumber/InputNumber';
import css from './ConfigurationPanel.module.css';

export function WidthInput() {
  const width = useConfigurationPanelStore((state) => state.width);
  const videoWidth = useConfigurationPanelStore((state) => state.videoWidth);
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  const maxWidth = Math.min(videoWidth, 1920);

  function handleWidthChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      storeHandleInputChange({
        name: 'width',
        value: value
      });
    }
  }

  return (
    <div className={css.width}>
      <InputNumber
        name="width"
        label="Width"
        type="number"
        value={String(width)}
        min={32}
        max={maxWidth}
        onChange={handleWidthChange}
        data-testid="width-input"
      />
    </div>
  );
}
