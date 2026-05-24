import EventEmitter from 'eventemitter3';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { createLogger } from '@shared/utils/logger';
import floydSteinberg from '@shared/utils/dither';

type Palette = [number, number, number][];

// TODO centralize this
const MAX_QUALITY = 10;

import { GifConfig, GifCompleteData } from '@shared/types';

/**
 * Compares two ImageData objects to check if they are visually similar within a threshold.
 * Uses Mean Squared Error (MSE) to determine similarity.
 * @param frame1 First frame
 * @param frame2 Second frame
 * @param threshold MSE threshold. 0 means exact match. Higher values are more tolerant.
 *                  Good starting point: 10-20.
 */
export function areFramesEqual(
  frame1: ImageData,
  frame2: ImageData,
  threshold: number = 15
): boolean {
  if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
    return false;
  }

  const data1 = frame1.data;
  const data2 = frame2.data;
  const len = data1.length;
  let sumSquaredDiff = 0;

  // Optimization: check exact match first
  // if (threshold === 0) ... loop through and check exact equality

  for (let i = 0; i < len; i += 4) {
    // RGB only, ignore Alpha for now as it's usually 255 in video
    const rDiff = data1[i] - data2[i];
    const gDiff = data1[i + 1] - data2[i + 1];
    const bDiff = data1[i + 2] - data2[i + 2];

    sumSquaredDiff += rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
  }

  // Calculate MSE per channel
  // Total pixels = len / 4. Total channels considered = 3.
  const mse = sumSquaredDiff / ((len / 4) * 3);

  return mse <= threshold;
}

interface IndexingOptions {
  noDither?: boolean;
  palette: number[][];
  width: number;
  height: number;
}

const PALETTE_WEIGHT = 0.2;

/**
 * Service for creating GIFs from HTMLVideoElement frames using gifenc.
 *
 * Emits:
 * - 'COMPLETE' (data: GifCompleteData)
 * - 'FRAMES_PROGRESS' (ratio: number, frameCount: number, frameDataUrl?: string, stage?: string)
 * - 'FRAMES_COMPLETE'
 * - 'ABORT'
 * - 'ERROR' (error: Error)
 */
const logger = createLogger('GifService');

