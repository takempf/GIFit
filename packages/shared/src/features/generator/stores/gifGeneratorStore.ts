import { create } from 'zustand';
import { browser } from 'wxt/browser';
import {
  GifConfig,
  GifCompleteData,
  GifStatus,
  ExtensionMessage
} from '@shared/types';

async function sendMessageToActiveTab(message: ExtensionMessage) {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTabId = tabs[0]?.id;
  if (activeTabId) {
    await browser.tabs.sendMessage(activeTabId, message);
  }
}

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
  // Actions called by message listeners
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

export const useGifStore = create<GifStore>((set) => ({
  ...initialState,

  async createGif(config) {
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

    try {
      await sendMessageToActiveTab({
        type: 'START_GIF',
        config
      });
    } catch (e) {
      console.error('Failed to send START_GIF message', e);
      set({
        status: 'error',
        error: 'Failed to start GIF generation. Is the content script active?'
      });
    }
  },

  async abortGif() {
    set({ status: 'aborted' });
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      const activeTabId = tabs[0]?.id;
      if (activeTabId) {
        await browser.tabs.sendMessage(activeTabId, { type: 'STOP_GIF' });
      }
    } catch (e) {
      console.error(e);
    }
  },

  async reset() {
    // If we are processing, we should abort first
    // usage of get() here would be cleaner but let's just assume abort if processing
    // actually, let's just send stop to be safe if we are resetting
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      const activeTabId = tabs[0]?.id;
      if (activeTabId) {
        await browser.tabs.sendMessage(activeTabId, { type: 'STOP_GIF' });
      }
    } catch {}
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
      // Only update currentFrame when a new frame is provided
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
