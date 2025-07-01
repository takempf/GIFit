import { create } from 'zustand';
import { clamp } from '@/utils/clamp';
import { log } from '@/utils/logger';
import { useAppStore } from './appStore';

const DEFAULT_WIDTH = 420; // Updated default width
const DEFAULT_HEIGHT = 180; // Will be adjusted or its usage re-evaluated in getInitialState

export interface ConfigState {
  start: number;
  duration: number;
  width: number;
  height: number;
  linkDimensions: boolean;
  framerate: number;
  quality: number;
  aspectRatio: number;
  // Internal state, not directly user-configurable but affected by video loading
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
}

// Action payloads
type InputActionPayload = {
  [K in keyof Pick<
    ConfigState,
    | 'start'
    | 'duration'
    | 'width'
    | 'height'
    | 'linkDimensions'
    | 'framerate'
    | 'quality'
  >]: { name: K; value: ConfigState[K] };
}[keyof Pick<
  ConfigState,
  | 'start'
  | 'duration'
  | 'width'
  | 'height'
  | 'linkDimensions'
  | 'framerate'
  | 'quality'
>];

interface VideoLoadedDataPayload {
  aspectRatio: number;
  duration: number;
  videoWidth: number;
  videoHeight: number;
}

interface VideoSeekedPayload {
  currentTime: number;
}

interface SetStartToCurrentTimePayload {
  currentTime: number;
}

// Store actions interface
export interface ConfigActions {
  handleInputChange: (payload: InputActionPayload) => void;
  handleVideoLoadedData: (payload: VideoLoadedDataPayload) => void;
  handleVideoSeeked: (payload: VideoSeekedPayload) => void; // Kept for potential future use, though not directly changing state in this version
  handleSetStartToCurrentTime: (payload: SetStartToCurrentTimePayload) => void;
  resetState: (videoElement?: HTMLVideoElement) => void;
  // New action to handle seeking, as this involves an external element
  seekVideo: (time: number) => void;
}

type ConfigurationPanelStore = ConfigState & ConfigActions;

const getInitialState = (videoElement?: HTMLVideoElement): ConfigState => {
  let displayWidth: number;
  let displayHeight: number;
  let storedAspectRatio: number;

  if (
    videoElement &&
    videoElement.videoWidth > 0 &&
    videoElement.videoHeight > 0
  ) {
    const videoActualAspectRatio =
      videoElement.videoWidth / videoElement.videoHeight;
    storedAspectRatio = videoActualAspectRatio; // Store the true aspect ratio of the video

    // Cap the display width at DEFAULT_WIDTH, but use video's width if smaller
    displayWidth = Math.min(videoElement.videoWidth, DEFAULT_WIDTH);
    displayHeight = Math.round(displayWidth / videoActualAspectRatio);
  } else {
    // No video or video dimensions are invalid
    displayWidth = DEFAULT_WIDTH; // Use the default width (420)
    storedAspectRatio = 16 / 9; // Default aspect ratio for calculation and storage
    displayHeight = Math.round(displayWidth / storedAspectRatio);
  }

  // Final safety checks for dimensions
  if (displayWidth <= 0) {
    // Should not happen if DEFAULT_WIDTH is > 0
    displayWidth = DEFAULT_WIDTH;
  }
  if (displayHeight <= 0 || isNaN(displayHeight)) {
    // Recalculate height with default aspect ratio if something went wrong
    storedAspectRatio = 16 / 9;
    displayHeight = Math.round(displayWidth / storedAspectRatio);
  }
  if (isNaN(storedAspectRatio) || storedAspectRatio <= 0) {
    storedAspectRatio = 16 / 9; // Final fallback for stored aspect ratio
  }

  return {
    start: videoElement?.currentTime ?? 0,
    duration: 2,
    width: displayWidth,
    height: displayHeight,
    linkDimensions: true,
    framerate: 10,
    quality: 5,
    aspectRatio: storedAspectRatio, // This is used for linking dimensions later
    videoDuration: videoElement?.duration ?? 0,
    videoWidth: videoElement?.videoWidth ?? 0,
    videoHeight: videoElement?.videoHeight ?? 0
  };
};

export const useConfigurationPanelStore = create<ConfigurationPanelStore>(
  (set, _get) => ({
    // Changed get to _get
    ...getInitialState(useAppStore.getState().videoElement ?? undefined),

    handleInputChange: (payload) =>
      set((state) => {
        const { name, value } = payload;
        const newState = { ...state, [name]: value };

        if (state.linkDimensions) {
          if (name === 'width') {
            newState.height = Math.round((value as number) / state.aspectRatio);
          } else if (name === 'height') {
            newState.width = Math.round((value as number) * state.aspectRatio);
          }
        }

        if (name === 'linkDimensions' && value) {
          newState.height = Math.round(state.width / state.aspectRatio);
        }
        return newState;
      }),

    handleVideoLoadedData: (payload) =>
      set((state) => ({
        ...state,
        aspectRatio: payload.aspectRatio,
        videoDuration: payload.duration,
        videoWidth: payload.videoWidth,
        videoHeight: payload.videoHeight,
        // Recalculate height based on new aspect ratio if dimensions were default or linked
        height:
          state.linkDimensions || state.height === DEFAULT_HEIGHT
            ? Math.round(state.width / payload.aspectRatio)
            : state.height
      })),

    handleVideoSeeked: (_payload) => {
      // This action might not directly change state if it's just for observation
      // or triggering other effects. For now, it does nothing to the store state.
      // log('Video seeked, current time:', payload.currentTime);
    },

    handleSetStartToCurrentTime: (payload) =>
      set({ start: payload.currentTime }),

    seekVideo: (time) => {
      const videoElement = useAppStore.getState().videoElement;
      if (videoElement) {
        if (typeof time !== 'number' || time < 0 || isNaN(time)) {
          log(`Could not seek to ${time}`);
          return;
        }
        videoElement.currentTime = clamp(0, videoElement.duration, time);
        videoElement.pause();
      }
    },

    resetState: (videoElement?: HTMLVideoElement) => {
      const newInitialState = getInitialState(
        videoElement ?? useAppStore.getState().videoElement ?? undefined
      );
      set(newInitialState);
    }
  })
);

// Subscribe to videoElement changes in appStore to reset/update config panel state
useAppStore.subscribe((state, prevState) => {
  if (state.videoElement !== prevState.videoElement) {
    useConfigurationPanelStore
      .getState()
      .resetState(state.videoElement ?? undefined);
  }
});
