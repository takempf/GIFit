import { storage } from 'wxt/utils/storage';

export const width = storage.defineItem<number>('local:configWidth', {
  fallback: 420
});
export const fps = storage.defineItem<number>('local:configFps', {
  fallback: 10
});
export const quality = storage.defineItem<number>('local:configQuality', {
  fallback: 5
});

export const storedConfig = { width, fps, quality };
