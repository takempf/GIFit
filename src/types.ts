export interface GifConfig {
  name: string;
  quality: number; // 1 (lowest) - 10 (highest)
  width: number;
  height: number;
  start: number; // ms
  end: number; // ms
  fps: number;
  maxColors?: number; // 2 - 256
  noDither?: boolean;
}

export interface GifCompleteData {
  dataUrl: string;
  width: number;
  height: number;
}

export type GifStatus =
  | 'idle' // Not doing anything
  | 'processing' // Actively creating the GIF
  | 'complete' // GIF creation finished successfully
  | 'error' // An error occurred
  | 'aborted'; // User cancelled the process

// --- Message Types ---

export interface MsgStartGif {
  type: 'START_GIF';
  config: GifConfig;
}

export interface MsgStopGif {
  type: 'STOP_GIF';
}

export interface MsgGetStatus {
  type: 'GET_STATUS';
}

export interface MsgGifProgress {
  type: 'GIF_PROGRESS';
  progress: number;
  frameCount: number;
  frameDataUrl?: string;
}

export interface MsgGifComplete {
  type: 'GIF_COMPLETE';
  data: GifCompleteData;
}

export interface MsgGetVideoMetadata {
  type: 'GET_VIDEO_METADATA';
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  currentTime: number;
}

export interface MsgVideoMetadata {
  type: 'VIDEO_METADATA';
  metadata: VideoMetadata;
}

export interface MsgSeekVideo {
  type: 'SEEK_VIDEO';
  time: number;
}

export interface MsgGifError {
  type: 'GIF_ERROR';
  error: string;
}

export interface MsgPauseVideo {
  type: 'PAUSE_VIDEO';
}

export interface MsgCaptureVisibleFrame {
  type: 'CAPTURE_VISIBLE_FRAME';
}

export type ExtensionMessage =
  | MsgStartGif
  | MsgStopGif
  | MsgGetStatus
  | MsgGifProgress
  | MsgGifComplete
  | MsgGifError
  | MsgGetVideoMetadata
  | MsgVideoMetadata
  | MsgSeekVideo
  | MsgPauseVideo
  | MsgCaptureVisibleFrame
  | MsgGetStoryboard
  | MsgStoryboardData;

export interface MsgGetStoryboard {
  type: 'GET_STORYBOARD';
}

export interface StoryboardSpec {
  baseUrl: string;
  l1: string; // Level 1
  l2: string; // Level 2 (High res usually)
  spec: string; // Original spec string
  languages: Array<{
    code: string;
    name: string;
  }>;
}

export interface MsgStoryboardData {
  type: 'STORYBOARD_DATA';
  spec: string | null;
}
