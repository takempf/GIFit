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

  const maxWidth = videoWidth;

  function handleWidthChange(event: React.ChangeEvent<HTMLInputElement>) {
    let value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      if (value > maxWidth) {
        value = maxWidth;
      }
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
