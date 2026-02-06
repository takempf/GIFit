import css from './ConfigurationPanel.module.css';
import { useEffect, useCallback, useState } from 'react';
import {
  useConfigurationPanelStore,
  type ConfigState
} from '@/features/editor/stores/configurationPanelStore';
import {
  toMilliseconds,
  toSeconds,
  calculateLastFramePreview
} from '@/utils/time';

import { Button } from '@/components/ui/Button/Button';
import { Timeline } from '../Timeline/Timeline';
import { GifPreview } from '../GifPreview/GifPreview';
import { NoVideoInterstitial } from './NoVideoInterstitial/NoVideoInterstitial';

import { useDebouncedCallback } from '@/hooks/useDebounce';
import { StartTimeInput } from './StartTimeInput';
import { DurationInput } from './DurationInput';
import { FrameRateInput } from './FrameRateInput';
import { WidthInput } from './WidthInput';
import { HeightInput } from './HeightInput';

import { QualityInput } from './QualityInput';

interface ConfigurationPanelProps {
  onSubmit: (config: ConfigState) => void;
}

export function ConfigurationPanel({ onSubmit }: ConfigurationPanelProps) {
  const start = useConfigurationPanelStore((state) => state.start);
  const duration = useConfigurationPanelStore((state) => state.duration);
  const width = useConfigurationPanelStore((state) => state.width);
  const height = useConfigurationPanelStore((state) => state.height);
  const framerate = useConfigurationPanelStore((state) => state.framerate);
  const videoDuration = useConfigurationPanelStore(
    (state) => state.videoDuration
  );
  const previewImage = useConfigurationPanelStore(
    (state) => state.previewImage
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

  const [previewTime, setPreviewTime] = useState(start);

  const debouncedSeekVideo = useDebouncedCallback(async (time: number) => {
    await seekVideo(time);
    captureFrame();
  }, 100);

  // Separate preview update logic
  const handlePreviewRequest = useCallback(
    (time: number) => {
      setPreviewTime(time);
      debouncedSeekVideo(time);
    },
    [debouncedSeekVideo]
  );

  useEffect(() => {
    fetchVideoMetadata().then(() => {
      captureFrame();
    });

    // Poll for video metadata if missing (race condition handling)
    const intervalId = setInterval(() => {
      const state = useConfigurationPanelStore.getState();
      if (state.videoDuration === 0) {
        fetchVideoMetadata().then(() => {
          if (useConfigurationPanelStore.getState().videoDuration > 0) {
            captureFrame();
          }
        });
      } else {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [fetchVideoMetadata, captureFrame]);

  // Store values are now in Milliseconds
  const videoDurationMs = videoDuration;
  const durationMs = duration;
  const startMs = start;

  // Max calculations in MS
  const maxStart = Math.max(0, videoDurationMs - durationMs);
  const maxDuration = Math.min(videoDurationMs - startMs, 30000); // 30s limit

  // Early return MUST be after all hooks
  if (videoDuration === 0) {
    return <NoVideoInterstitial onRetry={fetchVideoMetadata} />;
  }

  // Pure data handlers for Timeline (preview logic handled via onPreviewRequest)
  // Timeline callbacks provide Seconds (legacy interface)
  function handleTimelineChange(
    newStartS: number,
    newDurationS: number,
    context: 'start' | 'end'
  ) {
    const newStartMs = toMilliseconds(newStartS);
    // Use floor for duration to prevent overstepping
    const newDurationMs = Math.floor(newDurationS * 1000);

    storeHandleInputChange({
      name: 'start',
      value: newStartMs
    });
    storeHandleInputChange({
      name: 'duration',
      value: newDurationMs
    });

    // Explicit Preview Logic based on context from Timeline
    if (context === 'start') {
      handlePreviewRequest(newStartMs);
    } else {
      // context === 'end'
      // Logic: Preview the Last GIF Frame.
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
    const currentConfigState = useConfigurationPanelStore.getState();
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
      previewImage: currentConfigState.previewImage
    });
  }

  return (
    <div className={css.gifitConfiguration}>
      <form
        className={css.form}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        noValidate>
        <div className={css.preview}>
          <GifPreview
            previewImage={previewImage}
            width={width}
            height={height}
          />
        </div>

        <div className={css.timeline}>
          <Timeline
            totalDuration={toSeconds(videoDuration)}
            startTime={toSeconds(start)}
            duration={toSeconds(duration)}
            fps={framerate}
            previewTime={toSeconds(previewTime)}
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
          <Button id="gifit-submit" type="submit" className={css.submit}>
            Create GIF
          </Button>
        </div>
      </form>
    </div>
  );
}
