import { useEffect } from 'react';
import { useConfigurationPanelStore, useConfigStoreApi } from '@/stores/storeContext';

export function useVideoMetadata() {
  const configStoreApi = useConfigStoreApi();

  const videoDuration = useConfigurationPanelStore(
    (state) => state.videoDuration
  );

  const fetchVideoMetadata = useConfigurationPanelStore(
    (state) => state.fetchVideoMetadata
  );
  const captureFrame = useConfigurationPanelStore(
    (state) => state.captureFrame
  );

  useEffect(() => {
    // Initial fetch
    fetchVideoMetadata().then(() => {
      // If we got metadata immediately, capture the initial frame
      if (configStoreApi.getState().videoDuration > 0) {
        captureFrame(configStoreApi.getState().start);
      }
    });

    // Race condition handling: poll if duration is still 0
    const intervalId = setInterval(() => {
      const state = configStoreApi.getState();
      if (state.videoDuration === 0) {
        fetchVideoMetadata().then(() => {
          if (configStoreApi.getState().videoDuration > 0) {
            captureFrame(configStoreApi.getState().start);
          }
        });
      } else {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [fetchVideoMetadata, captureFrame, configStoreApi]);

  return {
    isMetadataLoaded: videoDuration > 0
  };
}
