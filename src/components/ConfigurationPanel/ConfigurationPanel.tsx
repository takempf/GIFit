import css from './ConfigurationPanel.module.css';

import { useEffect, useReducer } from 'react';

import { clamp } from '@/utils/clamp.js';
import { useAppStore } from '@/stores/appStore';
import { log } from '@/utils/logger';

import { Input } from '../Input/Input';
import { InputNumber } from '../InputNumber/InputNumber';
import { InputTime } from '../InputTime/InputTime';
import { Button } from '../Button/Button';
import { ButtonToggle } from '../ButtonToggle/ButtonToggle';

import LinkIcon from '@/assets/link.svg?react';
import LinkEmptyIcon from '@/assets/link-empty.svg?react';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 180;

interface ConfigState {
  start: number;
  duration: number;
  width: number;
  height: number;
  linkDimensions: boolean;
  framerate: number;
  quality: number;
  aspectRatio: number;
}

// This creates a union of all possible input change payloads, e.g.,
// { name: 'start'; value: number } | { name: 'linkDimensions'; value: boolean }
type InputActionPayload = {
  [K in keyof ConfigState]: { name: K; value: ConfigState[K] };
}[keyof ConfigState];

// FIX: Created a discriminated union for all possible actions for type safety in the reducer.
type ConfigAction =
  | { type: 'INPUT_CHANGE'; payload: InputActionPayload }
  | { type: 'VIDEO_LOADED_DATA'; payload: { aspectRatio: number } }
  | { type: 'VIDEO_SEEKED'; payload: { currentTime: number } }
  | { type: 'SET_START_TO_CURRENT_TIME'; payload: { currentTime: number } };

function seekTo(videoElement: HTMLVideoElement, time: number) {
  if (typeof time !== 'number' || time < 0) {
    log(`Could not seek to ${time}`);
    return;
  }

  videoElement.currentTime = clamp(0, videoElement.duration, time);
  videoElement.pause(); // ensure video does not play on its own
}

function getVideoAspectRatio(videoElement: HTMLVideoElement) {
  return videoElement.videoWidth / videoElement.videoHeight;
}

// FIX: Added explicit return type annotation for the reducer.
function reducer(state: ConfigState, action: ConfigAction): ConfigState {
  switch (action.type) {
    case 'INPUT_CHANGE': {
      // Because of the improved ConfigAction type, TypeScript now knows that
      // action.payload.name and action.payload.value are correctly linked.
      const { name, value } = action.payload;

      const newState = {
        ...state,
        [name]: value
      };

      // adjust other dimension if they are linked
      if (state.linkDimensions) {
        // The payload is a discriminated union, so we check the 'name' property
        if (action.payload.name === 'width') {
          // TS now knows action.payload.value is a number
          newState.height = Math.round(
            action.payload.value / state.aspectRatio
          );
        } else if (action.payload.name === 'height') {
          // TS now knows action.payload.value is a number
          newState.width = Math.round(action.payload.value * state.aspectRatio);
        }
      }

      // adjust height if linkDimensions is turned on
      if (action.payload.name === 'linkDimensions' && action.payload.value) {
        newState.height = Math.round(state.width / state.aspectRatio);
      }

      return newState;
    }

    case 'VIDEO_LOADED_DATA': {
      return {
        ...state,
        aspectRatio: action.payload.aspectRatio,
        height: Math.round(state.width / action.payload.aspectRatio)
      };
    }

    case 'SET_START_TO_CURRENT_TIME': {
      return {
        ...state,
        start: action.payload.currentTime
      };
    }

    case 'VIDEO_SEEKED':
    default:
      // FIX: No need to spread state here, just return it.
      return state;
  }
}

interface ConfigurationPanelProps {
  // FIX: Changed 'Function' to a specific signature for type safety.
  onSubmit: (config: ConfigState) => void;
}

