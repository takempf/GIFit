import { useState, useEffect } from 'react';
import { App as SharedApp } from '@gifit/shared/components/App';
import { AdapterContext, AdapterSet } from '@gifit/shared/adapters/context';
import {
  DirectVideoAdapter,
  DirectGifAdapter,
  InMemoryStorageAdapter
} from '@gifit/shared/adapters/direct';
import { videoController } from '@gifit/shared/services/VideoController';
import { storageAdapter } from '@gifit/shared/utils/storage';

import './App.css';

// Mock video source (Big Buck Bunny Trailer)
const VIDEO_SRC = '/videos/big-buck-bunny-trailer.mp4';

export default function App() {
  const [adapters, setAdapters] = useState<AdapterSet | null>(null);

  useEffect(() => {
    const getVideo = () => document.querySelector('video');

    const videoAdapter = new DirectVideoAdapter(getVideo);
    const gifAdapter = new DirectGifAdapter(getVideo);
    const storageAdapterImpl = new InMemoryStorageAdapter();

    // Inject proxies
    videoController.setAdapter(videoAdapter);
    storageAdapter.setAdapter(storageAdapterImpl);

    setAdapters({
      video: videoAdapter,
      gif: gifAdapter,
      storage: storageAdapterImpl,
      getVideoTitle: async () => 'Demo Video Title'
    });
  }, []);

  return (
    <div className="container">
      <h1 className="heading">GIFit! Web Demo</h1>

      <div className="videoWrapper">
        <video
          src={VIDEO_SRC}
          controls
          className="video"
          crossOrigin="anonymous"
        />

        {/* Simulate the extension popup overlay */}
        {adapters && (
          <div className="popupOverlay">
            <div className="popupFrame" style={{ width: 420 }}>
              <AdapterContext.Provider value={adapters}>
                <SharedApp />
              </AdapterContext.Provider>
            </div>
          </div>
        )}
      </div>

      <p>This is a &quot;web&quot; version of the GIFit! extension.</p>
      <p>
        It uses a &quot;virtual&quot; content script to simulate the extension
        environment.
      </p>
      <p className="description">
        This demo simulates the extension running on a YouTube video. The
        &quot;popup&quot; is rendered as an overlay on the video player.
      </p>
    </div>
  );
}
