import css from './ConfigurationPanel.module.css';
import { useEffect, useRef, useCallback } from 'react';
import {
  useConfigurationPanelStore,
  type ConfigState
} from '@/stores/configurationPanelStore';

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
    aspectRatio,
    handleInputChange: storeHandleInputChange,
    seekVideo,
    fetchVideoMetadata,
    syncStartToVideoTime,
    captureFrame
  } = useConfigurationPanelStore();

  const debouncedSeekVideo = useDebouncedCallback(async (time: number) => {
    await seekVideo(time);
    captureFrame();
  }, 1000);

  useEffect(() => {
    fetchVideoMetadata().then(() => {
      captureFrame();
    });
  }, [fetchVideoMetadata, captureFrame]);

  if (videoDuration === 0) {
    return null;
  }

  const maxWidth = Math.min(configVideoWidth, 1920);
  const maxHeight = Math.min(configVideoHeight, 1080);
  const maxStart = Math.max(0, videoDuration - duration);
  const maxDuration = Math.min(videoDuration - start, 30);

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
      const end = start + numericValue;
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

  // ...

  function handleSetStartToCurrentTimeClick() {
    syncStartToVideoTime().then(() => {
      captureFrame();
    });
  }

  return (
    <div className={css.gifitConfiguration}>
      <form
        className={css.form}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}>
        <div className={css.preview}>
          <GifPreview previewImage={previewImage} aspectRatio={aspectRatio} />
        </div>
        {/* Rest of form ... */}
        <InputTime
          className={css.start}
          name="start"
          label="Start"
          value={start}
          min={0}
          max={maxStart}
          onChange={handleStartTimeChange}
          data-testid="start-input"
          append={
            <Button
              title="Set to current time"
              variant="outline"
              size="x-small"
              padding="x-small"
              onClick={handleSetStartToCurrentTimeClick}>
              Now
            </Button>
          }
        />
        <InputNumber
          className={css.duration}
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
        <InputNumber
          className={css.width}
          name="width"
          label="Width"
          type="number"
          value={String(width)}
          min={32}
          max={maxWidth}
          onChange={handleGenericInputChange}
          data-testid="width-input"
        />
        <ButtonToggle
          className={css.linkDimensions}
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
        <InputNumber
          className={css.height}
          name="height"
          label="Height"
          type="number"
          value={String(height)}
          min={32}
          max={maxHeight}
          onChange={handleGenericInputChange}
          data-testid="height-input"
        />
        <InputNumber
          className={css.fps}
          name="framerate"
          label="FPS"
          type="number"
          min={1}
          max={60}
          value={String(framerate)}
          onChange={handleGenericInputChange}
          data-testid="fps-input"
        />
        <Timeline
          className={css.timeline}
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
            const end = start + newDuration;
            debouncedSeekVideo(end);
          }}
        />
        <Input
          className={css.quality}
          name="quality"
          label="Quality"
          type="range"
          min={1}
          max={10}
          value={String(quality)}
          onChange={handleGenericInputChange}
          data-testid="quality-input"
        />
        <Button id="gifit-submit" className={css.submit} type="submit">
          Create GIF
        </Button>
      </form>
    </div>
  );
}
