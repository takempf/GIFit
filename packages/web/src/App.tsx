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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 relative">
      <h1 className="text-2xl font-bold mb-4 z-10">GIFit! Web Demo</h1>

      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-8">
        <video
          src={VIDEO_SRC}
          controls
          className="w-full h-full object-contain"
          crossOrigin="anonymous"
        />

        {/* Simulate the extension popup overlay */}
        {adapters && (
          <div className="absolute top-4 right-4 z-50">
            <div
              className="bg-white rounded-xl shadow-xl overflow-hidden"
              style={{ width: 420 }}>
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
      <p className="text-gray-400 max-w-md text-center">
        This demo simulates the extension running on a YouTube video. The
        &quot;popup&quot; is rendered as an overlay on the video player.
      </p>
    </div>
  );
}
