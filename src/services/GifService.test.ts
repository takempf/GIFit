import { describe, it, expect, vi, beforeEach, afterEach, MockedObject } from 'vitest';
import GifService from './GifService'; // Assuming default export
import type { GifConfig, GifCompleteData } from './GifService';

// Mock @/utils/logger
vi.mock('@/utils/logger', () => ({
  log: vi.fn(),
}));

// Mock gifenc: Factory returns simple vi.fn()s.
// Behavior will be configured in beforeEach.
vi.mock('gifenc', () => ({
  GIFEncoder: vi.fn(),
  quantize: vi.fn(),
  applyPalette: vi.fn(),
}));

// Mock @/utils/dither: Factory returns a simple vi.fn().
// Behavior will be configured in beforeEach.
vi.mock('@/utils/dither', () => ({
  default: vi.fn(),
}));

// Canvas API Mock placeholder - will be refined in describe/beforeEach
let mockCtx: any;
let mockCanvas: any;

// HTMLMediaElement (Video) Mock
// Define mockEncoderInstance here to be accessible in beforeEach and tests
let mockEncoderInstance: {
  writeFrame: ReturnType<typeof vi.fn>;
  finish: ReturnType<typeof vi.fn>;
  bytesView: ReturnType<typeof vi.fn>;
};

const createMockVideoElement = () => ({
  currentTime: 0,
  videoWidth: 640,
  videoHeight: 360,
  duration: 10, // Example duration
  paused: true,
  readyState: 4, // HTMLMediaElement.HAVE_ENOUGH_DATA
  pause: vi.fn(),
  play: vi.fn(),
  // Store callbacks on the instance itself for later triggering
  _callbacks: {} as Record<string, Array<() => void>>,
  addEventListener: vi.fn(function(this: any, event, cb) { // Use function() to access 'this' if needed, or ensure instance is passed
    if (!this._callbacks[event]) {
      this._callbacks[event] = [];
    }
    this._callbacks[event].push(cb);
    // Specific handling for seeked for the old test structure, can be generalized
    if (event === 'seeked') {
      this._seekedCallback = cb;
    }
  }),
  removeEventListener: vi.fn(function(this: any, event, cb) {
    if (this._callbacks[event]) {
      this._callbacks[event] = this._callbacks[event].filter(fn => fn !== cb);
    }
    if (event === 'seeked' && this._seekedCallback === cb) {
        this._seekedCallback = null;
    }
  }),
  dispatchEvent: vi.fn(), // Can be enhanced to call stored callbacks
  _seekedCallback: null as (() => void) | null, // Keep for existing tests, but _callbacks is more robust
});


