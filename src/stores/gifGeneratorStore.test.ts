import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll
} from 'vitest';
import { act } from '@testing-library/react';
// Import types separately, actual store will be dynamically imported after mocks
import type { GifConfig, GifCompleteData } from '@/services/GifService';
import type {
  GifState as ActualGifState,
  useGifStore as UseGifStoreType
} from './gifGeneratorStore';

// --- Mock GifService ---
// Define the actual mock functions that tests will interact with
let mockCreateGif = vi.fn();
let mockAbort = vi.fn();
let mockDestroy = vi.fn();
let mockOn = vi.fn();
let mockOff = vi.fn();
let mockRemoveAllListeners = vi.fn();
let eventListenersStore: Record<string, Array<(...args: any[]) => void>> = {};

// This is the instance that the mocked GifService constructor will return
// It will be assigned in beforeAll, so declare with let
let controlledMockGifServiceInstance: any;
// Old declaration remnants removed below

// Store type and initial state will be dynamically imported
let storeModule: any; // To hold the dynamically imported module
let actualInitialState: ActualGifState; // Still useful for typing getTestInitialState
let useGifStoreInTestScope: typeof UseGifStoreType; // Renamed for clarity
let MockedGifServiceClass: ReturnType<typeof vi.fn>; // To hold the mocked GifService class

