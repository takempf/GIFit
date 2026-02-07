import { create } from 'zustand';

type Status = 'configuring' | 'generating' | 'generated';

interface AppState {
  videoId: string | null;
  status: Status;
}

interface AppActions {
  setVideoId: (id: string | null) => void;
  setStatus: (status: Status) => void;
  reset: (resetState?: Partial<AppState>) => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  videoId: null,
  status: 'configuring'
};

// Apply the interface to the create function
export const useAppStore = create<AppStore>((set) => {
  const actions: AppActions = {
    setVideoId: (id: string | null) => set({ videoId: id }),
    setStatus: (status: Status) => set({ status }),
    reset: (resetState?: Partial<AppState>) =>
      set({ ...initialState, ...(resetState ?? {}) })
  };

  return {
    ...initialState,
    ...actions
  };
});
