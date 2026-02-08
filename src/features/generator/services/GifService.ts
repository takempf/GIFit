import EventEmitter from 'eventemitter3';
import encode, { init as initGifski } from 'gifski-wasm';
import { browser } from 'wxt/browser';
import { log } from '@/utils/logger';

import { GifConfig, GifCompleteData } from '@/types';

// Quality mapping: GifConfig uses 1-10, gifski-wasm uses 1-100 - we map to 85-100
// Below 85, we start seeing "ghosting" artifacts with gifski on some content
const MAX_QUALITY = 10;
const MIN_GIFSKI_QUALITY = 85;
const mapQuality = (quality: number): number => {
  const normalized = (quality - 1) / (MAX_QUALITY - 1);
  return Math.round(
    MIN_GIFSKI_QUALITY + normalized * (100 - MIN_GIFSKI_QUALITY)
  );
};

// Track if WASM module has been initialized
let wasmInitialized = false;

/**
 * Initialize the gifski WASM module from extension's web-accessible resource.
 */
async function ensureWasmInitialized(): Promise<void> {
  if (wasmInitialized) return;

  const wasmUrl = browser.runtime.getURL('/gifski_wasm_bg.wasm');
  log('Initializing gifski-wasm from:', wasmUrl);

  await initGifski(wasmUrl);
  wasmInitialized = true;
  log('gifski-wasm initialized successfully');
}

/**
 * Service for creating GIFs from HTMLVideoElement frames using gifski-wasm.
 *
 * Emits:
 * - 'COMPLETE' (data: GifCompleteData)
 * - 'FRAMES_PROGRESS' (ratio: number, frameCount: number, frameDataUrl?: string)
 * - 'FRAMES_COMPLETE'
 * - 'ABORT'
 * - 'ERROR' (error: Error)
 */
class GifService extends EventEmitter {
  private aborted: boolean = false;
  private framesComplete: number = 0;
  private canvasEl: HTMLCanvasElement | null;
  private context: CanvasRenderingContext2D | null;

  constructor() {
    super();

    this.canvasEl = document.createElement('canvas');
    const context = this.canvasEl.getContext('2d', {
      willReadFrequently: true
    });

    if (!context) {
      this.canvasEl = null;
      throw new Error('Failed to get 2D rendering context from canvas.');
    }
    this.context = context;
    this.context.imageSmoothingEnabled = true;
  }

  /**
   * Creates a GIF from a video element.
   * @param config - GIF creation parameters.
   * @param videoElement - The HTMLVideoElement source.
   * @returns A promise that resolves with the GIF data, or void if an error occurs.
   */
  async createGif(
    config: GifConfig,
    videoElement: HTMLVideoElement
  ): Promise<GifCompleteData | void> {
    log('Creating GIF with config:', config);

    this.aborted = false;
    this.framesComplete = 0;

    if (!this.canvasEl || !this.context) {
      const error = new Error(
        'Canvas context unavailable. Service may be destroyed.'
      );
      this.emit('ERROR', error);
      throw error;
    }

    this.canvasEl.width = config.width;
    this.canvasEl.height = config.height;

    try {
      this.emit('processing');

      // Perform initial seek before starting the loop
      await this.asyncSeek(videoElement, config.start / 1000);

      // Collect all frames
      const frames = await this.collectFrames(config, videoElement);

      // Check if the collection was aborted
      if (this.aborted) {
        throw new Error('GIF generation was aborted by the user.');
      }

      this.emit('FRAMES_COMPLETE');

      // Encode all frames at once using gifski-wasm
      await ensureWasmInitialized();
      log('Encoding GIF with gifski-wasm...');
      const quality = mapQuality(config.quality);
      const gifBuffer = await encode({
        frames,
        width: config.width,
        height: config.height,
        fps: config.fps,
        quality
      });

      const blob = new Blob([gifBuffer as BlobPart], { type: 'image/gif' });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const gifData: GifCompleteData = {
        dataUrl,
        width: config.width,
        height: config.height,
        size: blob.size
      };

      log('GIF processing complete.');
      this.emit('COMPLETE', gifData);

      return gifData;
    } catch (error: unknown) {
      console.error('GIF creation failed:', error);
      if (!this.aborted) {
        this.emit(
          'ERROR',
          new Error(
            `GIF creation failed: ${(error as Error)?.message || error}`
          )
        );
      }
      this.abort();
    } finally {
      // Return to original video timecode
      this.seek(videoElement, config.start / 1000);
    }
  }

  abort(): void {
    if (this.aborted) {
      return;
    }
    log('Aborting GIF creation');
    this.aborted = true;

    if (this.listenerCount('ABORT') > 0) {
      this.emit('ABORT');
    }
    log('GIF creation aborted');
  }

  destroy(): void {
    log('Destroying GifService');
    this.abort();
    this.removeAllListeners();

    this.canvasEl = null;
    this.context = null;
    log('GifService destroyed');
  }

  private seek(video: HTMLVideoElement, time: number): void {
    video.currentTime = time;
    video.pause();
  }

  private asyncSeek(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const doneSeeking = () => {
        video.removeEventListener('seeked', doneSeeking);
        video.removeEventListener('error', onError);
        requestAnimationFrame(() => resolve());
      };
      const onError = (event: Event) => {
        video.removeEventListener('seeked', doneSeeking);
        video.removeEventListener('error', onError);
        reject(
          new Error(
            `Video seeking failed: ${
              (event.target as HTMLVideoElement)?.error?.message ||
              'Unknown error'
            }`
          )
        );
      };

      video.addEventListener('seeked', doneSeeking);
      video.addEventListener('error', onError);

      this.seek(video, time);
    });
  }

  private getFrameImageData(
    videoElement: HTMLVideoElement,
    width: number,
    height: number
  ): ImageData {
    if (!this.context || !this.canvasEl) {
      throw new Error('Canvas context or canvas element not found.');
    }

    this.context.drawImage(
      videoElement,
      0,
      0,
      videoElement.videoWidth,
      videoElement.videoHeight,
      0,
      0,
      width,
      height
    );

    return this.context.getImageData(0, 0, width, height);
  }

  /**
   * Collects all frames from video for batch encoding.
   */
  private async collectFrames(
    config: GifConfig,
    videoElement: HTMLVideoElement
  ): Promise<ImageData[]> {
    const frameIntervalMs = 1000 / config.fps;
    const gifDurationMs = config.end - config.start;
    const totalFrames = Math.floor(gifDurationMs / frameIntervalMs);
    const frames: ImageData[] = [];

    while (videoElement.currentTime * 1000 < config.end && !this.aborted) {
      if (!this.context || !this.canvasEl) {
        throw new Error('Canvas context lost during processing.');
      }

      const imageData = this.getFrameImageData(
        videoElement,
        config.width,
        config.height
      );
      frames.push(imageData);

      this.framesComplete++;
      const progress = Math.min(
        1,
        Math.max(0, this.framesComplete / totalFrames)
      );

      // Preview every 5 frames to reduce overhead
      const frameDataUrl =
        this.framesComplete % 5 === 1
          ? this.canvasEl.toDataURL('image/jpeg', 0.5)
          : undefined;

      this.emit('FRAMES_PROGRESS', progress, this.framesComplete, frameDataUrl);

      const nextFrameTimeMs = videoElement.currentTime * 1000 + frameIntervalMs;
      if (nextFrameTimeMs >= config.end) {
        break;
      }

      await this.asyncSeek(videoElement, nextFrameTimeMs / 1000);
    }

    return frames;
  }
}

export default GifService;
