import { create } from 'zustand';
import { log } from '@/utils/logger';
import { storedConfig } from '@/utils/storage';
import { VideoMetadata } from '@/types';
import { browser } from 'wxt/browser';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 180;

export interface ConfigState {
  start: number;
  duration: number;
  width: number;
  height: number;
  linkDimensions: boolean;
  framerate: number;
  quality: number;
  aspectRatio: number;
  // Internal state
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
  handleVideoSeeked: (payload: VideoSeekedPayload) => void;
  handleSetStartToCurrentTime: (payload: SetStartToCurrentTimePayload) => void;
  resetState: (metadata?: VideoMetadata) => void;
  seekVideo: (time: number) => void;
  loadInitialConfig: () => Promise<void>;
  fetchVideoMetadata: () => Promise<void>;
  syncStartToVideoTime: () => Promise<void>;
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
    start: metadata?.currentTime ?? 0,
    duration: 2,
    width: displayWidth,
    height: displayHeight,
    linkDimensions: true,
    framerate: initialFramerate,
    quality: initialQuality,
    aspectRatio: storedAspectRatio,
    videoDuration: metadata?.duration ?? 0,
    videoWidth: metadata?.width ?? 0,
    videoHeight: metadata?.height ?? 0
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
                duration: get().videoDuration,
                currentTime: get().start // approximation
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
          if (state.linkDimensions) {
            newState.height = Math.round(value / state.aspectRatio);
          }
        } else if (name === 'height' && typeof value === 'number') {
          if (state.linkDimensions) {
            newState.width = Math.round(value * state.aspectRatio);
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

        if (state.linkDimensions && name !== 'width' && name !== 'height') {
          // do nothing
        } else if (name === 'linkDimensions' && value) {
          newState.height = Math.round(newState.width / newState.aspectRatio);
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
        height:
          state.linkDimensions || state.height === DEFAULT_HEIGHT
            ? Math.round(state.width / payload.aspectRatio)
            : state.height
      })),

    handleVideoSeeked: (_payload) => {
      // no-op
    },

    handleSetStartToCurrentTime: (payload) =>
      set({ start: payload.currentTime }),

    seekVideo: async (time) => {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      const id = tabs[0]?.id;
      if (id) {
        browser.tabs
          .sendMessage(id, { type: 'SEEK_VIDEO', time })
          .catch(() => {});
      }
    },

    resetState: (metadata?: VideoMetadata) => {
      set(getInitialState(metadata));
      get().loadInitialConfig();
    },

    fetchVideoMetadata: async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true
        });
        const id = tabs[0]?.id;
        if (id) {
          const metadata = (await browser.tabs.sendMessage(id, {
            type: 'GET_VIDEO_METADATA'
          })) as VideoMetadata | null;

          if (metadata) {
            get().handleVideoLoadedData({
              aspectRatio: metadata.width / metadata.height,
              duration: metadata.duration,
              videoWidth: metadata.width,
              videoHeight: metadata.height
            });
          }
        }
      } catch {
        // Likely no content script or video found yet
      }
    },

    syncStartToVideoTime: async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true
        });
        const id = tabs[0]?.id;
        if (id) {
          const metadata = (await browser.tabs.sendMessage(id, {
            type: 'GET_VIDEO_METADATA'
          })) as VideoMetadata | null;

          if (metadata) {
            get().handleSetStartToCurrentTime({
              currentTime: metadata.currentTime
            });
          }
        }
      } catch {
        // ignore
      }
    }
  })
);

// Initialize stored values
useConfigurationPanelStore.getState().loadInitialConfig();
