import css from './ConfigurationPanel.module.css';
import { useCallback } from 'react';
import { useConfigurationPanelStore, useConfigStoreApi } from '@/stores/storeContext';
import type { ConfigState } from '@/features/editor/stores/configurationPanelStore';
import { calculateLastFramePreview } from '@/utils/time';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useVideoMetadata } from '@/features/editor/hooks/useVideoMetadata';

import { Button } from '@/components/ui/Button/Button';
import { Timeline } from '../Timeline/Timeline';
import { NoVideoInterstitial } from './NoVideoInterstitial/NoVideoInterstitial';

import { StartTimeInput } from './StartTimeInput/StartTimeInput';
import { DurationInput } from './DurationInput/DurationInput';
import { FrameRateInput } from './FrameRateInput/FrameRateInput';
import { WidthInput } from './WidthInput/WidthInput';
import { HeightInput } from './HeightInput/HeightInput';
import { QualityInput } from './QualityInput/QualityInput';

interface ConfigurationPanelProps {
  onSubmit: (config: ConfigState) => void;
}

export function ConfigurationPanel({ onSubmit }: ConfigurationPanelProps) {
  const configStoreApi = useConfigStoreApi();
  const start = useConfigurationPanelStore((state) => state.start);
  const duration = useConfigurationPanelStore((state) => state.duration);
  const width = useConfigurationPanelStore((state) => state.width);
  const height = useConfigurationPanelStore((state) => state.height);
  const framerate = useConfigurationPanelStore((state) => state.framerate);
  const videoDuration = useConfigurationPanelStore(
    (state) => state.videoDuration
  );

  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );
  const seekVideo = useConfigurationPanelStore((state) => state.seekVideo);
  const fetchVideoMetadata = useConfigurationPanelStore(
    (state) => state.fetchVideoMetadata
  );
  const captureFrame = useConfigurationPanelStore(
    (state) => state.captureFrame
  );

  const previewTime = useConfigurationPanelStore((state) => state.previewTime);

  const { isMetadataLoaded } = useVideoMetadata();

  const debouncedSeekVideo = useDebouncedCallback(
    async (time: number) => {
      await seekVideo(time);
      captureFrame(time);
    },
    100,
    { maxWait: 500 }
  );

  // Separate preview update logic
  const handlePreviewRequest = useCallback(
    (time: number) => {
      debouncedSeekVideo(time);
    },
    [debouncedSeekVideo]
  );

  // Store values are now in Milliseconds
  const videoDurationMs = videoDuration;
  const durationMs = duration;
  const startMs = start;

  // Max calculations in MS
  const maxStart = Math.max(0, videoDurationMs - durationMs);
  const maxDuration = Math.min(videoDurationMs - startMs, 30000); // 30s limit

  // Early return MUST be after all hooks
  if (!isMetadataLoaded) {
    return <NoVideoInterstitial onRetry={fetchVideoMetadata} />;
  }

  // Timeline callbacks provide milliseconds directly
  function handleTimelineChange(
    newStartMs: number,
    newDurationMs: number,
    context: 'start' | 'end'
  ): void {
    storeHandleInputChange({
      name: 'start',
      value: newStartMs
    });
    storeHandleInputChange({
      name: 'duration',
      value: newDurationMs
    });

    if (context === 'start') {
      handlePreviewRequest(newStartMs);
    } else {
      const previewTimeMs = calculateLastFramePreview(
        newStartMs,
        newDurationMs,
        framerate
      );
      handlePreviewRequest(previewTimeMs);
    }
  }

  function handleTimelineHandleFocus(handle: 'start' | 'end') {
    if (handle === 'start') {
      handlePreviewRequest(start);
    } else {
      const previewTimeMs = calculateLastFramePreview(
        start,
        duration,
        framerate
      );
      handlePreviewRequest(previewTimeMs);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    event.stopPropagation();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentConfigState = configStoreApi.getState();
    onSubmit({
      start, // MS
      duration, // MS
      width,
      height,
      framerate,
      quality: currentConfigState.quality,
      aspectRatio: currentConfigState.aspectRatio,
      videoDuration: currentConfigState.videoDuration,
      videoWidth: currentConfigState.videoWidth,
      videoHeight: currentConfigState.videoHeight,
      previewImage: currentConfigState.previewImage,
      previewTime: currentConfigState.previewTime
    });
  }

  return (
    <form
      className={css.form}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate>
      <div className={css.timeline}>
        <Timeline
          totalDuration={videoDuration}
          startTime={start}
          duration={duration}
          fps={framerate}
          previewTime={previewTime}
          onChange={handleTimelineChange}
          onHandleFocus={handleTimelineHandleFocus}
        />
      </div>

      <StartTimeInput
        onPreviewRequest={handlePreviewRequest}
        maxStart={maxStart}
      />

      <DurationInput
        onPreviewRequest={handlePreviewRequest}
        maxDuration={maxDuration}
      />

      <FrameRateInput
        onPreviewRequest={handlePreviewRequest}
        previewTime={previewTime}
      />

      <WidthInput />

      <HeightInput />

      <QualityInput />

      <div className={css.actions}>
        <Button
          id="gifit-submit"
          rounded={true}
          type="submit"
          className={css.submit}>
          Create GIF
        </Button>
      </div>
    </form>
  );
}