class GifService extends EventEmitter {
  private encoder: GIFEncoder | null = null;
  private aborted: boolean = false;
  private framesComplete: number = 0;
  private canvasEl: HTMLCanvasElement | null;
  private context: CanvasRenderingContext2D | null;

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
    logger.log('Creating GIF with config:', config);

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
    } catch (error: unknown) {
      const initError = new Error(
        `Failed to initialize GIFEncoder: ${(error as Error)?.message || error}`
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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const gifData = {
        dataUrl,
        width: config.width,
        height: config.height,
        size: blob.size
      };

      // Frame collection complete, finish up
      logger.log('GIF processing complete.');
      this.emit('COMPLETE', gifData);

      return gifData;
    } catch (error: unknown) {
      logger.error('GIF creation failed:', error);
      if (!this.aborted) {
        this.emit(
          'ERROR',
          new Error(
            `GIF creation failed: ${(error as Error)?.message || error}`
          )
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
    logger.log('Aborting GIF creation');
    this.aborted = true;

    // The async loop in processFrames will check this.aborted and stop.
    this.encoder = null; // Allow GC, stops further frame writes

    if (this.listenerCount('ABORT') > 0) {
      this.emit('ABORT');
    }
    logger.log('GIF creation aborted');
  }

  destroy(): void {
    logger.log('Destroying GifService');
    this.abort(); // Stop any ongoing process
    this.removeAllListeners();

    this.canvasEl = null; // Help GC
    this.context = null; // Help GC
    logger.log('GifService destroyed');
  }

  private seek(video: HTMLVideoElement, time: number): void {
    video.currentTime = time;
    video.pause(); // ensure we don't accidentally play
  }

  // Seeks video to a time, resolving on 'seeked' event.
  private asyncSeek(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const doneSeeking = () => {
        video.removeEventListener('seeked', doneSeeking);
        video.removeEventListener('error', onError);
        // Use rAF to wait for the browser to paint the frame
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
    config: GifConfig
  ): ImageData {
    if (!this.context || !this.canvasEl) {
      throw new Error('Canvas context or canvas element not found.');
    }

    // We can't access image data directly from the video
    // So we copy image data from video to canvas
    this.context.drawImage(
      videoElement,
      config.cropX ?? 0,
      config.cropY ?? 0,
      config.cropW ?? videoElement.videoWidth,
      config.cropH ?? videoElement.videoHeight,
      0,
      0,
      config.width,
      config.height
    );

    // We can access the image data directly from the canvas
    const imageData = this.context.getImageData(0, 0, config.width, config.height);

    return imageData;
  }

  private downsampleFrame(
    videoElement: HTMLVideoElement,
    width: number,
    height: number,
    config: GifConfig
  ): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Failed to get context for downsampling');
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      videoElement,
      config.cropX ?? 0,
      config.cropY ?? 0,
      config.cropW ?? videoElement.videoWidth,
      config.cropH ?? videoElement.videoHeight,
      0,
      0,
      width,
      height
    );
    return ctx.getImageData(0, 0, width, height);
  }

  private async sampleFrames(
    config: GifConfig,
    videoElement: HTMLVideoElement,
    count: number = 10
  ): Promise<ImageData[]> {
    const duration = config.end - config.start;
    const interval = duration / (count - 1);
    const samples: ImageData[] = [];

    // Use a smaller dimension for palette generation to speed it up
    // 1/4 of the size or max 256px, whichever is smaller
    const scale = Math.min(1, 256 / Math.max(config.width, config.height));
    const sampleWidth = Math.max(1, Math.floor(config.width * scale));
    const sampleHeight = Math.max(1, Math.floor(config.height * scale));

    for (let i = 0; i < count; i++) {
      const time = config.start + interval * i;
      await this.asyncSeek(videoElement, time / 1000);
      samples.push(
        this.downsampleFrame(videoElement, sampleWidth, sampleHeight, config)
      );

      // Report progress for palette gathering
      // Scale 0 to 1 relative to the sample count, but weighted by PALETTE_WEIGHT in the overall progress
      const progress = (i + 1) / count;
      const weightedProgress = progress * PALETTE_WEIGHT;
      this.emit(
        'FRAMES_PROGRESS',
        weightedProgress,
        0,
        undefined,
        'Gathering Palette...'
      );
    }

    return samples;
  }

  private async generateGlobalPalette(
    config: GifConfig,
    videoElement: HTMLVideoElement,
    maxColors: number
  ): Promise<number[][]> {
    logger.log('Generating global palette...');
    const samples = await this.sampleFrames(config, videoElement, 10); // Sample 10 frames

    // Combine all samples into one giant buffer for quantization
    const totalPixels = samples.reduce(
      (acc, sample) => acc + sample.data.length,
      0
    );
    const combinedData = new Uint8ClampedArray(totalPixels);
    let offset = 0;
    for (const sample of samples) {
      combinedData.set(sample.data, offset);
      offset += sample.data.length;
    }

    const palette = quantize(combinedData, maxColors);
    logger.log('Global palette generated');
    return palette;
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
        palette as Palette
      );
      indexedData = applyPalette(ditheredRgbaData, palette as Palette, {
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

    // Generate global palette once
    const globalPalette = await this.generateGlobalPalette(
      config,
      videoElement,
      actualMaxColors
    );

    // Reset video position to start after palette sampling
    await this.asyncSeek(videoElement, config.start / 1000);

    // Emit a leading frame preview so the UI immediately shows
    // the cropped content instead of the stale configuring preview.
    if (this.context && this.canvasEl) {
      this.getFrameImageData(videoElement, config);
      const leadingFrame = this.canvasEl.toDataURL('image/jpeg', 0.5);
      this.emit('FRAMES_PROGRESS', PALETTE_WEIGHT, 0, leadingFrame, 'Processing Frames...');
    }

    // Deduplication state
    let pendingFrame: { data: ImageData; duration: number } | null = null;

    // Helper to write a frame after processing
    const writeFrame = (frame: { data: ImageData; duration: number }) => {
      // Use the global palette
      const indexedData = this.indexImageData(frame.data, {
        palette: globalPalette as Palette,
        noDither: config.noDither,
        width: config.width,
        height: config.height
      });

      if (!this.encoder) return;

      this.encoder.writeFrame(indexedData, config.width, config.height, {
        palette: globalPalette as Palette,
        delay: frame.duration
      });
    };

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
        config
      );

      // Check for deduplication
      if (pendingFrame && areFramesEqual(pendingFrame.data, imageData)) {
        // Frames are equal, just extend the duration of the pending frame
        pendingFrame.duration += frameIntervalMs;
      } else {
        // Frames differ (or first frame), flush pending if exists
        if (pendingFrame) {
          writeFrame(pendingFrame);
        }
        // Set new pending frame
        pendingFrame = { data: imageData, duration: frameIntervalMs };
      }

      // Progress reporting
      this.framesComplete++;
      const elapsed = videoElement.currentTime * 1000 - config.start;
      const progress =
        trueGifDuration > 0
          ? Math.min(1, Math.max(0, elapsed / trueGifDuration))
          : 1;

      // Calculate total weighted progress
      // total = PALETTE_WEIGHT + (progress * (1 - PALETTE_WEIGHT))
      const weightedProgress = PALETTE_WEIGHT + progress * (1 - PALETTE_WEIGHT);

      // Sample frame preview - only generate data URL every 5 frames to reduce overhead
      // Use JPEG with low quality for faster encoding and smaller transfer size
      const frameDataUrl =
        this.framesComplete % 5 === 1
          ? this.canvasEl.toDataURL('image/jpeg', 0.5)
          : undefined;

      this.emit(
        'FRAMES_PROGRESS',
        weightedProgress,
        this.framesComplete,
        frameDataUrl,
        'Processing Frames...'
      );

      // Seek to next frame start
      const nextFrameTimeMs = videoElement.currentTime * 1000 + frameIntervalMs;
      // Ensure we don't seek past the end time.
      if (nextFrameTimeMs >= config.end) {
        break; // Exit the loop to finalize the GIF
      }

      await this.asyncSeek(videoElement, nextFrameTimeMs / 1000);
    }

    // Flush any remaining pending frame
    if (pendingFrame && !this.aborted) {
      writeFrame(pendingFrame);
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
    const imageBlob = new Blob([buffer as unknown as BlobPart], {
      type: 'image/gif'
    });

    return imageBlob;
  }
}

export default GifService;
