import { create } from 'zustand';
import {
  GifConfig,
  GifCompleteData,
  GifStatus,
} from '@/types';
import type { GifAdapter } from '@/adapters/types';

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
}

interface GifActions {
  createGif: (config: GifConfig) => Promise<void>;
  abortGif: () => void;
  reset: () => void;
  setName: (name: string) => void;
  // Actions called by message listeners / adapter callbacks
  updateProgress: (
    progress: number,
    frameCount: number,
    frame?: string
  ) => void;
  complete: (data: GifCompleteData) => void;
  setError: (error: string) => void;
}

type GifStore = GifState & GifActions;

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
  currentFrame: null
};

/**
 * Factory function that creates the GIF generator store
 * with an injectable GIF adapter.
 */
export function createGifStore(gifAdapter: GifAdapter) {
  return create<GifStore>((set) => ({
    ...initialState,

    async createGif(config) {
      set({
        ...initialState,
        frameCount: Math.floor((config.fps * (config.end - config.start)) / 1000),
        name: config.name,
        width: config.width,
        height: config.height,
        generationId: Date.now().toString(),
        status: 'processing'
      });

      try {
        await gifAdapter.createGif(config);
      } catch (e) {
        console.error('Failed to start GIF generation', e);
        set({
          status: 'error',
          error: 'Failed to start GIF generation.'
        });
      }
    },

    abortGif() {
      set({ status: 'aborted' });
      gifAdapter.abortGif();
    },

    reset() {
      gifAdapter.reset();
      set(initialState);
    },

    setName(name: string) {
      set({ name });
    },

    updateProgress(progress, frameCount, frame) {
      set((state) => ({
        status: 'processing',
        progress,
        processedFrameCount: frameCount,
        currentFrame: frame ?? state.currentFrame
      }));
    },

    complete(data) {
      set({ status: 'complete', result: data });
    },

    setError(error) {
      set({ status: 'error', error });
    }
  }));
}

export type GifStoreApi = ReturnType<typeof createGifStore>;
