import css from './ConfigurationPanel.module.css';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  useConfigurationPanelStore,
  type ConfigState
} from '@/stores/configurationPanelStore';
import {
  toMilliseconds,
  toSeconds,
  calculateLastFramePreview
} from '@/utils/time';

import { Input } from '../Input/Input';
import { InputNumber } from '../InputNumber/InputNumber';
import { InputTime } from '../InputTime/InputTime';
import { Button } from '../Button/Button';
import { ButtonToggle } from '../ButtonToggle/ButtonToggle';
import { Timeline } from '../Timeline/Timeline';
import { GifPreview } from '../GifPreview/GifPreview';

import LinkIcon from '@/assets/link.svg?react';
import LinkEmptyIcon from '@/assets/link-empty.svg?react';

// --- Helper: Debounce Hook ---
function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: A) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

interface ConfigurationPanelProps {
  onSubmit: (config: ConfigState) => void;
}

export function ConfigurationPanel({ onSubmit }: ConfigurationPanelProps) {
  const {
    start,
    duration,
    width,
    height,
    linkDimensions,
    framerate,
    quality,
    videoDuration,
    videoWidth: configVideoWidth,
    videoHeight: configVideoHeight,
    previewImage,
    handleInputChange: storeHandleInputChange,
    seekVideo,
    fetchVideoMetadata,
    captureFrame
  } = useConfigurationPanelStore();

  const [previewTime, setPreviewTime] = useState(start);

  const debouncedSeekVideo = useDebouncedCallback(async (time: number) => {
    await seekVideo(time);
    captureFrame();
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
    return null;
  }

  const maxWidth = Math.min(configVideoWidth, 1920);
  const maxHeight = Math.min(configVideoHeight, 1080);

  function handleDurationChangeMs(roundedMs: number) {
    storeHandleInputChange({
      name: 'duration',
      value: roundedMs
    });

    const previewTimeMs = calculateLastFramePreview(
      start,
      roundedMs,
      framerate
    );
    handlePreviewRequest(previewTimeMs);
  }

  function handleDurationChange(event: React.ChangeEvent<HTMLInputElement>) {
    const valueSeconds = parseFloat(event.target.value);
    if (isNaN(valueSeconds)) return;

    // Convert to MS
    // Use floor for duration to prevent overstepping
    const roundedMs = Math.floor(valueSeconds * 1000);

    handleDurationChangeMs(roundedMs);
  }

  function handleGenericChange(
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'width' | 'height' | 'framerate' | 'quality'
  ) {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      storeHandleInputChange({
        name: field,
        value: value
      });
    }
  }

  function handleWidthChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleGenericChange(event, 'width');
  }

  function handleHeightChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleGenericChange(event, 'height');
  }

  function handleFramerateChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleGenericChange(event, 'framerate');
  }

  function handleQualityChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleGenericChange(event, 'quality');
  }

  function handleStartTimeChange(newStartMs: number) {
    // InputTime returns MS
    storeHandleInputChange({
      name: 'start',
      value: newStartMs
    });
    // When changing start time via input, show new start
    handlePreviewRequest(newStartMs);
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

  function handleLinkToggleChange(isLinked: boolean) {
    storeHandleInputChange({
      name: 'linkDimensions',
      value: isLinked
    });
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
      linkDimensions,
      framerate,
      quality,
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
          />
        </div>

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

        <div className={css.duration}>
          <InputNumber
            name="duration"
            label="Duration"
            type="number"
            value={String(toSeconds(duration))}
            min={1 / framerate} // Seconds
            max={toSeconds(maxDuration)} // Seconds
            step={1 / framerate} // Seconds (standard InputNumber step)
            onChange={handleDurationChange}
            data-testid="duration-input"
          />
        </div>

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

        <div className={css.linkDimensions}>
          <ButtonToggle
            name="linkDimensions"
            size="x-small"
            rounded={true}
            variant="input"
            padding="small"
            evenPadding={true}
            checked={linkDimensions}
            onChange={handleLinkToggleChange}
            data-testid="dimensions-link-toggle">
            {linkDimensions ? (
              <LinkIcon className={css.linkIcon} />
            ) : (
              <LinkEmptyIcon className={css.linkIcon} />
            )}
          </ButtonToggle>
        </div>

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

        <div className={css.submit}>
          <Button id="gifit-submit" type="submit" className={css.submitButton}>
            Create GIF
          </Button>
        </div>
      </form>
    </div>
  );
}