function ConfigurationPanel({ onSubmit }: ConfigurationPanelProps) {
  const video = useAppStore((state) => state.videoElement);

  const [state, dispatch] = useReducer(reducer, {
    start: video?.currentTime ?? 0,
    duration: 2,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    linkDimensions: true,
    framerate: 10,
    quality: 5,
    aspectRatio: DEFAULT_WIDTH / DEFAULT_HEIGHT
  });

  useEffect(() => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    function handleLoadedMetadata() {
      const aspectRatio = getVideoAspectRatio(video as HTMLVideoElement);
      dispatch({
        type: 'VIDEO_LOADED_DATA',
        payload: {
          aspectRatio
        }
      });
    }

    handleLoadedMetadata();
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [video]);

  useEffect(() => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    function handleVideoSeeked() {
      const { isOpen, status } = useAppStore.getState();
      if (video && isOpen && status === 'configuring' && video.paused) {
        dispatch({
          type: 'VIDEO_SEEKED',
          payload: {
            currentTime: video.currentTime
          }
        });
      }
    }

    video.addEventListener('seeked', handleVideoSeeked);

    return () => {
      video.removeEventListener('seeked', handleVideoSeeked);
    };
  }, [video]);

  if (!video) {
    return;
  }

  const maxWidth = Math.min(video.videoWidth, 1920);
  const maxHeight = Math.max(video.videoHeight, 1080);
  const maxStart = video.duration - state.duration;
  const maxDuration = Math.min(video.duration - state.start, 30);

  // FIX: Changed event type from 'InputEvent' to React's 'ChangeEvent'.
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const inputElement = event.target;
    const fieldName = inputElement.name;

    // FIX: Input values are always strings. They must be parsed to numbers.
    const numericValue = parseFloat(inputElement.value);

    // Prevent dispatching NaN if the input is cleared or invalid.
    if (isNaN(numericValue)) {
      return;
    }

    // This check helps TypeScript narrow the type of 'fieldName'
    if (
      fieldName === 'duration' ||
      fieldName === 'width' ||
      fieldName === 'height' ||
      fieldName === 'framerate' ||
      fieldName === 'quality'
    ) {
      dispatch({
        type: 'INPUT_CHANGE',
        payload: {
          name: fieldName,
          value: numericValue
        }
      });
    }

    if (fieldName === 'duration' && video) {
      const end = state.start + numericValue;
      seekTo(video, end);
    }
  }

  function handleStartChange(newStart: number) {
    dispatch({
      type: 'INPUT_CHANGE',
      payload: {
        name: 'start',
        value: newStart
      }
    });

    if (video) {
      seekTo(video, newStart);
    }
  }

  function handleLinkChange(isLinked: boolean) {
    dispatch({
      type: 'INPUT_CHANGE',
      payload: {
        name: 'linkDimensions',
        value: isLinked
      }
    });
  }

  // FIX: Changed event type from 'SubmitEvent' to React's 'FormEvent'.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(state);
  }

  // FIX: Changed event type from 'KeyboardEvent' to React's 'KeyboardEvent'.
  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    event.stopPropagation();
  }

  function handleSetStartToCurrentTimeClick() {
    if (video) {
      dispatch({
        type: 'SET_START_TO_CURRENT_TIME',
        payload: {
          currentTime: video.currentTime
        }
      });
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
          value={state.start}
          min={0}
          max={maxStart}
          onChange={handleStartChange}
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
          value={String(state.duration)}
          min={1 / state.framerate}
          max={maxDuration}
          step={1 / state.framerate}
          onChange={handleInputChange}
        />
        <InputNumber
          className={css.width}
          name="width"
          label="Width"
          type="number"
          value={String(state.width)}
          min={32}
          max={maxWidth}
          onChange={handleInputChange}
        />
        <ButtonToggle
          className={css.linkDimensions}
          name="linkDimensions"
          size="x-small"
          rounded={true}
          variant="input"
          padding="small"
          evenPadding={true}
          checked={state.linkDimensions}
          onChange={handleLinkChange}>
          {state.linkDimensions ? (
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
          value={String(state.height)}
          min={32}
          max={maxHeight}
          onChange={handleInputChange}
        />
        <InputNumber
          className={css.fps}
          name="framerate"
          label="FPS"
          type="number"
          min={1}
          max={60}
          value={String(state.framerate)}
          onChange={handleInputChange}
        />
        <Input
          className={css.quality}
          name="quality"
          label="Quality"
          type="range"
          min={1}
          max={10}
          value={String(state.quality)}
          onChange={handleInputChange}
        />
        <Button id="gifit-submit" className={css.submit} type="submit">
          GIFit!
        </Button>
      </form>
    </div>
  );
}

export default ConfigurationPanel;
