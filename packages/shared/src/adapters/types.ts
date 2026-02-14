import { GifConfig, GifCompleteData, VideoMetadata } from '@shared/types';

/**
 * Abstraction over video control operations.
 * Extension: sends messages to content script via browser.tabs.sendMessage
 * Demo: operates directly on a <video> element
 */
export interface VideoAdapter {
  seek(timeSeconds: number): Promise<void>;
  pause(): Promise<void>;
  getMetadata(): Promise<VideoMetadata | null>;
  captureFrame(): Promise<string | null>;
  // New method for storyboard support
  getStoryboardSpec?(): Promise<unknown>;
}

/**
 * Abstraction over GIF generation orchestration.
 * Extension: sends START_GIF/STOP_GIF messages to content script
 * Demo: runs GifService directly in-page
 */
export interface GifAdapter {
  createGif(config: GifConfig): Promise<void>;
  abortGif(): void;
  reset(): void;
  setCallbacks(callbacks: GifProgressCallbacks): void;
  destroy?(): void;
}

/**
 * Abstraction over persisted config storage.
 * Extension: uses wxt/utils/storage (browser.storage.local)
 * Demo: uses in-memory defaults
 */
export interface StorageAdapter {
  getWidth(): Promise<number | null>;
  setWidth(value: number): Promise<void>;
  getFps(): Promise<number | null>;
  setFps(value: number): Promise<void>;
  getQuality(): Promise<number | null>;
  setQuality(value: number): Promise<void>;
}

/**
 * Callback interface for GIF generation progress updates.
 * Both adapters use this to communicate back to the store.
 */
export interface GifProgressCallbacks {
  onProgress: (
    progress: number,
    frameCount: number,
    frameDataUrl?: string
  ) => void;
  onComplete: (data: GifCompleteData) => void;
  onError: (error: string) => void;
}
