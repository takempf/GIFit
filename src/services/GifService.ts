import EventEmitter from 'eventemitter3';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { log } from '@/utils/logger';
import floydSteinberg from '@/utils/dither'; // Assumed to return dithered RGBA data

// TODO centralize this
const MAX_QUALITY = 10;

// --- Configuration and Event Data Interfaces ---

export interface GifConfig {
  name: string;
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

export interface IndexingOptions {
  noDither?: boolean;
  palette: any;
  width: number;
  height: number;
}

// --- Service Implementation ---

/**
 * Service for creating GIFs from HTMLVideoElement frames using gifenc.
 *
 * Emits:
 * - 'COMPLETE' (data: GifCompleteData)
 * - 'FRAMES_PROGRESS' (ratio: number, frameCount: number)
 * - 'FRAMES_COMPLETE'
 * - 'ABORT'
 * - 'ERROR' (error: Error)
 */
class GifService extends EventEmitter {
  private encoder: GIFEncoder | null = null;
  private aborted: boolean = false;
  private framesComplete: number = 0;
  private canvasEl: HTMLCanvasElement | null;
  private context: CanvasRenderingContext2D | null;
  private thumbnailCanvasEl: HTMLCanvasElement | null;
  private thumbnailContext: CanvasRenderingContext2D | null;
  private tempFrameCanvas: HTMLCanvasElement | null; // For generateFrameThumbnail
  private tempFrameContext: CanvasRenderingContext2D | null; // For generateFrameThumbnail

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

    // Thumbnail canvas setup
    this.thumbnailCanvasEl = document.createElement('canvas');
    this.thumbnailContext = this.thumbnailCanvasEl.getContext('2d', {
      alpha: false // Assuming opaque thumbnails are fine
    });

    if (!this.thumbnailContext) {
      this.thumbnailCanvasEl = null; // Cleanup
      throw new Error(
        'Failed to get 2D rendering context for thumbnail canvas.'
      );
    }
    // Set initial thumbnail canvas size, will be adjusted in generateFrameThumbnail
    this.thumbnailCanvasEl.width = 8;
    this.thumbnailCanvasEl.height = 8;
    this.thumbnailContext.imageSmoothingEnabled = true; // Use smoothing for downscaling
    this.thumbnailContext.imageSmoothingQuality = 'medium'; // Balance quality and perf

    // Temporary canvas for frame processing in generateFrameThumbnail
    this.tempFrameCanvas = document.createElement('canvas');
    this.tempFrameContext = this.tempFrameCanvas.getContext('2d');

    if (!this.tempFrameContext) {
      this.tempFrameCanvas = null; // Cleanup
      throw new Error(
        'Failed to get 2D rendering context for temporary frame canvas.'
      );
    }
  }

