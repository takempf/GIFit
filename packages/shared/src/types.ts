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
  cropX?: number; // source-video px
  cropY?: number; // source-video px
  cropW?: number; // source-video px
  cropH?: number; // source-video px
}

export interface GifCompleteData {
  dataUrl: string;
  width: number;
  height: number;
  size: number; // Actual byte size of the GIF
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
  stage?: string;
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

export interface MsgStoryboardData {
  type: 'STORYBOARD_DATA';
  spec: string | null;
}
