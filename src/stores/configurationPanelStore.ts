import { create } from 'zustand';
import { clamp } from '@/utils/clamp';
import { log } from '@/utils/logger';
import { useAppStore } from './appStore';
import { storedConfig } from '@/utils/storage';

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
  loadInitialConfig: () => Promise<void>; // Action to load config from storage
}

type ConfigurationPanelStore = ConfigState & ConfigActions;

const getInitialState = (
  videoElement?: HTMLVideoElement,
  loadedConfig?: {
    width?: number | null;
    framerate?: number | null;
    quality?: number | null;
  }
): ConfigState => {
  let displayWidth: number = loadedConfig?.width ?? DEFAULT_WIDTH;
  const initialFramerate = loadedConfig?.framerate ?? 10;
  const initialQuality = loadedConfig?.quality ?? 5;
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

    // Cap the display width at the resolved displayWidth (either from storage or default),
    // but use video's actual width if it's smaller than this resolved width.
    // This ensures the initial display isn't wider than the video itself if the video is very small.
    displayWidth = Math.min(videoElement.videoWidth, displayWidth);
    storedAspectRatio = videoActualAspectRatio; // Store the true aspect ratio of the video
    displayHeight = Math.round(displayWidth / videoActualAspectRatio);
  } else {
    // No video or video dimensions are invalid, or loadedConfig.width was used
    storedAspectRatio = 16 / 9; // Default aspect ratio for calculation and storage
    displayHeight = Math.round(displayWidth / storedAspectRatio);
  }

  // Final safety checks for dimensions
  // Ensure displayWidth has a sensible minimum if it ended up being zero or less from videoElement.videoWidth
  if (displayWidth <= 0) {
    displayWidth = DEFAULT_WIDTH; // Fallback to default width
    // Recalculate height if width changed, using the current storedAspectRatio
    displayHeight = Math.round(displayWidth / storedAspectRatio);
  }

  if (displayHeight <= 0 || isNaN(displayHeight)) {
    // Recalculate height with default aspect ratio if something went wrong
    // This might happen if storedAspectRatio was somehow invalid (e.g. 0 or NaN)
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
    framerate: initialFramerate,
    quality: initialQuality,
    aspectRatio: storedAspectRatio, // This is used for linking dimensions later
    videoDuration: videoElement?.duration ?? 0,
    videoWidth: videoElement?.videoWidth ?? 0,
    videoHeight: videoElement?.videoHeight ?? 0
  };
};

export const useConfigurationPanelStore = create<ConfigurationPanelStore>(
  (set, get) => ({
    ...getInitialState(useAppStore.getState().videoElement ?? undefined),

    loadInitialConfig: async () => {
      try {
        const [storedWidth, storedFps, storedQuality] = await Promise.all([
          storedConfig.width.getValue(),
          storedConfig.fps.getValue(),
          storedConfig.quality.getValue()
        ]);

        const videoElement = useAppStore.getState().videoElement ?? undefined;
        // Pass the loaded config to getInitialState to re-calculate dependent values like height
        const initialStateFromStorage = getInitialState(videoElement, {
          width: storedWidth,
          framerate: storedFps,
          quality: storedQuality
        });

        set(initialStateFromStorage);
      } catch (error) {
        log('Failed to load initial config from storage:', error);
        // State will remain as per synchronous getInitialState defaults
      }
    },

    handleInputChange: (payload) =>
      set((state) => {
        const { name, value } = payload;
        const newState = { ...state, [name]: value };

        // Persist relevant changes to storage
        if (name === 'width' && typeof value === 'number') {
          storedConfig.width
            .setValue(value)
            .catch((err) => log('Error saving width:', err));
          if (state.linkDimensions) {
            newState.height = Math.round(value / state.aspectRatio);
          }
        } else if (name === 'height' && typeof value === 'number') {
          if (state.linkDimensions) {
            newState.width = Math.round(value * state.aspectRatio);
            // Persist the auto-calculated width if height change caused it
            storedConfig.width
              .setValue(newState.width)
              .catch((err) => log('Error saving width:', err));
          }
        } else if (name === 'framerate' && typeof value === 'number') {
          storedConfig.fps
            .setValue(value)
            .catch((err) => log('Error saving framerate:', err));
        } else if (name === 'quality' && typeof value === 'number') {
          storedConfig.quality
            .setValue(value)
            .catch((err) => log('Error saving quality:', err));
        }

        // Handle linked dimensions specifically for width/height and linkDimensions toggle
        if (state.linkDimensions && name !== 'width' && name !== 'height') {
          // if linkDimensions is true, and we are not already handling width/height
          // this case is already handled above for width/height changes
        } else if (name === 'linkDimensions' && value) {
          // if linkDimensions was just toggled to true
          newState.height = Math.round(newState.width / newState.aspectRatio);
        }
        // No specific action needed if linkDimensions is toggled false, dimensions remain as they are.

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
      // When resetting, we should re-load from storage or use defaults,
      // similar to initial load.
      const currentVideoElement =
        videoElement ?? useAppStore.getState().videoElement ?? undefined;
      // Set to defaults first
      set(getInitialState(currentVideoElement));
      // Then try to load from storage
      get().loadInitialConfig();
    }
  })
);

// Subscribe to videoElement changes in appStore to reset/update config panel state
// and load initial config when the store is first initialized.
useAppStore.subscribe((state, prevState) => {
  if (state.videoElement !== prevState.videoElement) {
    useConfigurationPanelStore
      .getState()
      .resetState(state.videoElement ?? undefined);
  }
});

// Initialize stored values when the store is created
// This ensures that stored values are loaded as soon as the app starts
useConfigurationPanelStore.getState().loadInitialConfig();