beforeAll(async () => {
  // Initialize mocks that will be used by the factory
  mockCreateGif = vi.fn();
  mockAbort = vi.fn();
  mockDestroy = vi.fn();
  mockOn = vi.fn();
  mockOff = vi.fn();
  mockRemoveAllListeners = vi.fn();
  eventListenersStore = {};

  controlledMockGifServiceInstance = {
    createGif: mockCreateGif,
    abort: mockAbort,
    destroy: mockDestroy,
    on: mockOn,
    off: mockOff,
    removeAllListeners: mockRemoveAllListeners,
    get eventListeners() {
      return eventListenersStore;
    },
    _simulateEvent: (event: string, ...data: any[]) => {
      (eventListenersStore[event] || []).forEach((cb) => cb(...data));
    }
  };

  await vi.doMock('@/services/GifService', () => {
    return {
      default: vi.fn(() => controlledMockGifServiceInstance)
    };
  });

  await vi.doMock('@/utils/getVideoFrameColors', () => ({
    getVideoFrameColors: vi.fn()
  }));

  // Dynamically import the store AFTER mocks are set up
  storeModule = await import('./gifGeneratorStore');
  console.log('Dynamically imported storeModule:', storeModule);
  useGifStoreInTestScope = storeModule.useGifStore; // Assign hook first
  actualInitialState = storeModule.initialState; // Use the exported initialState
  console.log(
    'Type of useGifStoreInTestScope after import:',
    typeof useGifStoreInTestScope
  );
  console.log(
    'actualInitialState after import (is object):',
    typeof actualInitialState === 'object' && actualInitialState !== null
  );

  // Dynamically import the mocked GifService class itself for use in tests
  MockedGifServiceClass = (await import('@/services/GifService'))
    .default as ReturnType<typeof vi.fn>;

  // Mock console.error for onError handler (can be here or in describe)
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Define a baseline initial state for tests, derived from actualInitialState
// but ensuring _serviceInstance is null for clean resets.
const getTestInitialState = () => ({
  ...actualInitialState, // This will be defined after beforeAll
  _serviceInstance: null // Ensure service instance is reset
});

describe('useGifGeneratorStore', () => {
  let mockVideoElement: HTMLVideoElement;
  let actualMockGetVideoFrameColors: ReturnType<typeof vi.fn>; // This will be the vi.fn from the mock

  beforeEach(async () => {
    // Get the handle to the mocked getVideoFrameColors
    const utils = await import('@/utils/getVideoFrameColors');
    actualMockGetVideoFrameColors = utils.getVideoFrameColors as ReturnType<
      typeof vi.fn
    >;

    // Reset store to initial state values
    act(() => {
      useGifStoreInTestScope.setState(getTestInitialState());
    });

    // Reset mocks (the functions themselves, not the factory)
    mockCreateGif.mockClear();
    mockAbort.mockClear();
    mockDestroy.mockClear();
    mockOn.mockClear();
    mockOff.mockClear();
    mockRemoveAllListeners.mockClear();
    eventListenersStore = {}; // Reset the listeners store

    // Ensure the mock 'on' function is properly set up for chaining or callback storage
    mockOn.mockImplementation((event, callback) => {
      if (!eventListenersStore[event]) {
        eventListenersStore[event] = [];
      }
      eventListenersStore[event].push(callback);
      return controlledMockGifServiceInstance; // for chaining .on()
    });

    actualMockGetVideoFrameColors.mockClear();
    actualMockGetVideoFrameColors.mockReturnValue([
      '#111',
      '#222',
      '#333',
      '#444'
    ]); // Default return

    (console.error as vi.Mock).mockClear();

    // Create a fresh mock video element for tests that need it
    mockVideoElement = document.createElement('video');
    // Define properties JSDOM might not have by default
    Object.defineProperty(mockVideoElement, 'videoWidth', {
      value: 640,
      writable: true
    });
    Object.defineProperty(mockVideoElement, 'videoHeight', {
      value: 360,
      writable: true
    });
    Object.defineProperty(mockVideoElement, 'currentTime', {
      value: 0,
      writable: true
    });
    Object.defineProperty(mockVideoElement, 'duration', {
      value: 10,
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clears all mocks, including spies
  });

  it('should initialize with default values', () => {
    const state = useGifStoreInTestScope.getState();
    expect(state.status).toBe('idle');
    expect(state.progress).toBe(0);
    expect(state.name).toBe('untitled');
    expect(state.width).toBe(320); // from actualInitialState
    expect(state.height).toBe(240); // from actualInitialState
    expect(state.result).toBeNull();
    expect(state.error).toBeNull();
    expect(state._serviceInstance).toBeNull(); // Explicitly set to null in getTestInitialState
  });

  describe('setName action', () => {
    it('should update the name state', () => {
      const newName = 'My Awesome GIF';
      act(() => {
        useGifStoreInTestScope.getState().setName(newName);
      });
      expect(useGifStoreInTestScope.getState().name).toBe(newName);
    });
  });

  describe('reset action', () => {
    it('should reset the store to its initial state and abort any ongoing GIF creation', () => {
      // Simulate an ongoing process
      act(() => {
        // Manually set some state to non-initial values
        useGifStoreInTestScope.setState({
          status: 'processing',
          progress: 0.5,
          name: 'custom name',
          result: { blob: new Blob(['test']), width: 10, height: 10 },
          _serviceInstance: new MockedGifServiceClass()
        });
      });
      const serviceInstance =
        useGifStoreInTestScope.getState()._serviceInstance;
      // ... (spying logic remains the same, just ensure calls are to mockAbort/mockDestroy)

      act(() => {
        useGifStoreInTestScope.getState().reset();
      });

      const state = useGifStoreInTestScope.getState();
      expect(state.status).toBe(getTestInitialState().status);
      expect(state.progress).toBe(getTestInitialState().progress);
      expect(state.name).toBe(getTestInitialState().name);
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
      expect(state.width).toBe(getTestInitialState().width);

      if (serviceInstance === controlledMockGifServiceInstance) {
        expect(mockAbort).toHaveBeenCalled();
        // mockDestroy is called by abortGif only if status was NOT 'processing'
        // or by the onAbort listener if createGif had set it up.
        // In this test, status is 'processing', so abortGif calls service.abort().
        // The onAbort listener (which calls destroy) isn't manually triggered here.
        // So, mockDestroy should NOT have been called directly by the reset logic path tested.
        // However, the store's onAbort -> service.destroy() IS part of the full flow.
        // For this specific unit test of reset(), where we manually set _serviceInstance,
        // we are testing if abortGif is called correctly.
        // If status was 'processing', abortGif calls service.abort().
        // If status was not 'processing', abortGif calls service.destroy().
        // The test setup state.status to 'processing'.
        // So only mockAbort should be checked.
        // If we want to test the full onAbort->destroy chain, that's a different test.
      }
      expect(state._serviceInstance).toBeNull();
    });
  });

  describe('abortGif action', () => {
    it('should call gifService.abort() if status is processing and service exists', () => {
      act(() => {
        useGifStoreInTestScope.setState({
          _serviceInstance: new MockedGifServiceClass(),
          status: 'processing'
        });
      });

      act(() => {
        useGifStoreInTestScope.getState().abortGif();
      });

      expect(mockAbort).toHaveBeenCalledTimes(1);
      expect(useGifStoreInTestScope.getState().status).toBe('aborted');
    });

    it('should call gifService.destroy() if service exists but status is not processing', () => {
      act(() => {
        useGifStoreInTestScope.setState({
          _serviceInstance: new MockedGifServiceClass(),
          status: 'idle'
        });
      });

      act(() => {
        useGifStoreInTestScope.getState().abortGif();
      });

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(useGifStoreInTestScope.getState()._serviceInstance).toBeNull();
    });

    it('should do nothing if gifService is null', () => {
      act(() => {
        useGifStoreInTestScope.setState({ _serviceInstance: null });
      });
      act(() => {
        useGifStoreInTestScope.getState().abortGif();
      });
      expect(mockAbort).not.toHaveBeenCalled();
      expect(mockDestroy).not.toHaveBeenCalled();
    });
  });

  describe('createGif action and event handling', () => {
    const testConfig: GifConfig = {
      name: 'test',
      width: 100,
      height: 50,
      fps: 10,
      start: 0,
      end: 1000,
      quality: 5
    };

    it('should call gifService.createGif with config and videoElement, and set up listeners', async () => {
      await act(async () => {
        // createGif is async
        useGifStoreInTestScope
          .getState()
          .createGif(testConfig, mockVideoElement);
      });

      expect(actualMockGetVideoFrameColors).toHaveBeenCalledWith(
        mockVideoElement
      );
      expect(useGifStoreInTestScope.getState().colors).toEqual([
        '#111',
        '#222',
        '#333',
        '#444'
      ]);
      expect(useGifStoreInTestScope.getState().status).toBe('processing');
      expect(useGifStoreInTestScope.getState()._serviceInstance).toBe(
        controlledMockGifServiceInstance
      );

      expect(mockOn).toHaveBeenCalledWith(
        'frames progress',
        expect.any(Function)
      );
      expect(mockOn).toHaveBeenCalledWith('complete', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('abort', expect.any(Function));

      expect(mockCreateGif).toHaveBeenCalledWith(testConfig, mockVideoElement);
    });

    it('should update progress on "frames progress" event', async () => {
      await act(async () => {
        useGifStoreInTestScope
          .getState()
          .createGif(testConfig, mockVideoElement);
      });
      act(() => {
        controlledMockGifServiceInstance._simulateEvent(
          'frames progress',
          0.5,
          5
        );
      });
      expect(useGifStoreInTestScope.getState().progress).toBe(0.5);
      expect(useGifStoreInTestScope.getState().processedFrameCount).toBe(5);
      expect(useGifStoreInTestScope.getState().status).toBe('processing');
    });

    it('should set result and status on "complete" event', async () => {
      await act(async () => {
        useGifStoreInTestScope
          .getState()
          .createGif(testConfig, mockVideoElement);
      });
      const mockBlob = new Blob(['gif']);
      const completeData: GifCompleteData = {
        blob: mockBlob,
        width: 100,
        height: 50
      };
      act(() => {
        controlledMockGifServiceInstance._simulateEvent(
          'complete',
          completeData
        );
      });
      expect(useGifStoreInTestScope.getState().result).toEqual(completeData);
      expect(useGifStoreInTestScope.getState().status).toBe('complete');
      expect(useGifStoreInTestScope.getState()._serviceInstance).toBeNull();
    });

    it('should set status and error on "error" event and destroy service', async () => {
      await act(async () => {
        useGifStoreInTestScope
          .getState()
          .createGif(testConfig, mockVideoElement);
      });
      const testError = new Error('Test GIF creation error');
      act(() => {
        controlledMockGifServiceInstance._simulateEvent('error', testError);
      });
      expect(useGifStoreInTestScope.getState().status).toBe('error');
      expect(useGifStoreInTestScope.getState().error).toBe(
        'Test GIF creation error'
      );
      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(useGifStoreInTestScope.getState()._serviceInstance).toBeNull();
    });

    it('should set status to aborted on "abort" event from service', async () => {
      await act(async () => {
        useGifStoreInTestScope
          .getState()
          .createGif(testConfig, mockVideoElement);
      });
      act(() => {
        // Simulate that status was 'processing' before service emitted abort
        useGifStoreInTestScope.setState({ status: 'processing' });
      });
      act(() => {
        controlledMockGifServiceInstance._simulateEvent('abort');
      });
      expect(useGifStoreInTestScope.getState().status).toBe('aborted');
      expect(mockDestroy).toHaveBeenCalledTimes(1); // from onAbort handler
      expect(useGifStoreInTestScope.getState()._serviceInstance).toBeNull();
    });

    it('should use existing service instance if available', async () => {
      // Get the mocked class constructor
      const MockedGifService = (await import('@/services/GifService'))
        .default as ReturnType<typeof vi.fn>;
      const existingServiceInstance = new MockedGifService(); // This will be controlledMockGifServiceInstance

      act(() => {
        useGifStoreInTestScope.setState({
          _serviceInstance: existingServiceInstance
        });
      });

      await act(async () => {
        useGifStoreInTestScope
          .getState()
          .createGif(testConfig, mockVideoElement);
      });
      // Check if the constructor was called to create existingServiceInstance,
      // and not called again inside createGif.
      expect(MockedGifService).toHaveBeenCalledTimes(1);
      expect(useGifStoreInTestScope.getState()._serviceInstance).toBe(
        existingServiceInstance
      );
      expect(mockCreateGif).toHaveBeenCalledWith(testConfig, mockVideoElement); // Check on the specific mock function
    });
  });
});