  /**
   * Creates a GIF from a video element. This method awaits the
   * full frame processing and returns the final GIF data.
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

    const maxColors = this.getMaxColors(config);

    this.canvasEl.width = config.width;
    this.canvasEl.height = config.height;
    this.canvasEl.style.width = `${config.width}px`;
    this.canvasEl.style.height = `${config.height}px`;

    try {
      this.encoder = GIFEncoder();
    } catch (error: any) {
      const initError = new Error(
        `Failed to initialize GIFEncoder: ${error?.message || error}`
      );
      this.emit('ERROR', initError);
      throw initError;
    }

    try {
      this.emit('processing');

      // Perform initial seek before starting the loop
      await this.asyncSeek(videoElement, config.start / 1000);

      // Loop through and process all the frames
      await this.processFrames(config, videoElement, maxColors);

      // Check if the loop was exited due to an abort action.
      if (this.aborted) {
        throw new Error('GIF generation was aborted by the user.');
      }

      // Finalize GIF
      const blob = this.finalizeGif();

      const gifData = {
        blob,
        width: config.width,
        height: config.height
      };

      // Frame collection complete, finish up
      log('GIF processing complete.');
      this.emit('COMPLETE', gifData);

      return gifData;
    } catch (error: any) {
      console.error('GIF creation failed:', error);
      if (!this.aborted) {
        this.emit(
          'ERROR',
          new Error(`GIF creation failed: ${error?.message || error}`)
        );
      }
      this.abort(); // Ensure cleanup on failure
    } finally {
      this.encoder = null; // Clean up encoder regardless of outcome

      // Return to original video timecode and clean up
      this.seek(videoElement, config.start / 1000);
    }
  }

  getMaxColors(config: GifConfig): number {
    let finalMaxColors: number;
    if (config.maxColors !== undefined) {
      if (config.maxColors < 2 || config.maxColors > 256) {
        this.emit(
          'ERROR',
          new Error(
            `config.maxColors must be 2-256. Received: ${config.maxColors}`
          )
        );
        return 256;
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

    return finalMaxColors;
  }

  abort(): void {
    if (this.aborted) {
      return; // Nothing to abort
    }
    log('Aborting GIF creation');
    this.aborted = true;

    // The async loop in processFrames will check this.aborted and stop.
    this.encoder = null; // Allow GC, stops further frame writes

    if (this.listenerCount('ABORT') > 0) {
      this.emit('ABORT');
    }
    log('GIF creation aborted');
  }

  destroy(): void {
    log('Destroying GifService');
    this.abort(); // Stop any ongoing process
    this.removeAllListeners();

    this.canvasEl = null; // Help GC
    this.context = null; // Help GC
    this.thumbnailCanvasEl = null; // Help GC
    this.thumbnailContext = null; // Help GC
    this.tempFrameCanvas = null; // Help GC
    this.tempFrameContext = null; // Help GC
    log('GifService destroyed');
  }

  private generateFrameThumbnail(
    imageData: ImageData,
    targetWidth: number = 8,
    targetHeight: number = 8
  ): string {
    if (
      !this.thumbnailCanvasEl ||
      !this.thumbnailContext ||
      !this.tempFrameCanvas ||
      !this.tempFrameContext
    ) {
      log(
        'Thumbnail or temporary canvas/context not available, skipping thumbnail.'
      );
      return '';
    }

    const { width: originalWidth, height: originalHeight } = imageData;

    // Calculate aspect ratio to fit within 8x8
    let newWidth = targetWidth;
    let newHeight = targetHeight;
    const aspectRatio = originalWidth / originalHeight;

    if (originalWidth > originalHeight) {
      newHeight = Math.round(targetWidth / aspectRatio);
      newHeight = Math.max(1, newHeight); // Ensure at least 1px height
    } else {
      newWidth = Math.round(targetHeight * aspectRatio);
      newWidth = Math.max(1, newWidth); // Ensure at least 1px width
    }

    this.thumbnailCanvasEl.width = newWidth;
    this.thumbnailCanvasEl.height = newHeight;

    // Use the pre-existing temporary canvas
    this.tempFrameCanvas.width = originalWidth;
    this.tempFrameCanvas.height = originalHeight;
    this.tempFrameContext.putImageData(imageData, 0, 0);

    // Clear previous thumbnail frame
    this.thumbnailContext.clearRect(
      0,
      0,
      this.thumbnailCanvasEl.width,
      this.thumbnailCanvasEl.height
    );

    // Draw scaled image
    this.thumbnailContext.drawImage(
      this.tempFrameCanvas, // Source: the temporary canvas with the full frame
      0,
      0,
      originalWidth,
      originalHeight, // Source dimensions
      0,
      0,
      newWidth,
      newHeight // Destination dimensions
    );

    return this.thumbnailCanvasEl.toDataURL('image/png'); // Using PNG for thumbnails
  }

  private seek(video: HTMLVideoElement, time: number): void {
    video.currentTime = time;
    video.pause(); // ensure we don't accidentally play
  }

  // Seeks video to a time, resolving on 'seeked' event. (Unchanged)
  private asyncSeek(video: HTMLVideoElement, time: number): Promise<void> {
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

    // We can't access image data directly from the video
    // So we copy image data from video to canvas
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

    // We can access the image data directly from the canvas
    const imageData = this.context.getImageData(0, 0, width, height);

    return imageData;
  }

  private indexImageData(
    imageData: ImageData,
    { palette, noDither = false, width, height }: IndexingOptions
  ): Uint8Array {
    let indexedData: Uint8Array;

    if (noDither) {
      indexedData = applyPalette(imageData.data, palette, { format: 'rgb565' });
    } else {
      const ditheredRgbaData = floydSteinberg(
        new Uint8ClampedArray(imageData.data),
        width,
        height,
        palette
      );
      indexedData = applyPalette(ditheredRgbaData, palette, {
        format: 'rgb565'
      });
    }

    return indexedData;
  }

  /**
   * Asynchronously loops through video frames, processes them, and
   * finalizes the GIF.
   * This method is designed to be awaited.
   */
  private async processFrames(
    config: GifConfig,
    videoElement: HTMLVideoElement,
    actualMaxColors: number
  ): Promise<void> {
    const frameIntervalMs = 1000 / config.fps;
    const gifDurationMs = config.end - config.start;
    const trueGifDuration = gifDurationMs - (gifDurationMs % frameIntervalMs);

    // Loop until the video's current time passes the desired end time or is aborted.
    while (videoElement.currentTime * 1000 < config.end && !this.aborted) {
      if (!this.encoder || !this.context || !this.canvasEl) {
        throw new Error(
          'GIF Encoder or Canvas context lost during processing.'
        );
      }

      // Get image data
      const imageData = this.getFrameImageData(
        videoElement,
        config.width,
        config.height
      );

      // Use a color palette
      const palette = quantize(imageData.data, actualMaxColors);
      const indexedData = this.indexImageData(imageData, {
        palette,
        noDither: config.noDither,
        width: config.width,
        height: config.height
      });

      // Actually write frame data
      this.encoder.writeFrame(indexedData, config.width, config.height, {
        palette,
        delay: frameIntervalMs
      });

      // Progress reporting
      this.framesComplete++;
      const elapsed = videoElement.currentTime * 1000 - config.start;
      const progress =
        trueGifDuration > 0
          ? Math.min(1, Math.max(0, elapsed / trueGifDuration))
          : 1;

      // Generate thumbnail for the current frame
      const thumbnailDataUrl = this.generateFrameThumbnail(imageData);

      this.emit(
        'FRAMES_PROGRESS',
        progress,
        this.framesComplete,
        thumbnailDataUrl
      );

      // Seek to next frame start
      const nextFrameTimeMs = videoElement.currentTime * 1000 + frameIntervalMs;
      // Ensure we don't seek past the end time.
      if (nextFrameTimeMs >= config.end) {
        break; // Exit the loop to finalize the GIF
      }

      await this.asyncSeek(videoElement, nextFrameTimeMs / 1000);
    }
  }

  private finalizeGif(): Blob {
    // Finalize the GIF
    this.emit('FRAMES_COMPLETE');

    if (!this.encoder) {
      throw new Error('Encoder was not available for finalization.');
    }

    this.encoder.finish();
    const buffer = this.encoder.bytesView();
    const imageBlob = new Blob([buffer], { type: 'image/gif' });

    return imageBlob;
  }
}

export default GifService;
