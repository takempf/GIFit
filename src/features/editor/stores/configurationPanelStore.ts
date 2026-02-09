import { create } from 'zustand';
import { log } from '@/utils/logger';
import { storedConfig } from '@/utils/storage';
import { VideoMetadata } from '@/types';
import { videoController } from '@/services/VideoController';
import { toMilliseconds, toSeconds } from '@/utils/time';

const DEFAULT_WIDTH = 420;

export interface ConfigState {
  start: number; // Milliseconds
  duration: number; // Milliseconds
  width: number;
  height: number;

  framerate: number;
  quality: number;
  aspectRatio: number;
  // Internal state
  videoDuration: number; // Milliseconds
  videoWidth: number;
  videoHeight: number;
  previewImage: string | null;
  previewTime: number; // Milliseconds
}

// Action payloads
type InputActionPayload = {
  [K in keyof Pick<
    ConfigState,
    'start' | 'duration' | 'width' | 'height' | 'framerate' | 'quality'
  >]: { name: K; value: ConfigState[K] };
}[keyof Pick<
  ConfigState,
  'start' | 'duration' | 'width' | 'height' | 'framerate' | 'quality'
>];

interface VideoLoadedDataPayload {
  aspectRatio: number;
  duration: number; // Seconds (from video metadata)
  videoWidth: number;
  videoHeight: number;
  currentTime?: number; // Seconds (from video metadata)
}

interface VideoSeekedPayload {
  currentTime: number; // Seconds
}

interface SetStartToCurrentTimePayload {
  currentTime: number; // Seconds
}

// Store actions interface
export interface ConfigActions {
  handleInputChange: (payload: InputActionPayload) => void;
  handleVideoLoadedData: (payload: VideoLoadedDataPayload) => void;
  handleVideoSeeked: (payload: VideoSeekedPayload) => void;
  handleSetStartToCurrentTime: (payload: SetStartToCurrentTimePayload) => void;
  resetState: (metadata?: VideoMetadata) => void;
  seekVideo: (timeMs: number) => Promise<void>;
  loadInitialConfig: () => Promise<void>;
  fetchVideoMetadata: () => Promise<void>;
  syncStartToVideoTime: () => Promise<void>;
  captureFrame: (timeMs?: number) => Promise<void>;
}

type ConfigurationPanelStore = ConfigState & ConfigActions;

const getInitialState = (
  metadata?: VideoMetadata,
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

  if (metadata && metadata.width > 0 && metadata.height > 0) {
    const videoActualAspectRatio = metadata.width / metadata.height;
    storedAspectRatio = videoActualAspectRatio;
    displayWidth = Math.min(metadata.width, displayWidth);
    displayHeight = Math.round(displayWidth / videoActualAspectRatio);
  } else {
    storedAspectRatio = 16 / 9;
    displayHeight = Math.round(displayWidth / storedAspectRatio);
  }

  // Final safety checks for dimensions
  if (displayWidth <= 0) {
    displayWidth = DEFAULT_WIDTH;
    displayHeight = Math.round(displayWidth / storedAspectRatio);
  }
  if (displayHeight <= 0 || isNaN(displayHeight)) {
    storedAspectRatio = 16 / 9;
    displayHeight = Math.round(displayWidth / storedAspectRatio);
  }
  if (isNaN(storedAspectRatio) || storedAspectRatio <= 0) {
    storedAspectRatio = 16 / 9;
  }

  return {
    start: metadata?.currentTime ? toMilliseconds(metadata.currentTime) : 0,
    duration: 2000, // 2000ms default
    width: displayWidth,
    height: displayHeight,

    framerate: initialFramerate,
    quality: initialQuality,
    aspectRatio: storedAspectRatio,
    videoDuration: metadata?.duration ? toMilliseconds(metadata.duration) : 0,
    videoWidth: metadata?.width ?? 0,
    videoHeight: metadata?.height ?? 0,
    previewImage: null,
    previewTime: metadata?.currentTime
      ? toMilliseconds(metadata.currentTime)
      : 0
  };
};

export const useConfigurationPanelStore = create<ConfigurationPanelStore>(
  (set, get) => ({
    ...getInitialState(undefined),

    loadInitialConfig: async () => {
      try {
        const [storedWidth, storedFps, storedQuality] = await Promise.all([
          storedConfig.width.getValue(),
          storedConfig.fps.getValue(),
          storedConfig.quality.getValue()
        ]);

        const currentMetadata: VideoMetadata | undefined =
          get().videoWidth > 0
            ? {
                width: get().videoWidth,
                height: get().videoHeight,
                duration: toSeconds(get().videoDuration),
                currentTime: toSeconds(get().start) // approximation
              }
            : undefined;

        const initialStateFromStorage = getInitialState(currentMetadata, {
          width: storedWidth,
          framerate: storedFps,
          quality: storedQuality
        });

        set(initialStateFromStorage);
      } catch (error) {
        log('Failed to load initial config from storage:', error);
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
          newState.height = Math.round(value / state.aspectRatio);
        } else if (name === 'height' && typeof value === 'number') {
          newState.width = Math.round(value * state.aspectRatio);
          storedConfig.width
            .setValue(newState.width)
            .catch((err) => log('Error saving width:', err));
        } else if (name === 'framerate' && typeof value === 'number') {
          storedConfig.fps
            .setValue(value)
            .catch((err) => log('Error saving framerate:', err));
        } else if (name === 'quality' && typeof value === 'number') {
          storedConfig.quality
            .setValue(value)
            .catch((err) => log('Error saving quality:', err));
        }

        return newState;
      }),

    handleVideoLoadedData: (payload) =>
      set((state) => ({
        ...state,
        aspectRatio: payload.aspectRatio,
        videoDuration: toMilliseconds(payload.duration),
        videoWidth: payload.videoWidth,
        videoHeight: payload.videoHeight,
        start:
          state.videoDuration === 0 && payload.currentTime !== undefined
            ? toMilliseconds(payload.currentTime)
            : state.start,
        height: Math.round(state.width / payload.aspectRatio)
      })),

    handleVideoSeeked: (_payload) => {
      // no-op
    },

    handleSetStartToCurrentTime: (payload) =>
      set({ start: toMilliseconds(payload.currentTime) }),

    seekVideo: async (timeMs) => {
      // Video controller expects seconds
      await videoController.seek(toSeconds(timeMs));
    },

    resetState: (metadata?: VideoMetadata) => {
      set(getInitialState(metadata));
      get().loadInitialConfig();
    },

    fetchVideoMetadata: async () => {
      const metadata = await videoController.getMetadata();
      if (metadata) {
        get().handleVideoLoadedData({
          aspectRatio: metadata.width / metadata.height,
          duration: metadata.duration,
          videoWidth: metadata.width,
          videoHeight: metadata.height,
          currentTime: metadata.currentTime
        });
      }
    },

    syncStartToVideoTime: async () => {
      const metadata = await videoController.getMetadata();
      if (metadata) {
        get().handleSetStartToCurrentTime({
          currentTime: metadata.currentTime // Seconds
        });
      }
    },

    captureFrame: async (timeMs?: number) => {
      const dataUrl = await videoController.captureFrame();
      if (dataUrl) {
        set((state) => ({
          previewImage: dataUrl,
          previewTime: timeMs !== undefined ? timeMs : state.previewTime
        }));
      }
    }
  })
);

// Initialize stored values
useConfigurationPanelStore.getState().loadInitialConfig();
