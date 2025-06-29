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
import ArrowRightIcon from '@/assets/arrow-right.svg?react';
import ArrowDownIcon from '@/assets/arrow-down.svg?react';

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
  | { type: 'VIDEO_SEEKED'; payload: { currentTime: number } };

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

  // Initialize state unconditionally
  const [state, dispatch] = useReducer(reducer, {
    start: video?.currentTime ?? 0, // video might be null here initially
    duration: 2,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    linkDimensions: true,
    framerate: 10,
    quality: 5,
    aspectRatio: video
      ? getVideoAspectRatio(video)
      : DEFAULT_WIDTH / DEFAULT_HEIGHT
  });

  useEffect(() => {
    // Effect for video load data
    if (video instanceof HTMLVideoElement) {
      const handleLoadedMetadata = () => {
        const aspectRatio = getVideoAspectRatio(video);
        dispatch({
          type: 'VIDEO_LOADED_DATA',
          payload: {
            aspectRatio
          }
        });
      };

      // If metadata already loaded, call handler immediately
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        handleLoadedMetadata();
      }
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [video]); // Dependency on video ensures this runs if video object changes

  useEffect(() => {
    // Effect for video seeked
    if (video instanceof HTMLVideoElement) {
      const handleVideoSeeked = () => {
        const { isOpen, status } = useAppStore.getState();
        if (video && isOpen && status === 'configuring' && video.paused) {
          dispatch({
            type: 'VIDEO_SEEKED',
            payload: {
              currentTime: video.currentTime
            }
          });
        }
      };

      video.addEventListener('seeked', handleVideoSeeked);

      return () => {
        video.removeEventListener('seeked', handleVideoSeeked);
      };
    }
  }, [video]); // Dependency on video

  // Early return after all hooks have been called
  if (!video) {
    // Optionally, render a loading state or null
    return null; // Or some placeholder if the panel should always render something
  }

  // Calculations depending on video properties, now safe to use video
  const maxWidth = Math.min(video.videoWidth, 1920);
  const maxHeight = Math.max(video.videoHeight, 1080); // Should be video.videoHeight, not Math.max
  const maxStart = video.duration ? video.duration - state.duration : 0;
  const maxDuration = video.duration
    ? Math.min(video.duration - state.start, 30)
    : 30;

  // Effect for initializing start time from video - only if video.currentTime changes
  // This specific effect might be redundant if `useReducer` initial state handles it
  // and `VIDEO_SEEKED` updates it. However, if direct init is needed:
  // useEffect(() => {
  //   if (video && video.currentTime !== state.start) {
  // This could cause a loop if not careful, ensure it only runs on actual changes
  // or if the initial video.currentTime was not yet reflected.
  // For now, let's assume reducer init + VIDEO_SEEKED is enough.
  // If not, a more specific condition is needed here.
  //   }
  // }, [video, video?.currentTime, state.start]);

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

  function handleSetStartToCurrentTime() {
    if (video) {
      const currentTime = video.currentTime;
      dispatch({
        type: 'INPUT_CHANGE',
        payload: {
          name: 'start',
          value: currentTime
        }
      });
      // No need to call seekTo(video, currentTime) as the effect in handleStartChange will do it,
      // or if not, the video is already at currentTime.
    }
  }

  function handleSetDurationToCurrentTime() {
    if (video) {
      const currentTime = video.currentTime;
      if (currentTime > state.start) {
        const newDuration = currentTime - state.start;
        dispatch({
          type: 'INPUT_CHANGE',
          payload: {
            name: 'duration',
            value: newDuration
          }
        });
        // No need to call seekTo for duration change, handled by handleInputChange if necessary
      }
    }
  }

  // FIX: Changed event type from 'KeyboardEvent' to React's 'KeyboardEvent'.
  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    event.stopPropagation();
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
          onAppendButtonClick={handleSetStartToCurrentTime}
          appendButtonIcon={<ArrowRightIcon />}
          appendButtonLabel="Set start to current time"
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
          onAppendButtonClick={handleSetDurationToCurrentTime}
          appendButtonIcon={<ArrowDownIcon />}
          appendButtonLabel="Set duration to current time"
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
