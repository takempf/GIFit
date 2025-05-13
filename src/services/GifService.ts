import EventEmitter from 'eventemitter3';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { log } from '@/utils/logger';
import floydSteinberg from '@/utils/dither'; // Assumed to return dithered RGBA data

// TODO centralize this
const MAX_QUALITY = 10;

// --- Configuration and Event Data Interfaces ---

export interface GifConfig {
  quality: number; // 1 (lowest) - 10 (highest)
  width: number;
  height: number;
  start: number; // ms
  end: number; // ms
  fps: number;
  maxColors?: number; // 2 - 256 (user-provided, validated)
  noDither?: boolean; // If true, use nearest color, no dithering
}

export interface GifCompleteData {
  blob: Blob;
  width: number;
  height: number;
}

// --- Service Implementation ---

/**
 * Service for creating GIFs from HTMLVideoElement frames using gifenc.
 *
 * Emits:
 * - 'complete' (data: GifCompleteData)
 * - 'frames progress' (ratio: number, frameCount: number)
 * - 'frames complete'
 * - 'abort'
 * - 'error' (error: Error)
 */
class GifService extends EventEmitter {
  private encoder: GIFEncoder | null = null;
  private aborted: boolean = false;
  private framesComplete: number = 0;
  private canvasEl: HTMLCanvasElement | null;
  private context: CanvasRenderingContext2D | null;
  private pendingFrameTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();

    this.canvasEl = document.createElement('canvas');
    const context = this.canvasEl.getContext('2d', {
      willReadFrequently: true // Perf: Optimize for frequent getImageData
    });

