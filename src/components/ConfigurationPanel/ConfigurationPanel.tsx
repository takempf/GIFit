import css from './ConfigurationPanel.module.css';
import { useEffect, useRef, useCallback } from 'react';
import {
  useConfigurationPanelStore,
  type ConfigState
} from '@/stores/configurationPanelStore';
import { toMilliseconds, toSeconds } from '@/utils/time';

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

  const debouncedSeekVideo = useDebouncedCallback(async (time: number) => {
    await seekVideo(time);
    captureFrame();
  }, 100);

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

  if (videoDuration === 0) {
    return null;
  }

  const maxWidth = Math.min(configVideoWidth, 1920);
  const maxHeight = Math.min(configVideoHeight, 1080);

  // Use integer math for time calculations to avoid float errors
  const videoDurationMs = toMilliseconds(videoDuration);
  const durationMs = toMilliseconds(duration);
  const startMs = toMilliseconds(start);

  const maxStart = toSeconds(Math.max(0, videoDurationMs - durationMs));
  const maxDuration = toSeconds(Math.min(videoDurationMs - startMs, 30000)); // 30s limit

  function handleGenericInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    // ... same logic ...
    const inputElement = event.target;
    const fieldName = inputElement.name as keyof ConfigState; // Type assertion

    const numericValue = parseFloat(inputElement.value);
    if (isNaN(numericValue) && fieldName !== 'linkDimensions') {
      return;
    }

    if (
      fieldName === 'duration' ||
      fieldName === 'width' ||
      fieldName === 'height' ||
      fieldName === 'framerate' ||
      fieldName === 'quality'
    ) {
      storeHandleInputChange({
        name: fieldName,
        value: numericValue
      });
    }

    if (fieldName === 'duration') {
      const end = toSeconds(startMs + toMilliseconds(numericValue));
      debouncedSeekVideo(end);
    }
  }

  function handleStartTimeChange(newStart: number) {
    storeHandleInputChange({
      name: 'start',
      value: newStart
    });
    debouncedSeekVideo(newStart);
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
      start,
      duration,
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
        onKeyDown={handleKeyDown}>
        <div className={css.preview}>
          <GifPreview
            previewImage={previewImage}
            width={width}
            height={height}
          />
        </div>

        <div className={css.timeline}>
          <Timeline
            totalDuration={videoDuration}
            startTime={start}
            duration={duration}
            fps={framerate}
            onStartTimeChange={handleStartTimeChange}
            onDurationChange={(newDuration) => {
              storeHandleInputChange({
                name: 'duration',
                value: newDuration
              });
              const end = toSeconds(startMs + toMilliseconds(newDuration));
              debouncedSeekVideo(end);
            }}
          />
        </div>

        <div className={css.start}>
          <InputTime
            name="start"
            label="Start"
            value={start}
            min={0}
            max={maxStart}
            onChange={handleStartTimeChange}
            data-testid="start-input"
          />
        </div>

        <div className={css.duration}>
          <InputNumber
            name="duration"
            label="Duration"
            type="number"
            value={String(duration)}
            min={1 / framerate}
            max={maxDuration}
            step={1 / framerate}
            onChange={handleGenericInputChange}
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
            onChange={handleGenericInputChange}
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
            onChange={handleGenericInputChange}
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
            onChange={handleGenericInputChange}
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
            onChange={handleGenericInputChange}
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
