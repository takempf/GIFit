import { create } from 'zustand';

import GifService from '@/services/GifService';
import type { GifConfig, GifCompleteData } from '@/services/GifService'; // Import types
import { getVideoFrameColors } from '@/utils/getVideoFrameColors';

// Define the possible statuses for the GIF creation process
type GifStatus =
  | 'idle' // Not doing anything
  | 'processing' // Actively creating the GIF
  | 'complete' // GIF creation finished successfully
  | 'error' // An error occurred
  | 'aborted'; // User cancelled the process

interface GifState {
  status: GifStatus;
  name: string;
  width: number;
  height: number;
  progress: number; // 0 to 1
  frameCount: number;
  processedFrameCount: number;
  error: string | null;
  result: GifCompleteData | null;
  colors: [string, string, string, string];
  generationId: string | null;
  _serviceInstance: GifService | null;
}

interface GifActions {
  createGif: (
    config: GifConfig,
    videoElement: HTMLVideoElement
  ) => Promise<void>; // Make async if needed for setup before returning
  abortGif: () => void;
  reset: () => void;
  setName: (name: string) => void;
}

type GifStore = GifState & GifActions;

export const initialState: GifState = {
  // Added export
  status: 'idle',
  name: 'untitled',
  width: 320,
  height: 240,
  progress: 0,
  frameCount: 0,
  processedFrameCount: 0,
  error: null,
  result: null,
  colors: ['#000', '#000', '#000', '#000'],
  generationId: null,
  _serviceInstance: null
};

export const useGifStore = create<GifStore>((set, get) => ({
  ...initialState,

  async createGif(config, videoElement) {
    // Create a service instance or use existing one
    const existingServiceInstance = get()._serviceInstance;
    const service = existingServiceInstance ?? new GifService();

    if (!service) {
      // Should not happen based on above line, but good practice
      set({ status: 'error', error: 'Failed to initialize GifService.' });
      return;
    }

    // Reset state for a new creation process
    set({
      ...initialState,
      frameCount: (config.fps * (config.end - config.start)) / 1000,
      name: config.name,
      width: config.width,
      height: config.height,
      colors: getVideoFrameColors(videoElement),
      generationId: Date.now().toString(),
      status: 'processing',
      _serviceInstance: service
    });

    // --- Setup Event Listeners ---
    const onFramesProgress = (ratio: number, frameCount: number) => {
      set({
        status: 'processing',
        progress: ratio,
        processedFrameCount: frameCount
      });
    };

    const onComplete = (data: GifCompleteData) => {
      set({ status: 'complete', result: data, _serviceInstance: null });
    };

    const onError = (err: Error) => {
      console.error('GifService Error:', err);
      set({
        status: 'error',
        error: err.message || 'An unknown error occurred.',
        _serviceInstance: null
      });
      service.destroy();
    };

    const onAbort = () => {
      // State might already be 'aborted' if triggered by get().abortGif()
      // This handles cases where the service aborts internally or finishes aborting
      const serviceToClean = get()._serviceInstance; // Capture instance before state change
      if (get().status !== 'aborted') {
        set({ status: 'aborted', _serviceInstance: null });
      } else {
        // If status was already 'aborted' (e.g. by abortGif action), still ensure instance is cleared from state
        set({ _serviceInstance: null });
      }
      serviceToClean?.destroy(); // Call destroy on the captured instance
    };

    service.on('frames progress', onFramesProgress);
    service.on('complete', onComplete);
    service.on('error', onError);
    service.on('abort', onAbort);

    // --- Start GIF Creation ---
    try {
      // Note: createGif itself is synchronous in the service,
      // but the process it starts is async via events.
      service.createGif(config, videoElement);
      // No need to await here, events will update the state
    } catch (err: unknown) {
      // Catch synchronous errors during setup (e.g., context creation)
      if (err instanceof Error) {
        onError(err);
      } else {
        onError(new Error(String(err)));
      }
    }
  },

  abortGif() {
    const service = get()._serviceInstance;
    const currentStatus = get().status;

    if (service && currentStatus === 'processing') {
      set({ status: 'aborted' }); // Set status immediately for responsiveness
      service.abort(); // Trigger the service's abort logic
      // The 'abort' event handler will do the final cleanup (_serviceInstance = null)
    } else if (service) {
      // If service exists but not processing, ensure cleanup
      service.destroy();
      set({ _serviceInstance: null });
    }
  },

  reset() {
    get().abortGif(); // Ensure any active process is stopped and cleaned up
    set(initialState); // Reset state to initial values
  },

  setName(name: string) {
    set({ name });
  }
}));
