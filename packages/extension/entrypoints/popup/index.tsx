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

// Initialize adapters
const videoAdapter = new ExtensionVideoAdapter();
const gifAdapter = new ExtensionGifAdapter();
const storageAdapterImpl = new ExtensionStorageAdapter();

// Inject into services (proxies)
// Note: videoController is now a proxy instance exported as 'videoController'
// storageAdapter is now a proxy instance exported as 'storageAdapter'
// We might need to cast or access the underlying setAdapter method if not exposed on the type
// But I defined setAdapter on the classes.
videoController.setAdapter(videoAdapter);
storageAdapter.setAdapter(storageAdapterImpl);

// Setup popup port connection
setupPopupPort();

const adapters = {
  video: videoAdapter,
  gif: gifAdapter,
  storage: storageAdapterImpl,
  getVideoTitle: getExtensionVideoTitle
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AdapterContext.Provider value={adapters}>
    <App />
  </AdapterContext.Provider>
);
