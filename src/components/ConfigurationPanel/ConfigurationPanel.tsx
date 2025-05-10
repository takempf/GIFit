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

import LinkIcon from '@/assets/link.svg';
import LinkEmptyIcon from '@/assets/link-empty.svg';

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

    case 'VIDEO_LOADED_DATA': {
      return {
        ...state,
        aspectRatio: action.payload.aspectRatio,
        height: Math.round(state.width / action.payload.aspectRatio)
      };
    }

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
    start: video?.currentTime ?? 0,
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

    function handleLoadedMetadata() {
      // set some default values here
      const aspectRatio = getVideoAspectRatio(video);

      dispatch({
        type: 'VIDEO_LOADED_DATA',
        payload: {
          aspectRatio
        }
      });
    }

    // ensure that this fires at least once
    handleLoadedMetadata();

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
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

    // if we're changing the duration, seek to it
    if (fieldName === 'duration' && newValue && video) {
      const duration = Number(newValue);
      const end = state.start + duration;
      seekTo(video, end);
    }

    // TODO If start time is greater than end time, adjust
  }

  function handleStartChange(newStart) {
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

  function handleLinkChange(isLinked) {
    console.log('isLinked', isLinked);
    dispatch({
      type: 'INPUT_CHANGE',
      payload: {
        name: 'linkDimensions',
        value: isLinked
      }
    });
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
        <InputTime
          className={css.start}
          name="start"
          label="Start"
          value={state.start}
          onChange={handleStartChange}
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
        <ButtonToggle
          className={css.linkDimensions}
          name="linkDimensions"
          label="Link width and height"
          size="x-small"
          rounded={true}
          variant="secondary"
          padding="small"
          evenPadding={true}
          value={state.linkDimensions}
          onChange={handleLinkChange}>
          {state.linkDimensions ? (
            <img className={css.linkIcon} src={LinkIcon} />
          ) : (
            <img className={css.linkIcon} src={LinkEmptyIcon} />
          )}
        </ButtonToggle>
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
