import css from './ConfigurationPanel.module.css';
import { useEffect } from 'react';

import {
  useConfigurationPanelStore,
  type ConfigState
} from '@/stores/configurationPanelStore';

import { Input } from '../Input/Input';
import { InputNumber } from '../InputNumber/InputNumber';
import { InputTime } from '../InputTime/InputTime';
import { Button } from '../Button/Button';
import { ButtonToggle } from '../ButtonToggle/ButtonToggle';

import LinkIcon from '@/assets/link.svg?react';
import LinkEmptyIcon from '@/assets/link-empty.svg?react';

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
    videoWidth: configVideoWidth, // Renamed to avoid conflict with component's width
    videoHeight: configVideoHeight, // Renamed to avoid conflict with component's height
    handleInputChange: storeHandleInputChange,
    seekVideo,
    fetchVideoMetadata,
    syncStartToVideoTime
  } = useConfigurationPanelStore();

  useEffect(() => {
    fetchVideoMetadata();
  }, [fetchVideoMetadata]);

  if (videoDuration === 0) {
    return null; // Or some placeholder/loading UI
  }

  const maxWidth = Math.min(configVideoWidth, 1920);
  const maxHeight = Math.min(configVideoHeight, 1080);
  const maxStart = Math.max(0, videoDuration - duration); // Ensure maxStart is not negative
  const maxDuration = Math.min(videoDuration - start, 30);

  function handleGenericInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const inputElement = event.target;
    const fieldName = inputElement.name as keyof ConfigState; // Type assertion

    const numericValue = parseFloat(inputElement.value);
    if (isNaN(numericValue) && fieldName !== 'linkDimensions') {
      // linkDimensions is boolean
      return;
    }

    // Narrow down the type for storeHandleInputChange
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
      seekVideo(end);
    }
  }

  function handleStartTimeChange(newStart: number) {
    storeHandleInputChange({
      name: 'start',
      value: newStart
    });
    seekVideo(newStart);
  }

  function handleLinkToggleChange(isLinked: boolean) {
    storeHandleInputChange({
      name: 'linkDimensions',
      value: isLinked
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Construct config object from store state to pass to onSubmit
    const currentConfigState = useConfigurationPanelStore.getState();
    onSubmit({
      start,
      duration,
      width,
      height,
      linkDimensions,
      framerate,
      quality,
      aspectRatio: currentConfigState.aspectRatio, // Ensure this is the calculated one
      videoDuration: currentConfigState.videoDuration,
      videoWidth: currentConfigState.videoWidth,
      videoHeight: currentConfigState.videoHeight
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    event.stopPropagation();
  }

  function handleSetStartToCurrentTimeClick() {
    syncStartToVideoTime();
  }

  return (
    <div className={css.gifitConfiguration}>
      <form
        className={css.form}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}>
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
