import { createContext, useContext } from 'react';
import type {
  VideoAdapter,
  GifAdapter,
  StorageAdapter,
  AnalyticsProvider
} from './types';

export interface AdapterSet {
  video: VideoAdapter;
  gif: GifAdapter;
  storage: StorageAdapter;
  analytics: AnalyticsProvider;
  getVideoTitle: () => Promise<string>;
}

export const AdapterContext = createContext<AdapterSet | null>(null);

export function useAdapters(): AdapterSet {
  const adapters = useContext(AdapterContext);
  if (!adapters) {
    throw new Error(
      'useAdapters must be used within an AdapterContext.Provider'
    );
  }
  return adapters;
}

export function useAnalytics(): AnalyticsProvider {
  return useAdapters().analytics;
}