describe('GifService', () => {
  let service: GifService;
  let currentMockVideoElement: ReturnType<typeof createMockVideoElement>;

  // Declare imported mocks here to be typed and used in tests
  let GIFEncoderMock: ReturnType<typeof vi.fn>;
  let quantizeMock: ReturnType<typeof vi.fn>;
  let applyPaletteMock: ReturnType<typeof vi.fn>;
  let floydSteinbergMock: ReturnType<typeof vi.fn>;
  let mockServiceEmit: ReturnType<typeof vi.spyOn>;


  beforeEach(async () => {
    // Import the mocked versions
    const gifenc = await import('gifenc');
    GIFEncoderMock = gifenc.GIFEncoder;
    quantizeMock = gifenc.quantize;
    applyPaletteMock = gifenc.applyPalette;

    const dither = await import('@/utils/dither');
    floydSteinbergMock = dither.default as ReturnType<typeof vi.fn>;

    // Setup the global mockEncoderInstance for GIFEncoder to return
    mockEncoderInstance = {
      writeFrame: vi.fn(),
      finish: vi.fn(),
      bytesView: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    };
    GIFEncoderMock.mockReturnValue(mockEncoderInstance);
    quantizeMock.mockReturnValue([]);
    applyPaletteMock.mockReturnValue(new Uint8Array(100 * 100));

    // Reset mocks for canvas
    mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(100 * 100 * 4).fill(128) }),
      imageSmoothingEnabled: false,
    };
    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      width: 0,
      height: 0,
      style: { width: '', height: '' },
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      // Ensure a default HTMLElement is returned for other cases if needed, or throw
      // For now, assuming only 'canvas' is created by the service constructor directly
      return document.createElement(tagName); // Fallback to actual createElement for other tags
    });

    // Reset video element mock
    // Need to assign to the global mockVideoElement if it's used directly by service,
    // or pass currentMockVideoElement to service methods.
    // For now, GifService methods take videoElement as an argument, so this is fine.
    currentMockVideoElement = createMockVideoElement();
    // Global mockVideoElement is not used in this setup yet as it's passed as arg.

    // No need to clear dynamicGifencMocks anymore, directly clear the imported mocks if necessary,
    // but they are freshly configured by mockReturnValue above for GIFEncoder factory products.
    // Individual functions quantizeMock and applyPaletteMock are also freshly configured.
    // Clearing the top-level mocks (GIFEncoderMock, quantizeMock, applyPaletteMock) themselves:
    GIFEncoderMock.mockClear(); // Clears call counts etc. for the constructor mock
    quantizeMock.mockClear();
    applyPaletteMock.mockClear();
    // Re-configure defaults after clearing, because mockClear also clears mockReturnValue
    GIFEncoderMock.mockReturnValue(mockEncoderInstance);
    quantizeMock.mockReturnValue([]);
    applyPaletteMock.mockReturnValue(new Uint8Array(100*100));
    mockEncoderInstance.bytesView.mockReturnValue(new Uint8Array([1,2,3]));


    // Reset dither mock
    floydSteinbergMock.mockClear();
    floydSteinbergMock.mockImplementation((data) => data);


    // Create a new GifService instance for each test
    service = new GifService();
    mockServiceEmit = vi.spyOn(service, 'emit');
  });

  afterEach(() => {
    if (service) {
      service.destroy(); // Clean up service resources like event listeners
    }
    vi.restoreAllMocks(); // This will also clear spies like document.createElement
  });

  // Placeholder for tests
  it('constructor should initialize canvas and context', () => {
    expect(document.createElement).toHaveBeenCalledWith('canvas');
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d', { willReadFrequently: true });
    expect(mockCtx.imageSmoothingEnabled).toBe(false);
  });

  it('constructor should throw if getContext returns null', () => {
    mockCanvas.getContext.mockReturnValueOnce(null); // Override for this test
    expect(() => new GifService()).toThrow('Failed to get 2D rendering context from canvas.');
  });

  describe('createGif', () => {
    beforeEach(() => {
      vi.useFakeTimers(); // Ensure timers are mocked for this describe block too
    });
    // No afterEach for vi.clearAllTimers() here, outer afterEach handles vi.restoreAllMocks()

    const baseConfig: GifConfig = {
      quality: 10, // Max quality for predictable maxColors
      width: 100,
      height: 100,
      start: 0, // ms
      end: 1000, // ms (1 second duration)
      fps: 10,
      // maxColors will be derived from quality: (10/10)*256 = 256
    };

    it('basic initialization: pauses video, calls GIFEncoder, sets canvas dims, starts seek', () => {
      currentMockVideoElement.paused = false;
      service.createGif(baseConfig, currentMockVideoElement as any);

      expect(currentMockVideoElement.pause).toHaveBeenCalled();
      expect(GIFEncoderMock).toHaveBeenCalled(); // Check if the constructor mock was called
      expect(mockCanvas.width).toBe(baseConfig.width);
      expect(mockCanvas.height).toBe(baseConfig.height);
      expect(currentMockVideoElement.addEventListener).toHaveBeenCalledWith('seeked', expect.any(Function));
      expect(currentMockVideoElement.currentTime).toBe(baseConfig.start / 1000);
    });

    it('processes a single frame after seeked and emits progress', async () => {
      const mockEmit = vi.spyOn(service, 'emit');
      service.createGif(baseConfig, currentMockVideoElement as any);

      // Manually trigger seeked callback
      expect(currentMockVideoElement._seekedCallback).toBeInstanceOf(Function);
      if (currentMockVideoElement._seekedCallback) {
        currentMockVideoElement._seekedCallback();
      }

      // Wait for the 50ms timeout in _asyncSeek
      await vi.advanceTimersByTimeAsync(50);
      // Allow _addFrame's setTimeout(..., 0) to execute
      await vi.runAllTimersAsync();

      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        currentMockVideoElement,
        0, 0, currentMockVideoElement.videoWidth, currentMockVideoElement.videoHeight, // Source rect
        0, 0, baseConfig.width, baseConfig.height // Destination rect
      );
      expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, baseConfig.width, baseConfig.height);

      // Max colors derived from quality: (10/10)*256 = 256
      // actualMaxColors = Math.max(2, Math.min(256, derivedMaxColors))
      // For quality 10, derived is 256.
      expect(quantizeMock).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 256);

      // Check if dither is called (default behavior, not noDither)
      expect(floydSteinbergMock).toHaveBeenCalled();
      // applyPalette is called with dithered data (or original if dither is pass-through)
      expect(applyPaletteMock).toHaveBeenCalledWith(floydSteinbergMock.mock.results[0].value, quantizeMock.mock.results[0].value, 'nearest');

      const expectedFrameDelay = 1000 / baseConfig.fps; // 100ms
      expect(mockEncoderInstance.writeFrame).toHaveBeenCalledWith(
        applyPaletteMock.mock.results[0].value, // indexed data
        baseConfig.width,
        baseConfig.height,
        { palette: quantizeMock.mock.results[0].value, delay: expectedFrameDelay }
      );

      // Check for 'frames progress' event
      // For a single frame processed at start=0, currentVideoTime=0, progress might be 0 or close to it.
      // FrameInterval = 100ms. GifDuration = 1000ms. trueGifDuration = 1000ms.
      // elapsed = currentTimeMs(0) - config.start(0) = 0.
      // progress = 0 / 1000 = 0.
      // framesComplete = 1.
      expect(mockEmit).toHaveBeenCalledWith('frames progress', 0, 1);

      // It will try to schedule the next frame. We are not testing multiple frames here yet.
    });

    it('uses applyPalette directly if config.noDither is true', async () => {
      const configWithNoDither = { ...baseConfig, noDither: true };
      service.createGif(configWithNoDither, currentMockVideoElement as any);

      if (currentMockVideoElement._seekedCallback) {
        currentMockVideoElement._seekedCallback();
      }
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();

      expect(floydSteinbergMock).not.toHaveBeenCalled();
      // applyPalette called with original imageData.data (mocked) and not dithered data
      expect(applyPaletteMock).toHaveBeenCalledWith(mockCtx.getImageData().data, quantizeMock.mock.results[0].value, 'nearest');
      expect(mockEncoderInstance.writeFrame).toHaveBeenCalled();
    });

  });

  describe('Full GIF Lifecycle (Multiple Frames & Completion)', () => {
    const multiFrameConfig: GifConfig = {
      quality: 10, width: 50, height: 50,
      start: 0, end: 200, fps: 10 // 200ms duration, 10fps = 2 frames (0ms, 100ms)
    }; // Frame delays = 100ms. Frames at t=0, t=100. Processing ends before t=200.

    it('should process all frames and emit complete events', async () => {
      service.createGif(multiFrameConfig, currentMockVideoElement as any);

      // Frame 1 (t=0)
      expect(currentMockVideoElement._seekedCallback).toBeInstanceOf(Function);
      currentMockVideoElement.currentTime = 0; // Simulate seek to 0
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50); // _asyncSeek delay
      await vi.runAllTimersAsync();         // _addFrame setTimeout 0

      expect(mockEncoderInstance.writeFrame).toHaveBeenCalledTimes(1);
      expect(mockEncoderInstance.writeFrame).toHaveBeenLastCalledWith(
        expect.any(Uint8Array), 50, 50, { palette: expect.any(Array), delay: 100 }
      );
      expect(mockServiceEmit).toHaveBeenCalledWith('frames progress', 0, 1); // elapsed = 0 - 0 = 0. progress = 0 / 200 = 0.

      // Frame 2 (t=100)
      // _addFrame schedules next seek. currentTime should be updated by service's _asyncSeek.
      expect(currentMockVideoElement._seekedCallback).toBeInstanceOf(Function); // New callback from new _asyncSeek
      currentMockVideoElement.currentTime = 100 / 1000; // Simulate seek to 0.1s (100ms)
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50); // _asyncSeek delay
      await vi.runAllTimersAsync();         // _addFrame setTimeout 0

      expect(mockEncoderInstance.writeFrame).toHaveBeenCalledTimes(2);
      expect(mockEncoderInstance.writeFrame).toHaveBeenLastCalledWith(
        expect.any(Uint8Array), 50, 50, { palette: expect.any(Array), delay: 100 }
      );
      // elapsed = 100 - 0 = 100. progress = 100 / 200 = 0.5.
      expect(mockServiceEmit).toHaveBeenCalledWith('frames progress', 0.5, 2);

      // Completion - nextFrameTime (200ms) >= config.end (200ms)
      expect(mockServiceEmit).toHaveBeenCalledWith('frames complete');
      expect(mockEncoderInstance.finish).toHaveBeenCalledTimes(1);
      expect(mockEncoderInstance.bytesView).toHaveBeenCalledTimes(1);
      const expectedBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/gif' });
      expect(mockServiceEmit).toHaveBeenCalledWith('complete', {
        blob: expectedBlob, // mockEncoder.bytesView returns Uint8Array([1,2,3])
        width: multiFrameConfig.width,
        height: multiFrameConfig.height,
      });

      // Check if encoder is nullified (indirectly, e.g. by trying to abort a completed one)
      service.abort(); // Should do nothing harmful
    });
  });

  describe('Abort Functionality', () => {
    const abortConfig: GifConfig = {
      quality: 10, width: 50, height: 50,
      start: 0, end: 500, fps: 10 // 5 frames
    };

    it('abort before createGif should allow normal creation', () => {
      service.abort(); // Abort first
      service.createGif(abortConfig, currentMockVideoElement as any);
      expect(GIFEncoderMock).toHaveBeenCalled(); // Check if processing starts
      // Further checks similar to basic initialization could be added
    });

    it('abort during frame processing stops further frames and emits abort event', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      service.createGif(abortConfig, currentMockVideoElement as any);

      // Process one frame
      currentMockVideoElement.currentTime = 0;
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(mockEncoderInstance.writeFrame).toHaveBeenCalledTimes(1);
      mockServiceEmit.mockClear(); // Clear emit calls up to this point

      // Let the first frame processing (including setting the timeout for the next _addFrame call) complete.
      // This means the first _addFrame ran, wrote frame 1.
      // It then called _asyncSeek for frame 2.
      // currentMockVideoElement._seekedCallback is now the one for frame 2's seek.
      // That _asyncSeek promise for frame 2 is pending.
      // The setTimeout that would set pendingFrameTimeoutId (for frame 2's _addFrame) has NOT run yet.

      // To ensure pendingFrameTimeoutId is set by the logic following frame 1's _asyncSeek for frame 2:
      // We need to simulate the completion of the _asyncSeek for frame 2.
      expect(currentMockVideoElement._seekedCallback).toBeInstanceOf(Function); // Callback for frame 2's seek
      currentMockVideoElement.currentTime = 100 / 1000; // Simulate video time for frame 2
      currentMockVideoElement._seekedCallback!();       // Simulate frame 2 seeked
      await vi.advanceTimersByTimeAsync(50);          // Allow _asyncSeek for frame 2 to resolve

      // Now, the code inside the first _addFrame's setTimeout (which handles frame 1's logic continuation)
      // has resolved its `await _asyncSeek` for frame 2.
      // It should now set `this.pendingFrameTimeoutId = setTimeout(...)` for frame 2's _addFrame.
      // This timeout is with 0ms delay. We must NOT advance it yet if we want to catch it.
      // So, at this point, pendingFrameTimeoutId should be set.

      const abortListener = vi.fn();
      service.on('abort', abortListener);
      service.abort(); // This should now find a non-null pendingFrameTimeoutId

      expect(abortListener).toHaveBeenCalledTimes(1);
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(mockEncoderInstance.finish).not.toHaveBeenCalled();

      // Try to advance time to see if more frames are processed
      await vi.runAllTimersAsync(); // Try to run any pending timers (should be none effective for frames)

      // Still 1, no new frames
      expect(mockEncoderInstance.writeFrame).toHaveBeenCalledTimes(1);
      clearTimeoutSpy.mockRestore();
    });

    it('abort after completion does nothing major', async () => {
      const shortConfig: GifConfig = { ...abortConfig, end: 100 }; // 1 frame
      service.createGif(shortConfig, currentMockVideoElement as any);
      currentMockVideoElement.currentTime = 0;
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync(); // Process and complete

      expect(mockServiceEmit).toHaveBeenCalledWith('complete', expect.any(Object));
      mockServiceEmit.mockClear();

      service.abort();
      expect(mockServiceEmit).not.toHaveBeenCalledWith('abort'); // Already completed, no pending ops
    });
  });

  describe('Error Handling', () => {
    const errorConfig: GifConfig = { quality: 5, width: 10, height: 10, start: 0, end: 100, fps: 10 };

    it('emits error if GIFEncoder factory throws', () => {
      GIFEncoderMock.mockImplementationOnce(() => { throw new Error('GIFEncoder init failed'); });
      service.createGif(errorConfig, currentMockVideoElement as any);
      expect(mockServiceEmit).toHaveBeenCalledWith('error', new Error('Failed to initialize GIFEncoder: GIFEncoder init failed'));
    });

    it('emits error if initial video seek fails (error event)', async () => {
      // To ensure _asyncSeek is defined on the instance before spying
      expect(typeof (service as any)._asyncSeek).toBe('function');
      const asyncSeekSpy = vi.spyOn(service as any, '_asyncSeek').mockRejectedValueOnce(new Error('Simulated seek failure'));

      service.createGif(errorConfig, currentMockVideoElement as any);

      // Need to wait for the async operations within createGif/startFrameProcessing to complete
      await vi.runAllTimersAsync(); // Allow promises to settle

      expect(mockServiceEmit).toHaveBeenCalledWith('error', new Error('Error during initial video seek: Simulated seek failure'));
      asyncSeekSpy.mockRestore();
    });

    it('emits error if drawImage throws', async () => {
      mockCtx.drawImage.mockImplementationOnce(() => { throw new Error('drawImage failed'); });
      service.createGif(errorConfig, currentMockVideoElement as any);
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(mockServiceEmit).toHaveBeenCalledWith('error', new Error('Error processing frame: drawImage failed'));
    });

    it('emits error if writeFrame throws', async () => {
      mockEncoderInstance.writeFrame.mockImplementationOnce(() => { throw new Error('writeFrame failed'); });
      service.createGif(errorConfig, currentMockVideoElement as any);
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(mockServiceEmit).toHaveBeenCalledWith('error', new Error('Error processing frame: writeFrame failed'));
    });

    it('emits error if finish throws', async () => {
      mockEncoderInstance.finish.mockImplementationOnce(() => { throw new Error('finish failed'); });
      const shortConfig = { ...errorConfig, end: 50 }; // Ensure it tries to finish
      service.createGif(shortConfig, currentMockVideoElement as any);
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(mockServiceEmit).toHaveBeenCalledWith('error', new Error('GIF finalization failed: finish failed'));
    });

    it('emits error for maxColors < 2', () => {
      service.createGif({ ...errorConfig, maxColors: 1 }, currentMockVideoElement as any);
      expect(mockServiceEmit).toHaveBeenCalledWith('error', new Error('config.maxColors must be 2-256. Received: 1'));
    });

    it('emits error for maxColors > 256', () => {
      service.createGif({ ...errorConfig, maxColors: 257 }, currentMockVideoElement as any);
      expect(mockServiceEmit).toHaveBeenCalledWith('error', new Error('config.maxColors must be 2-256. Received: 257'));
    });
  });

  describe('Configuration Variations', () => {
    it('uses config.maxColors if provided and valid', async () => {
      const configWithMaxColors: GifConfig = { quality: 1, width: 10, height: 10, start: 0, end: 100, fps: 10, maxColors: 128 };
      service.createGif(configWithMaxColors, currentMockVideoElement as any);
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(quantizeMock).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 128);
    });

    it('calculates maxColors from quality correctly (quality 10 = 256 colors)', async () => {
      const configQuality10: GifConfig = { quality: 10, width: 10, height: 10, start: 0, end: 100, fps: 10 };
      service.createGif(configQuality10, currentMockVideoElement as any);
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(quantizeMock).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 256);
    });

    it('calculates maxColors from quality correctly (quality 5 = 128 colors)', async () => {
      const configQuality5: GifConfig = { quality: 5, width: 10, height: 10, start: 0, end: 100, fps: 10 }; // MAX_QUALITY is 10
      // (5/10)*256 = 128
      service.createGif(configQuality5, currentMockVideoElement as any);
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(quantizeMock).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 128);
    });

    it('calculates maxColors and clamps to min 2 (quality 0.01 -> 2 colors)', async () => {
      const configQualityLow: GifConfig = { quality: 0.01, width: 10, height: 10, start: 0, end: 100, fps: 10 };
      // (0.01/10)*256 = 0.256 -> floor(0.256) = 0. Clamped to 2.
      service.createGif(configQualityLow, currentMockVideoElement as any);
      currentMockVideoElement._seekedCallback!();
      await vi.advanceTimersByTimeAsync(50);
      await vi.runAllTimersAsync();
      expect(quantizeMock).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 2);
    });
  });
});
