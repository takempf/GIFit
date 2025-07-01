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
  let aspectRatio;
  let initialWidth = DEFAULT_WIDTH; // Start with the new default width
  let initialHeight;

  if (
    videoElement &&
    videoElement.videoWidth > 0 &&
    videoElement.videoHeight > 0
  ) {
    aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    // Use video's width if available and sensible, otherwise stick to default.
    // This logic can be refined, e.g. if video is very small, maybe still use DEFAULT_WIDTH.
    // For now, let's assume we prefer video's width if it's loaded.
    initialWidth = videoElement.videoWidth;
    initialHeight = Math.round(initialWidth / aspectRatio);
  } else {
    // No video or video dimensions are invalid, use default 16:9 aspect ratio for calculation
    aspectRatio = 16 / 9;
    initialHeight = Math.round(initialWidth / aspectRatio);
  }

  // Ensure initialWidth isn't zero if somehow videoElement had zero width
  if (initialWidth === 0) initialWidth = DEFAULT_WIDTH;
  if (initialHeight === 0 || isNaN(initialHeight)) {
    // Fallback if aspect ratio calculation led to issues (e.g. aspectRatio was 0 or NaN)
    aspectRatio = 16 / 9; // re-default
    initialHeight = Math.round(initialWidth / aspectRatio);
  }

  return {
    start: videoElement?.currentTime ?? 0,
    duration: 2,
    width: initialWidth,
    height: initialHeight,
    linkDimensions: true,
    framerate: 10,
    quality: 5,
    aspectRatio: isNaN(aspectRatio) ? 16 / 9 : aspectRatio, // Fallback aspect ratio
    videoDuration: videoElement?.duration ?? 0,
    videoWidth: videoElement?.videoWidth ?? 0, // Store actual video dimensions if available
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
