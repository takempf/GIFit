import '@gifit/shared/style.css';
import './style.css';

import ReactDOM from 'react-dom/client';
import { AdapterContext } from '@gifit/shared/adapters/context';
import { App } from '@gifit/shared/components/App';
import {
  ExtensionVideoAdapter,
  ExtensionGifAdapter,
  ExtensionStorageAdapter,
  getExtensionVideoTitle,
  setupPopupPort
} from '@gifit/shared/adapters/extension';
import { videoController } from '@gifit/shared/services/VideoController';
import { storageAdapter } from '@gifit/shared/utils/storage';
import { useConfigurationPanelStore } from '@gifit/shared/features/editor/stores/configurationPanelStore';
import { extensionAnalyticsProvider } from '../../lib/analytics';

// Initialize adapters
const videoAdapter = new ExtensionVideoAdapter();
const gifAdapter = new ExtensionGifAdapter();
const storageAdapterImpl = new ExtensionStorageAdapter();

// Inject into services (proxies)
// Note: videoController is now a proxy instance exported as 'videoController'
// storageAdapter is now a proxy instance exported as 'storageAdapter'
videoController.setAdapter(videoAdapter);
storageAdapter.setAdapter(storageAdapterImpl);

// Reload config now that the proxy is properly attached for the extension popup.
// The store calls loadInitialConfig() at module-eval time, before the adapter is
// wired up, so it always reads defaults on first run. This call fixes that.
useConfigurationPanelStore.getState().loadInitialConfig();

// Setup popup port connection
setupPopupPort();

const adapters = {
  video: videoAdapter,
  gif: gifAdapter,
  storage: storageAdapterImpl,
  analytics: extensionAnalyticsProvider,
  getVideoTitle: getExtensionVideoTitle
};

extensionAnalyticsProvider.track('popup_opened');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AdapterContext.Provider value={adapters}>
    <App />
  </AdapterContext.Provider>
);
