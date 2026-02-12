import { useEffect, useMemo } from 'react';

import { AppCore } from './AppCore';
import { StoreProvider } from '@/stores/storeContext';
import {
  ExtensionVideoAdapter,
  ExtensionGifAdapter,
  ExtensionStorageAdapter,
  getExtensionVideoTitle,
  setupPopupPort
} from '@/adapters/extension';

export function App() {
  const videoAdapter = useMemo(() => new ExtensionVideoAdapter(), []);
  const gifAdapter = useMemo(() => new ExtensionGifAdapter(), []);
  const storageAdapter = useMemo(() => new ExtensionStorageAdapter(), []);

  // Establish a long-lived connection to the content script
  useEffect(() => {
    const cleanup = setupPopupPort();
    return cleanup;
  }, []);

  // Cleanup gif adapter on unmount
  useEffect(() => {
    return () => {
      gifAdapter.destroy();
    };
  }, [gifAdapter]);

  return (
    <StoreProvider
      videoAdapter={videoAdapter}
      gifAdapter={gifAdapter}
      storageAdapter={storageAdapter}>
      <AppCore getVideoTitle={getExtensionVideoTitle} />
    </StoreProvider>
  );
}
