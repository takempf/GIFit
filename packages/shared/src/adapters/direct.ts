import type {
  VideoAdapter,
  GifAdapter,
  StorageAdapter,
  GifProgressCallbacks
} from './types';
import type { GifConfig, VideoMetadata } from '@shared/types';
import GifService from '@shared/features/generator/services/GifService';

// --- Video Adapter (operates directly on a <video> element) ---

export class DirectVideoAdapter implements VideoAdapter {
  private getVideo: () => HTMLVideoElement | null;

  constructor(getVideo: () => HTMLVideoElement | null) {
    this.getVideo = getVideo;
  }

  async seek(timeSeconds: number): Promise<void> {
    const video = this.getVideo();
    if (!video) return;

    return new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = timeSeconds;
    });
  }

  async pause(): Promise<void> {
    const video = this.getVideo();
    if (video) video.pause();
  }

  async getMetadata(): Promise<VideoMetadata | null> {
    const video = this.getVideo();
    if (!video || !video.videoWidth) return null;

    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      currentTime: video.currentTime
    };
  }

  async captureFrame(): Promise<string | null> {
    const video = this.getVideo();
    if (!video || !video.videoWidth) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async getStoryboardSpec(): Promise<unknown> {
    // Not implemented for direct video yet
    return null;
  }
}

// --- GIF Adapter (runs GifService directly in-page) ---

export class DirectGifAdapter implements GifAdapter {
  private getVideo: () => HTMLVideoElement | null;
  private gifService: GifService | null = null;
  private callbacks: GifProgressCallbacks | null = null;

  constructor(getVideo: () => HTMLVideoElement | null) {
    this.getVideo = getVideo;
  }

  setCallbacks(callbacks: GifProgressCallbacks) {
    this.callbacks = callbacks;
  }

  async createGif(config: GifConfig): Promise<void> {
    const video = this.getVideo();
    if (!video) {
      this.callbacks?.onError('No video element available');
      return;
    }

    // Create a fresh GifService for each generation
    this.gifService = new GifService();

    // Wire up events
    this.gifService.on(
      'FRAMES_PROGRESS',
      (
        progress: number,
        frameCount: number,
        frameDataUrl?: string,
        stage?: string
      ) => {
        this.callbacks?.onProgress(progress, frameCount, frameDataUrl, stage);
      }
    );

    this.gifService.on('COMPLETE', (data) => {
      this.callbacks?.onComplete(data);
    });

    this.gifService.on('ERROR', (error: Error) => {
      this.callbacks?.onError(error.message);
    });

    try {
      await this.gifService.createGif(config, video);
    } catch {
      // Errors are handled via the event emitter
    }
  }

  abortGif(): void {
    if (this.gifService) {
      this.gifService.abort();
      this.gifService.destroy();
      this.gifService = null;
    }
  }

  reset(): void {
    this.abortGif();
  }
}

// --- Storage Adapter (Local Storage for Web) ---

export class LocalStorageAdapter implements StorageAdapter {
  async getWidth(): Promise<number | null> {
    const val = localStorage.getItem('gifit_config_width');
    return val ? parseInt(val, 10) : 420;
  }
  async setWidth(value: number): Promise<void> {
    localStorage.setItem('gifit_config_width', value.toString());
  }
  async getFps(): Promise<number | null> {
    const val = localStorage.getItem('gifit_config_fps');
    return val ? parseInt(val, 10) : 10;
  }
  async setFps(value: number): Promise<void> {
    localStorage.setItem('gifit_config_fps', value.toString());
  }
  async getQuality(): Promise<number | null> {
    const val = localStorage.getItem('gifit_config_quality');
    return val ? parseInt(val, 10) : 5;
  }
  async setQuality(value: number): Promise<void> {
    localStorage.setItem('gifit_config_quality', value.toString());
  }
}
