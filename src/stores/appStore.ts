import { create } from 'zustand';

interface AppState {
  isOpen: boolean;
  videoElement: HTMLVideoElement | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setVideoElement: (videoElement: HTMLVideoElement) => void;
}

// Apply the interface to the create function
export const useAppStore = create<AppState>((set) => ({
  isOpen: false,
  videoElement: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setVideoElement: (element: HTMLVideoElement) => set({ videoElement: element })
}));
