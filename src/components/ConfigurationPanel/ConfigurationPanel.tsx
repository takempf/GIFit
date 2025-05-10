import css from './ConfigurationPanel.module.css';

import { useEffect, useReducer } from 'react';

import { clamp } from '@/utils/clamp.js';
import { timecodeToSeconds } from '@/utils/timecodeToSeconds';
import { secondsToTimecode } from '@/utils/secondsToTimecode';

import { useAppStore } from '@/stores/appStore';

import { Input } from '../Input/Input';
import { InputNumber } from '../InputNumber/InputNumber';
import { Button } from '../Button/Button';
import { log } from '@/utils/logger';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 180;

interface ConfigState {
  start: string;
  duration: number;
  width: number;
  height: number;
  linkDimensions: boolean;
  framerate: number;
  quality: number;
  aspectRatio: number;
}

interface ConfigAction {
  type: string;
  payload: any;
}

function seekTo(videoElement: HTMLVideoElement, time: number) {
  if (typeof time !== 'number' || time < 0) {
    log(`Could not seek to ${time}`);
    return;
  }

  if (!videoElement.paused) {
    videoElement.pause();
  }

  videoElement.currentTime = clamp(0, videoElement.duration, time);
}

function getVideoAspectRatio(videoElement: HTMLVideoElement) {
  return videoElement.videoWidth / videoElement.videoHeight;
}

function reducer(state: ConfigState, action: ConfigAction) {
  switch (action.type) {
    case 'INPUT_CHANGE': {
      const newState = {
        ...state,
        [action.payload.name]: action.payload.value
      };

      // adjust other dimension if they are linked
      if (state.linkDimensions) {
        if (action.payload.name === 'width') {
          newState.height = Math.round(
            action.payload.value / state.aspectRatio
          );
        } else if (action.payload.name === 'height') {
          newState.width = Math.round(action.payload.value * state.aspectRatio);
        }
      }

      // adjust height if linkDimensions is turned on
      if (action.payload.name === 'linkDimensions' && action.payload.value) {
        newState.height = Math.round(state.width / state.aspectRatio);
      }

      return newState;
    }
    case 'VIDEO_LOADED_DATA':
    default:
      return {
        ...state
      };
  }
}

interface ConfigurationPanelProps {
  onSubmit: Function;
}

function ConfigurationPanel({ onSubmit }: ConfigurationPanelProps) {
  const video = useAppStore((state) => state.videoElement);

  const [state, dispatch] = useReducer(reducer, {
    start: secondsToTimecode(video?.currentTime ?? 0),
    duration: 1,
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

    function handleVideoLoadedData() {
      // set some default values here
      const aspectRatio = getVideoAspectRatio(video);

      dispatch({
        type: 'VIDEO_LOADED_DATA',
        payload: {
          aspectRatio
        }
      });
    }

    function handleVideoSeeked() {
      dispatch({
        type: 'INPUT_CHANGE',
        payload: {
          name: 'start',
          value: secondsToTimecode(video.currentTime)
        }
      });
    }

    video.addEventListener('loadeddata', handleVideoLoadedData);
    // video.addEventListener('seeked', handleVideoSeeked);

    return () => {
      video.removeEventListener('loadeddata', handleVideoLoadedData);
      // video.removeEventListener('seeked', handleVideoSeeked);
    };
  }, [video]);

  function handleInputChange(event: InputEvent) {
    if (!event.target) {
      return;
    }

    const inputElement = event.target as HTMLInputElement;
    const fieldName = inputElement.name;
    const newValue =
      inputElement.type === 'checkbox'
        ? inputElement.checked
        : inputElement.value;

    dispatch({
      type: 'INPUT_CHANGE',
      payload: {
        name: fieldName,
        value: newValue
      }
    });

    // If we're changing the start, show that in the video
    if (fieldName === 'start' && newValue && video) {
      seekTo(video, timecodeToSeconds(newValue as string));
    }

    // if we're changing the duration, seek to it
    if (fieldName === 'duration' && newValue && video) {
      const start = timecodeToSeconds(state.start as string);
      const duration = Number(newValue);
      const end = start + duration;
      seekTo(video, end);
    }

    // TODO If start time is greater than end time, adjust
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onSubmit(state);
  }

  function handleKeyDown(event: KeyboardEvent) {
    event.stopPropagation();
  }

  return (
    <div className={css.gifitConfiguration}>
      <form
        className={css.form}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}>
        <Input
          className={css.start}
          name="start"
          label="Start"
          value={state.start}
          onChange={handleInputChange}
        />
        <InputNumber
          className={css.duration}
          name="duration"
          label="Duration"
          type="number"
          value={state.duration}
          step={1 / state.framerate}
          onChange={handleInputChange}
        />
        <InputNumber
          className={css.width}
          name="width"
          label="Width"
          type="number"
          value={state.width}
          onChange={handleInputChange}
        />
        <input
          className={css.widthHeightLink}
          name="linkDimensions"
          type="checkbox"
          checked={state.linkDimensions}
          onChange={handleInputChange}
        />
        <InputNumber
          className={css.height}
          name="height"
          label="Height"
          type="number"
          value={state.height}
          onChange={handleInputChange}
        />
        <InputNumber
          className={css.fps}
          name="framerate"
          label="FPS"
          type="number"
          min={1}
          max={60}
          value={state.framerate}
          onChange={handleInputChange}
        />
        <Input
          className={css.quality}
          name="quality"
          label="Quality"
          type="range"
          min={1}
          max={10}
          value={state.quality}
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
