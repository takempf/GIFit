import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import { useStore, type StoreApi } from 'zustand';

import { createConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { createGifStore } from '@/features/generator/stores/gifGeneratorStore';
import type { VideoAdapter, GifAdapter, StorageAdapter, GifProgressCallbacks } from '@/adapters/types';
import { useAppStore } from '@/stores/appStore';

// --- Types ---

// Infer the store state types from the factory return types
type ConfigStoreApi = ReturnType<typeof createConfigurationPanelStore>;
type GifStoreApi = ReturnType<typeof createGifStore>;

// Extract state type from StoreApi
type ConfigStore = ConfigStoreApi extends StoreApi<infer T> ? T : never;
type GifStore = GifStoreApi extends StoreApi<infer T> ? T : never;

interface StoreContextValue {
  configStore: ConfigStoreApi;
  gifStore: GifStoreApi;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// --- Provider ---

interface StoreProviderProps {
  videoAdapter: VideoAdapter;
  gifAdapter: GifAdapter;
  storageAdapter: StorageAdapter;
  children: ReactNode;
}

export function StoreProvider({
  videoAdapter,
  gifAdapter,
  storageAdapter,
  children
}: StoreProviderProps) {
  const configStore = useMemo(
    () => createConfigurationPanelStore(videoAdapter, storageAdapter),
    [videoAdapter, storageAdapter]
  );

  const gifStore = useMemo(
    () => createGifStore(gifAdapter),
    [gifAdapter]
  );

  // Wire up GIF adapter callbacks to update the store
  useEffect(() => {
    const callbacks: GifProgressCallbacks = {
      onProgress: (progress, frameCount, frameDataUrl) => {
        gifStore.getState().updateProgress(progress, frameCount, frameDataUrl);
      },
      onComplete: (data) => {
        gifStore.getState().complete(data);
        useAppStore.getState().setStatus('generated');
      },
      onError: (error) => {
        gifStore.getState().setError(error);
      }
    };

    // Set callbacks on the adapter if it supports it
    if ('setCallbacks' in gifAdapter && typeof gifAdapter.setCallbacks === 'function') {
      (gifAdapter as { setCallbacks: (cb: GifProgressCallbacks) => void }).setCallbacks(callbacks);
    }
  }, [gifAdapter, gifStore]);

  const value = useMemo(
    () => ({ configStore, gifStore }),
    [configStore, gifStore]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

// --- Internal context access ---

function useStoreContext() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('Store hooks must be used within a StoreProvider');
  }
  return context;
}

// --- Config Store Hook ---
// Supports both selector and no-selector patterns:
//   useConfigurationPanelStore((state) => state.width)
//   useConfigurationPanelStore()

type UseConfigurationPanelStore = {
  (): ConfigStore;
  <T>(selector: (state: ConfigStore) => T): T;
  getState: () => ConfigStore;
};

export function createUseConfigurationPanelStore(): UseConfigurationPanelStore {
  // This can't work as a "global" since it needs context.
  // Instead, we return a hook that uses context internally.
  // The getState() static method won't work here - consumers need to be updated.
  throw new Error('Use the hook version instead');
}

function useConfigPanelHook(): ConfigStore;
function useConfigPanelHook<T>(selector: (state: ConfigStore) => T): T;
function useConfigPanelHook<T>(selector?: (state: ConfigStore) => T) {
  const { configStore } = useStoreContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useStore(configStore, selector as any);
}

export { useConfigPanelHook as useConfigurationPanelStore };

// Also export a hook to get the raw store API (for .getState() calls)
export function useConfigStoreApi(): ConfigStoreApi {
  const { configStore } = useStoreContext();
  return configStore;
}

// --- GIF Store Hook ---
// Supports both patterns:
//   useGifStore((state) => state.progress)
//   useGifStore()  // returns all state + actions (destructured)

function useGifHook(): GifStore;
function useGifHook<T>(selector: (state: GifStore) => T): T;
function useGifHook<T>(selector?: (state: GifStore) => T) {
  const { gifStore } = useStoreContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useStore(gifStore, selector as any);
}

export { useGifHook as useGifStore };

export function useGifStoreApi(): GifStoreApi {
  const { gifStore } = useStoreContext();
  return gifStore;
}

// Re-export store state types
export type { ConfigStore, GifStore };
