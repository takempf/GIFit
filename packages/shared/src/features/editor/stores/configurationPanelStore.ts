import { create } from 'zustand';
import { createLogger } from '@shared/utils/logger';
import { storageAdapter } from '@shared/utils/storage';
import { VideoMetadata } from '@shared/types';
import { videoController } from '@shared/services/VideoController';
import { toMilliseconds, toSeconds } from '@shared/utils/time';

const DEFAULT_WIDTH = 420;
const logger = createLogger('ConfigurationPanel');

export interface ConfigState {
  start: number; // Milliseconds
  duration: number; // Milliseconds
  width: number;
  height: number;

  framerate: number;
  quality: number;
  aspectRatio: number;
  // Crop state (source-video pixel space)
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
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

interface CropChangePayload {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

// Store actions interface
export interface ConfigActions {
  handleInputChange: (payload: InputActionPayload) => void;
  handleCropChange: (payload: CropChangePayload) => void;
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

export type ConfigurationPanelStore = ConfigState & ConfigActions;

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
    cropX: 0,
    cropY: 0,
    cropW: metadata?.width ?? 0,
    cropH: metadata?.height ?? 0,
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
          storageAdapter.getWidth(),
          storageAdapter.getFps(),
          storageAdapter.getQuality()
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
        logger.log('Failed to load initial config from storage:', error);
      }
    },

    handleInputChange: (payload) =>
      set((state) => {
        const { name, value } = payload;
        const newState = { ...state, [name]: value };

        if (name === 'width' && typeof value === 'number') {
          newState.height = Math.round(value / state.aspectRatio);
        } else if (name === 'height' && typeof value === 'number') {
          newState.width = Math.round(value * state.aspectRatio);
        }

        return newState;
      }),

    handleCropChange: (payload) =>
      set((state) => {
        const MIN_CROP = 32;
        const cropX = Math.max(0, Math.min(payload.cropX, state.videoWidth - MIN_CROP));
        const cropY = Math.max(0, Math.min(payload.cropY, state.videoHeight - MIN_CROP));
        const cropW = Math.max(MIN_CROP, Math.min(payload.cropW, state.videoWidth - cropX));
        const cropH = Math.max(MIN_CROP, Math.min(payload.cropH, state.videoHeight - cropY));

        const newAspectRatio = cropW / cropH;
        const newHeight = Math.round(state.width / newAspectRatio);

        return {
          ...state,
          cropX,
          cropY,
          cropW,
          cropH,
          aspectRatio: newAspectRatio,
          height: newHeight
        };
      }),

    handleVideoLoadedData: (payload) =>
      set((state) => {
        // Only reset crop to full frame on first load or when the video changes.
        // If crop is already set within this video's bounds, preserve it.
        const videoChanged =
          state.videoWidth !== payload.videoWidth ||
          state.videoHeight !== payload.videoHeight;
        const hasCrop = state.cropW > 0 && state.cropH > 0;

        const cropX = videoChanged || !hasCrop ? 0 : state.cropX;
        const cropY = videoChanged || !hasCrop ? 0 : state.cropY;
        const cropW = videoChanged || !hasCrop ? payload.videoWidth : state.cropW;
        const cropH = videoChanged || !hasCrop ? payload.videoHeight : state.cropH;

        const effectiveAspectRatio = cropW / cropH;
        const newWidth = Math.min(state.width, payload.videoWidth);
        const newHeight = Math.round(newWidth / effectiveAspectRatio);

        return {
          ...state,
          aspectRatio: effectiveAspectRatio,
          videoDuration: toMilliseconds(payload.duration),
          videoWidth: payload.videoWidth,
          videoHeight: payload.videoHeight,
          width: newWidth,
          height: newHeight,
          cropX,
          cropY,
          cropW,
          cropH,
          start:
            state.videoDuration === 0 && payload.currentTime !== undefined
              ? toMilliseconds(payload.currentTime)
              : state.start
        };
      }),

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
