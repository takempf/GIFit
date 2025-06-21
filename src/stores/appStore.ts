import { create } from 'zustand';

type Status = 'configuring' | 'generating';

interface AppState {
  isOpen: boolean;
  videoId: string | null;
  videoElement: HTMLVideoElement | null;
  status: Status;
}

interface AppActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setVideoId: (id: string) => void;
  setVideoElement: (videoElement: HTMLVideoElement) => void;
  setStatus: (status: Status) => void;
  reset: (resetState?: Partial<AppState>) => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  isOpen: false,
  videoId: null,
  videoElement: null,
  status: 'configuring'
};

// Apply the interface to the create function
export const useAppStore = create<AppStore>((set) => {
  const actions: AppActions = {
    open: () => set({ isOpen: true, status: 'configuring' }),
    close: () => set({ isOpen: false, status: 'configuring' }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    setVideoId: (id: string) => set({ videoId: id }),
    setVideoElement: (element: HTMLVideoElement) =>
      set({ videoElement: element }),
    setStatus: (status: Status) => set({ status }),
    reset: (resetState?: Partial<AppState>) =>
      set({ ...initialState, ...(resetState ?? {}) })
  };

  return {
    ...initialState,
    ...actions
  };
});
