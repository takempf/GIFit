import React from 'react';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { InputNumber } from '@/components/ui/InputNumber/InputNumber';
import { calculateLastFramePreview } from '@/utils/time';
import css from './ConfigurationPanel.module.css';

interface FrameRateInputProps {
  onPreviewRequest: (timeMs: number) => void;
  previewTime: number;
}

export function FrameRateInput({
  onPreviewRequest,
  previewTime
}: FrameRateInputProps) {
  const start = useConfigurationPanelStore((state) => state.start);
  const duration = useConfigurationPanelStore((state) => state.duration);
  const framerate = useConfigurationPanelStore((state) => state.framerate);
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  function handleFramerateChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newFramerate = parseFloat(event.target.value);
    if (!isNaN(newFramerate)) {
      const currentLastFrameMs = calculateLastFramePreview(
        start,
        duration,
        framerate
      );

      // Check if we are currently at the "last frame" of the OLD framerate
      if (Math.abs(previewTime - currentLastFrameMs) < 1) {
        const newLastFrameMs = calculateLastFramePreview(
          start,
          duration,
          newFramerate
        );
        onPreviewRequest(newLastFrameMs);
      }

      // Clamping
      let clampedFramerate = newFramerate;
      if (clampedFramerate > 60) clampedFramerate = 60;
      if (clampedFramerate < 1) clampedFramerate = 1;

      storeHandleInputChange({
        name: 'framerate',
        value: clampedFramerate
      });
    }
  }

  return (
    <div className={css.fps}>
      <InputNumber
        name="framerate"
        label="FPS"
        type="number"
        min={1}
        max={60}
        value={String(framerate)}
        onChange={handleFramerateChange}
        data-testid="fps-input"
      />
    </div>
  );
}
