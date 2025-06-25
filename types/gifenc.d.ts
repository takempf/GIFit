// gifenc.d.ts
declare module 'gifenc' {
  //
  // GIFEncoder
  //
  export interface GIFEncoderOptions {
    /** whether to auto-emit header on first frame (default: true) */
    auto?: boolean;
    /** initial chunk size for the internal stream (default: 4096) */
    initialCapacity?: number;
  }

  export interface GIFFrameOptions {
    /** use transparent pixels? */
    transparent?: boolean;
    /** transparent color index (0–255) */
    transparentIndex?: number;
    /** frame delay in ms */
    delay?: number;
    /** override palette for this frame; if null, use global */
    palette?: number[][] | null;
    /** repeat count: -1=once, 0=forever, >0=iterations */
    repeat?: number;
    /** bits per pixel (default: 8) */
    colorDepth?: number;
    /** disposal method (-1 to auto) */
    dispose?: number;
    /** in manual mode, mark this as first frame */
    first?: boolean;
  }

  /** low-level byte-stream the encoder writes into */
  export interface GIFStream {
    reset(): void;
    writeByte(b: number): void;
    writeBytes(bytes: number[]): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }

  export interface GIFEncoder {
    /** reset internal state and buffer */
    reset(): void;
    /** finish writing (writes trailer byte) */
    finish(): void;
    /** get the accumulated bytes */
    bytes(): Uint8Array;
    /** get a Uint8Array view of the buffer */
    bytesView(): Uint8Array;
    /** direct access to the internal buffer */
    readonly buffer: Uint8Array;
    /** direct access to the internal write-stream */
    readonly stream: GIFStream;
    /** write the literal GIF header ("GIF89a") */
    writeHeader(): void;

    /**
     * add a frame to the GIF
     * @param index  indexed-color pixel data
     * @param width  frame width in px
     * @param height frame height in px
     * @param opts   frame options
     */
    writeFrame(
      index: Uint8Array | Uint8ClampedArray,
      width: number,
      height: number,
      opts?: GIFFrameOptions
    ): void;
  }

  /**
   * Create a new encoder instance.
   * @param opts encoder options
   */
  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoder;
  export default GIFEncoder;

  //
  // Quantization (from pnnquant2.js)
  //
  export function quantize(
    pixels: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444';
      oneBitAlpha?: boolean | number;
      clearAlpha?: boolean;
      clearAlphaThreshold?: number;
      clearAlphaColor?: number;
      palette?: number[][];
    }
  ): number[][];

  //
  // Palette-based helpers (from palettize.js)
  //
  export function prequantize(
    pixels: Uint8Array | Uint8ClampedArray,
    /** max number of colors to output */
    maxColors: number
  ): { pixels: Uint8Array; palette: number[][] };

  export function applyPalette(
    pixels: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    options?: { format?: 'rgb565' | 'rgb444' | 'rgba4444' }
  ): Uint8Array;

  export function nearestColorIndex(
    color: number[] /* [r,g,b(,a)] */,
    palette: number[][]
  ): number;

  export function nearestColor(
    color: number[] /* [r,g,b(,a)] */,
    palette: number[][]
  ): number[];

  export function nearestColorIndexWithDistance(
    color: number[] /* [r,g,b(,a)] */,
    palette: number[][]
  ): { index: number; distance: number };

  export function snapColorsToPalette(
    pixels: Uint8Array | Uint8ClampedArray,
    palette: number[][]
  ): Uint8Array;
}
