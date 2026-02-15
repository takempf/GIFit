import { useEffect } from 'react';
import { useConfigurationPanelStore } from '@shared/features/editor/stores/configurationPanelStore';

export function useVideoMetadata() {
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
      if (useConfigurationPanelStore.getState().videoDuration > 0) {
        captureFrame(useConfigurationPanelStore.getState().start);
      }
    });

    // Race condition handling: poll if duration is still 0
    const intervalId = setInterval(() => {
      const state = useConfigurationPanelStore.getState();
      if (state.videoDuration === 0) {
        fetchVideoMetadata().then(() => {
          if (useConfigurationPanelStore.getState().videoDuration > 0) {
            captureFrame(useConfigurationPanelStore.getState().start);
          }
        });
      } else {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [fetchVideoMetadata, captureFrame]);

  return {
    isMetadataLoaded: videoDuration > 0
  };
}
