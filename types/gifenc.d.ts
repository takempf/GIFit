declare module 'gifenc' {
  export class GIFEncoder {
    constructor(options?: { auto?: boolean; initialCapacity?: number });
    reset(): void;
    setDelay(delay: number): void;
    setRepeat(repeat: number): void;
    setTransparent(color: number | false): void;
    addFrame(
      ctx: CanvasRenderingContext2D,
      options?: {
        copy?: boolean;
        delay?: number;
        palette?: number[][] | null;
        transparent?: boolean;
        disposal?: number;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    stream(): ReadableStream<Uint8Array>;
    write(chunk: Uint8Array): void;
    end(): void;
  }

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

  export function applyPalette(
    pixels: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    options?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444';
    }
  ): Uint8Array;
}
