import css from './ConfigurationPanel.module.css';
import { useEffect } from 'react';

import { useAppStore } from '@/stores/appStore';
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

function ConfigurationPanel({ onSubmit }: ConfigurationPanelProps) {
  const video = useAppStore((state) => state.videoElement);
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
    handleVideoLoadedData,
    // handleVideoSeeked, // Not directly used for state change in component
    handleSetStartToCurrentTime,
    seekVideo,
    resetState
  } = useConfigurationPanelStore();

  useEffect(() => {
    // Reset store state when component mounts or video element changes significantly
    // This is now primarily handled by the store's subscription to appStore.
    // However, an initial reset on mount might still be desired if the video element
    // is already present when the component mounts.
    if (video) {
      resetState(video);
    }
  }, [video, resetState]);

  useEffect(() => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    function handleLoadedMetadataCallback() {
      if (video) {
        // Ensure video is still valid
        handleVideoLoadedData({
          aspectRatio: video.videoWidth / video.videoHeight,
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
      }
    }

    // Initial call in case metadata is already loaded
    if (video.readyState >= 1) {
      // HAVE_METADATA or higher
      handleLoadedMetadataCallback();
    }
    video.addEventListener('loadedmetadata', handleLoadedMetadataCallback);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadataCallback);
    };
  }, [video, handleVideoLoadedData]);

  if (!video) {
    return null; // Or some placeholder/loading UI
  }

  const maxWidth = Math.min(configVideoWidth || video.videoWidth, 1920);
  const maxHeight = Math.min(configVideoHeight || video.videoHeight, 1080); // Corrected to Math.min
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
    if (video) {
      handleSetStartToCurrentTime({ currentTime: video.currentTime });
    }
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
          onChange={handleLinkToggleChange}>
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
        />
        <Button id="gifit-submit" className={css.submit} type="submit">
          GIFit!
        </Button>
      </form>
    </div>
  );
}

export default ConfigurationPanel;