    if (!context) {
      this.canvasEl = null; // Cleanup on context failure
      throw new Error('Failed to get 2D rendering context from canvas.');
    }
    this.context = context;
    this.context.imageSmoothingEnabled = false; // Prefer crisp pixels
  }

  /**
   * Creates a GIF from a video element.
   * @param config - GIF creation parameters.
   * @param videoElement - The HTMLVideoElement source.
   */
  createGif(config: GifConfig, videoElement: HTMLVideoElement): void {
    log('Creating GIF with config:', config);
    this.abort(); // Stop any existing process
    this.aborted = false;
    this.framesComplete = 0;

    if (!this.canvasEl || !this.context) {
      this.emit(
        'error',
        new Error('Canvas context unavailable. Service may be destroyed.')
      );
      return;
    }

    let finalMaxColors: number;
    if (config.maxColors !== undefined) {
      if (config.maxColors < 2 || config.maxColors > 256) {
        this.emit(
          'error',
          new Error(
            `config.maxColors must be 2-256. Received: ${config.maxColors}`
          )
        );
        return;
      }
      finalMaxColors = config.maxColors;
    } else {
      const quality = Number(config.quality);
      finalMaxColors =
        quality <= 0 || MAX_QUALITY <= 0
          ? 256
          : Math.floor((quality / MAX_QUALITY) * 256);
      finalMaxColors = Math.max(2, Math.min(256, finalMaxColors)); // Clamp
    }

    this.canvasEl.width = config.width;
    this.canvasEl.height = config.height;
    this.canvasEl.style.width = `${config.width}px`;
    this.canvasEl.style.height = `${config.height}px`;

    if (!videoElement.paused) videoElement.pause(); // For consistent frame grabs

    try {
      this.encoder = GIFEncoder();
    } catch (error: any) {
      this.emit(
        'error',
        new Error(`Failed to initialize GIFEncoder: ${error?.message || error}`)
      );
      return;
    }

    this._startFrameProcessing(config, videoElement, finalMaxColors);
  }

  /** Aborts the current GIF creation process. */
  abort(): void {
    if (this.aborted && !this.pendingFrameTimeoutId && !this.encoder) {
      return; // Nothing to abort or already fully aborted
    }
    log('Aborting GIF creation');
    this.aborted = true;

    if (this.pendingFrameTimeoutId) {
      clearTimeout(this.pendingFrameTimeoutId);
      this.pendingFrameTimeoutId = null;
    }

    this.encoder = null; // Allow GC, stops further frame writes
    if (this.listenerCount('abort') > 0) {
      this.emit('abort');
    }
    log('GIF creation aborted');
  }

  /** Cleans up resources. Call when service is no longer needed. */
  destroy(): void {
    log('Destroying GifService');
    this.abort(); // Stop any ongoing process
    this.removeAllListeners();

    this.canvasEl = null; // Help GC
    this.context = null; // Help GC
    log('GifService destroyed');
  }

  // --- Private Helper Methods ---

  /**
   * Seeks video to a time, resolving on 'seeked' event.
   */
  private _asyncSeek(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const doneSeeking = () => {
        video.removeEventListener('seeked', doneSeeking);
        video.removeEventListener('error', onError);
        // Delay ensures frame is painted post-seek. Adjust if needed.
        setTimeout(resolve, 50);
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
      video.currentTime = time;
    });
  }

  /** Initiates frame processing after initial seek. */
  private async _startFrameProcessing(
    config: GifConfig,
    videoElement: HTMLVideoElement,
    actualMaxColors: number
  ): Promise<void> {
    try {
      this.emit('processing');
      await this._asyncSeek(videoElement, config.start / 1000);
      this._addFrame(config, videoElement, actualMaxColors);
    } catch (error: any) {
      console.error('Error during initial seek:', error);
      this.emit(
        'error',
        new Error(`Error during initial video seek: ${error?.message || error}`)
      );
      this.abort(); // Abort on initial seek failure
    }
  }

  /**
   * Adds current video frame to GIF, schedules next frame.
   * Recursively calls itself via setTimeout after seeking.
   */
  private async _addFrame(
    config: GifConfig,
    videoElement: HTMLVideoElement,
    actualMaxColors: number
  ): Promise<void> {
    if (this.aborted || !this.encoder || !this.context || !this.canvasEl) {
      log('Frame processing aborted or essential resources missing.');
      if (this.pendingFrameTimeoutId) {
        clearTimeout(this.pendingFrameTimeoutId);
        this.pendingFrameTimeoutId = null;
      }
      return;
    }

    const currentTimeMs = videoElement.currentTime * 1000;
    const frameIntervalMs = 1000 / config.fps;
    const gifDurationMs = config.end - config.start;

    const effectiveGifDuration =
      gifDurationMs > frameIntervalMs ? gifDurationMs : frameIntervalMs;
    const trueGifDuration =
      effectiveGifDuration - (effectiveGifDuration % frameIntervalMs);

    try {
      this.context.drawImage(
        videoElement,
        0,
        0,
        videoElement.videoWidth,
        videoElement.videoHeight,
        0,
        0,
        config.width,
        config.height
      );

      const imageData = this.context.getImageData(
        0,
        0,
        config.width,
        config.height
      );

      const palette = quantize(imageData.data, actualMaxColors);

      let indexedData: Uint8Array;
      if (config.noDither) {
        indexedData = applyPalette(imageData.data, palette, 'nearest');
      } else {
        // Apply custom Floyd-Steinberg, then map to palette.
        // Create a copy to avoid mutating original imageData.data if floydSteinberg modifies input.
        const ditheredRgbaData = floydSteinberg(
          new Uint8ClampedArray(imageData.data),
          config.width,
          config.height,
          palette
        );
        indexedData = applyPalette(ditheredRgbaData, palette, 'nearest');
      }

      this.encoder.writeFrame(indexedData, config.width, config.height, {
        palette,
        delay: frameIntervalMs
      });

      const elapsed = currentTimeMs - config.start;
      const progress =
        trueGifDuration > 0
          ? Math.min(1, Math.max(0, elapsed / trueGifDuration))
          : 1;
      this.framesComplete++;
      this.emit('frames progress', progress, this.framesComplete);
    } catch (error: any) {
      console.error('Error processing frame:', error);
      this.emit(
        'error',
        new Error(`Error processing frame: ${error?.message || error}`)
      );
      this.abort();
      return;
    }

    const nextFrameTimeMs = currentTimeMs + frameIntervalMs;

    if (nextFrameTimeMs >= config.end) {
      this.emit('frames complete');
      if (this.encoder && !this.aborted) {
        try {
          this.encoder.finish();
          const buffer = this.encoder.bytesView();
          const imageBlob = new Blob([buffer], { type: 'image/gif' });
          this.emit('complete', {
            blob: imageBlob,
            width: config.width,
            height: config.height
          });
        } catch (error: any) {
          console.error('Error finalizing GIF:', error);
          this.emit(
            'error',
            new Error(`GIF finalization failed: ${error?.message || error}`)
          );
        } finally {
          this.encoder = null; // Clean up encoder
        }
      }
      return;
    }

    try {
      await this._asyncSeek(videoElement, nextFrameTimeMs / 1000);
      if (this.aborted) return; // Check abort status post-async operation

      if (this.pendingFrameTimeoutId) clearTimeout(this.pendingFrameTimeoutId);
      this.pendingFrameTimeoutId = setTimeout(() => {
        this.pendingFrameTimeoutId = null; // Clear ID once callback executes
        this._addFrame(config, videoElement, actualMaxColors);
      }, 0); // Yield to event loop, prevent stack overflow
    } catch (error: any) {
      console.error('Error seeking for next frame:', error);
      this.emit(
        'error',
        new Error(`Error seeking next frame: ${error?.message || error}`)
      );
      this.abort(); // Abort on seek failure
    }
  }
}

export default GifService;
