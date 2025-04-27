import { create } from 'zustand';

type Status = 'configuring' | 'generating';

interface AppState {
  isOpen: boolean;
  videoElement: HTMLVideoElement | null;
  status: Status;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setVideoElement: (videoElement: HTMLVideoElement) => void;
  setStatus: (status: Status) => void;
}

// Apply the interface to the create function
export const useAppStore = create<AppState>((set) => ({
  isOpen: false,
  videoElement: null,
  status: 'configuring',
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setVideoElement: (element: HTMLVideoElement) =>
    set({ videoElement: element }),
  setStatus: (status: Status) => set({ status })
}));
