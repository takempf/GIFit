import EventEmitter from 'eventemitter3';

// Import gifenc functions
import {
  GIFEncoder,
  quantize,
  applyPalette
  // Optional: If you want different dithering algorithms
  // nearestColorIndex, // For no dithering
  // ErrorDiffusion, // For specific dithering like FloydSteinberg, Atkinson etc.
} from 'gifenc';

import { log } from '@/utils/logger';

// TODO centralize this
const MAX_QUALITY = 10;

// --- Configuration and Event Data Interfaces ---

export interface GifConfig {
  quality: number; // 1 - 10
  width: number;
  height: number;
  start: number; // ms
  end: number; // ms
  fps: number;
  maxColors?: number; // 0 - 256
  noDither?: boolean; // without dither just closest color
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
 * - 'complete' (data: GifCompleteData) - When GIF creation is successful.
 * - 'frames progress' (ratio: number, frameCount: number) - Frame gathering progress (0-1).
 * - 'frames complete' - When all frames have been added to the encoder.
 * - 'abort' - When GIF creation is aborted.
 * - 'error' (error: Error) - On critical errors during setup or processing.
 */
class GifService extends EventEmitter {
  private encoder: GIFEncoder | null = null;
  private aborted: boolean = false;
  private framesComplete: number = 0;
  private readonly canvasEl: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor() {
    super();

    this.canvasEl = document.createElement('canvas');
    const context = this.canvasEl.getContext('2d', {
      willReadFrequently: true // Important
    });

    if (!context) {
      // Critical error, cannot proceed without context
      throw new Error('Failed to get 2D rendering context from canvas.');
    }
    this.context = context;
    this.context.imageSmoothingEnabled = false; // Use standard property
  }

  /**
   * Creates a GIF from a video element based on the provided configuration.
   * @param config - The configuration for the GIF creation.
   * @param videoElement - The HTMLVideoElement source.
   */
  createGif(config: GifConfig, videoElement: HTMLVideoElement): void {
    log('Creating GIF with config:', config);
    // Clear previous state
    this.abort(); // Ensure any previous process is stopped
    this.aborted = false;
    this.framesComplete = 0;

    // set maxColors based on quality (for now)
    config.maxColors = (Number(config.quality) / MAX_QUALITY) * 256;

    // Validate config slightly
    const maxColors = config.maxColors || 256; // Default to 256 colors
    if (maxColors < 2 || maxColors > 256) {
      this.emit('error', new Error('maxColors must be between 2 and 256.'));
      return;
    }

    // Prepare canvas
    this.canvasEl.width = config.width;
    this.canvasEl.height = config.height;
    this.canvasEl.style.width = `${config.width}px`;
    this.canvasEl.style.height = `${config.height}px`;

    // Pause video to ensure consistent frame grabbing
    if (!videoElement.paused) {
      videoElement.pause();
    }

    // Initialize GIF encoder
    try {
      this.encoder = GIFEncoder();
    } catch (error: any) {
      this.emit(
        'error',
        new Error(`Failed to initialize GIFEncoder: ${error?.message || error}`)
      );
      return;
    }

    // Start processing frames asynchronously
    this._startFrameProcessing(config, videoElement);
  }

  /**
   * Aborts the current GIF creation process.
   */
  abort(): void {
    log('Aborting GIF creation');
    if (this.aborted) {
      return; // Already aborted or nothing to abort
    }
    this.aborted = true;
    // No specific abort method in gifenc encoder, just stop adding frames
    this.encoder = null; // Clear reference to allow garbage collection
    this.emit('abort');
    log('GIF creation aborted');
  }

  /**
   * Cleans up resources and listeners. Call when the service is no longer needed.
   */
  destroy(): void {
    log('Destroying GifService');
    this.abort(); // Ensure any ongoing process is stopped
    this.removeAllListeners(); // Remove all listeners attached to this EventEmitter
    // Canvas element will be garbage collected if no other references exist
    log('GifService destroyed');
  }

  // --- Private Helper Methods ---

  /**
   * Seeks the video element to a specific time and returns a Promise
   * that resolves when the 'seeked' event fires.
   */
  private _asyncSeek(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const doneSeeking = () => {
        video.removeEventListener('seeked', doneSeeking);
        video.removeEventListener('error', onError); // Clean up error listener
        // Delay might still be needed for the frame to be fully ready for getImageData
        setTimeout(resolve, 50); // Increased delay slightly, adjust if needed
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
      video.addEventListener('error', onError); // Handle potential video errors during seek
      video.currentTime = time;
    });
  }

