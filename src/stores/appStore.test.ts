import { describe, it, expect, beforeEach } from 'vitest'; // Removed vi
import { act } from '@testing-library/react'; // Though Zustand updates are often synchronous, act is good practice.
import { useAppStore } from './appStore';
// import type { Status } from './appStore'; // Status type not used in tests

// Define initial state for resetting, based on the store's implementation
// const initialAppState = { // This object was not used directly for reset, getInitialStateValues is used
//   isOpen: false,
//   videoElement: null as HTMLVideoElement | null,
//   status: 'configuring' as 'configuring' | 'generating',
// };

describe('useAppStore', () => {
  // Define the initial state values for reset (actions are part of the store definition)
  const getInitialStateValues = () => ({
    isOpen: false,
    videoElement: null as HTMLVideoElement | null,
    status: 'configuring' as 'configuring' | 'generating'
  });

  beforeEach(() => {
    act(() => {
      // Reset only the state values to their initial defaults, preserving actions.
      useAppStore.setState(getInitialStateValues());
    });
  });

  it('should initialize with default values', () => {
    const state = useAppStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.status).toBe('configuring');
    expect(state.videoElement).toBeNull();
  });

  describe('setVideoElement action', () => {
    it('should update videoElement state', () => {
      const mockVideoElement = document.createElement('video');
      act(() => {
        useAppStore.getState().setVideoElement(mockVideoElement);
      });
      expect(useAppStore.getState().videoElement).toBe(mockVideoElement);
    });
  });

  describe('toggle action', () => {
    it('should flip isOpen state from false to true', () => {
      expect(useAppStore.getState().isOpen).toBe(false); // Initial
      act(() => {
        useAppStore.getState().toggle();
      });
      expect(useAppStore.getState().isOpen).toBe(true);
    });

    it('should flip isOpen state from true to false', () => {
      act(() => {
        useAppStore.setState({ isOpen: true }); // Set to true first
      });
      expect(useAppStore.getState().isOpen).toBe(true);
      act(() => {
        useAppStore.getState().toggle();
      });
      expect(useAppStore.getState().isOpen).toBe(false);
    });
  });

  describe('open action', () => {
    it('should set isOpen to true', () => {
      act(() => {
        useAppStore.setState({ isOpen: false }); // Ensure it's false
      });
      act(() => {
        useAppStore.getState().open();
      });
      expect(useAppStore.getState().isOpen).toBe(true);
    });
  });

  describe('close action', () => {
    it('should set isOpen to false', () => {
      act(() => {
        useAppStore.setState({ isOpen: true }); // Ensure it's true
      });
      act(() => {
        useAppStore.getState().close();
      });
      expect(useAppStore.getState().isOpen).toBe(false);
    });
  });

  describe('setStatus action', () => {
    it('should update status state', () => {
      const newStatus = 'generating';
      act(() => {
        useAppStore.getState().setStatus(newStatus);
      });
      expect(useAppStore.getState().status).toBe(newStatus);

      const anotherStatus = 'configuring';
      act(() => {
        useAppStore.getState().setStatus(anotherStatus);
      });
      expect(useAppStore.getState().status).toBe(anotherStatus);
    });
  });

  // videoTime and youtubePlayerRef related tests are omitted as these are not in appStore.ts
});
