import { create } from 'zustand';
import { GifConfig, GifCompleteData, GifStatus } from '@shared/types';

interface GifState {
  status: GifStatus;
  name: string;
  width: number;
  height: number;
  progress: number; // 0 to 1
  frameCount: number;
  processedFrameCount: number;
  error: string | null;
  result: GifCompleteData | null;
  generationId: string | null;
  currentFrame: string | null;
  stage: string | null;
}

interface GifActions {
  createGif: (config: GifConfig) => void;
  abortGif: () => void;
  reset: () => void;
  setName: (name: string) => void;
  // Actions called by message listeners (via adapters)
  updateProgress: (
    progress: number,
    frameCount: number,
    frame?: string,
    stage?: string
  ) => void;
  complete: (data: GifCompleteData) => void;
  setError: (error: string) => void;
}

export type GifStore = GifState & GifActions;

const initialState: GifState = {
  status: 'idle',
  name: 'untitled',
  width: 320,
  height: 240,
  progress: 0,
  frameCount: 0,
  processedFrameCount: 0,
  error: null,
  result: null,
  generationId: null,
  currentFrame: null,
  stage: null
};

export const useGifStore = create<GifStore>((set) => ({
  ...initialState,

  createGif(config) {
    // Reset state for a new creation process
    set({
      ...initialState,
      frameCount: Math.floor((config.fps * (config.end - config.start)) / 1000),
      name: config.name,
      width: config.width,
      height: config.height,
      generationId: Date.now().toString(),
      status: 'processing'
    });
  },

  abortGif() {
    set({ status: 'aborted' });
  },

  reset() {
    set(initialState);
  },

  setName(name: string) {
    set({ name });
  },

  updateProgress(progress, frameCount, frame, stage) {
    set((state) => ({
      status: 'processing',
      progress,
      processedFrameCount: frameCount,
      // Only update currentFrame when a new frame is provided
      currentFrame: frame ?? state.currentFrame,
      stage: stage ?? state.stage
    }));
  },

  complete(data) {
    set({ status: 'complete', result: data });
  },

  setError(error) {
    set({ status: 'error', error });
  }
}));