  /**
   * Initiates the frame processing loop after the initial seek.
   */
  private async _startFrameProcessing(
    config: GifConfig,
    videoElement: HTMLVideoElement
  ): Promise<void> {
    try {
      this.emit('processing');

      await this._asyncSeek(videoElement, config.start / 1000);
      // Start the recursive frame adding process
      this._addFrame(config, videoElement);
    } catch (error: any) {
      console.error('Error during initial seek:', error);
      this.emit(
        'error',
        new Error(`Error during initial video seek: ${error?.message || error}`)
      );
      this.abort(); // Abort if initial seek fails
    }
  }

  /**
   * Adds the current video frame to the GIF and schedules the next frame.
   * This method calls itself recursively via setTimeout after seeking.
   */
  private async _addFrame(
    config: GifConfig,
    videoElement: HTMLVideoElement
  ): Promise<void> {
    // Ensure we haven't aborted and the encoder still exists
    if (this.aborted || !this.encoder) {
      log('Frame processing aborted or encoder missing');
      return;
    }

    const currentTime = videoElement.currentTime * 1000; // ms
    const frameInterval = 1000 / config.fps; // ms
    const gifDuration = config.end - config.start; // ms

    // Avoid division by zero or negative duration issues
    const effectiveGifDuration =
      gifDuration > frameInterval ? gifDuration : frameInterval;
    // Calculate duration aligned with frame intervals for smoother progress
    const trueGifDuration =
      effectiveGifDuration - (effectiveGifDuration % frameInterval);

    try {
      // 1. Draw current video frame onto the canvas
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

      // 2. Get ImageData from the canvas
      const imageData = this.context.getImageData(
        0,
        0,
        config.width,
        config.height
      );

      // 3. Quantize pixels to create a palette (e.g., 256 colors)
      //    `quantize` returns a palette [r, g, b, r, g, b, ...]
      const maxColors = config.maxColors || 256;
      const palette = quantize(imageData.data, maxColors, {
        // format: 'rgba4444', // Optional: Faster but lower quality format
        // oneBitAlpha: false, // Optional: Handle transparency differently
      });

      // 4. Apply palette to get indexed data
      //    `applyPalette` returns Uint8Array of color indices
      const index = applyPalette(
        imageData.data,
        palette,
        config.noDither ? 'nearest' : 'FloydSteinberg'
      );
      // Other dither options: 'FalseFloydSteinberg', 'Stucki', 'Atkinson'

      // 5. Add frame to the GIF encoder
      this.encoder.writeFrame(index, config.width, config.height, {
        palette, // Provide the generated palette
        delay: frameInterval // Delay in ms
        // dispose: 1, // Optional: Disposal method (check gifenc docs if needed)
        // transparent: true, // Optional: If using transparency
        // transparentIndex: 0 // Optional: Index of transparent color in palette
      });

      // Calculate and emit frame gathering progress
      const elapsed = currentTime - config.start;
      const frameGatheringProgress =
        trueGifDuration > 0 ? elapsed / trueGifDuration : 1;
      this.framesComplete++;
      // Clamp progress between 0 and 1
      this.emit(
        'frames progress',
        Math.min(1, Math.max(0, frameGatheringProgress)),
        this.framesComplete
      );
    } catch (error: any) {
      console.error('Error processing frame:', error);
      this.emit(
        'error',
        new Error(`Error processing frame: ${error?.message || error}`)
      );
      this.abort();
      return; // Stop processing on error
    }

    const nextFrameTime = currentTime + frameInterval; // ms

    // Check if we've reached the end time
    if (nextFrameTime >= config.end) {
      this.emit('frames complete');
      // Finalize the GIF
      if (this.encoder && !this.aborted) {
        try {
          this.encoder.finish();
          // Get the ArrayBuffer
          const buffer = this.encoder.bytesView(); // Use bytesView() for Uint8Array
          const imageBlob = new Blob([buffer], { type: 'image/gif' });

          const imageAttributes: GifCompleteData = {
            blob: imageBlob,
            width: config.width,
            height: config.height
          };
          this.emit('complete', imageAttributes);
        } catch (error: any) {
          console.error('Error finalizing GIF:', error);
          this.emit(
            'error',
            new Error(`GIF finalization failed: ${error?.message || error}`)
          );
        } finally {
          this.encoder = null; // Clean up encoder instance
        }
      }
      return; // End of processing
    }

    // Seek to the next frame time and schedule the next call to _addFrame
    try {
      await this._asyncSeek(videoElement, nextFrameTime / 1000);
      // Use setTimeout to yield to the event loop, prevent potential stack overflows,
      // and allow UI updates, especially important as gifenc is synchronous.
      setTimeout(() => this._addFrame(config, videoElement), 0);
    } catch (error: any) {
      console.error('Error seeking for next frame:', error);
      this.emit(
        'error',
        new Error(`Error seeking next frame: ${error?.message || error}`)
      );
      this.abort(); // Abort if seek fails
    }
  }
}

export default GifService;
