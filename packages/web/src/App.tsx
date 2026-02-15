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

import GifitLogo from '@gifit/shared/assets/gifit-logo.svg?react';
import GifitIcon from '@gifit/shared/assets/gifit-icon.svg?react';

import './App.css';

// Mock video source (Big Buck Bunny Trailer)
const VIDEO_SRC = '/videos/big-buck-bunny-trailer.mp4';

export default function App() {
  const [adapters, setAdapters] = useState<AdapterSet | null>(null);
  const [isReady, setIsReady] = useState(false);

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
      getVideoTitle: async () => 'Big Buck Bunny'
    });
  }, []);

  return (
    <main id="main">
      <div className="logo">
        <GifitLogo />
      </div>
      <section className="conversation">
        <p>
          Hi, I'm <a href="https://kempf.dev">Tim</a>!
        </p>
        <p>
          With this extension you can create GIFs from any video on YouTube,
          without ever leaving your browser.
        </p>
        <p>
          If that sounds good to you, you can{' '}
          <a href="https://chromewebstore.google.com/detail/gifit/khoojcphcmgcplkpckkjpdlloooifgec">
            add GIFit to Chrome
          </a>{' '}
          right away!
        </p>
        <p>You can also try it out below with a demo video:</p>
      </section>

      <section className="demo">
        <video
          src={VIDEO_SRC}
          controls
          className="video"
          crossOrigin="anonymous"
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = 4.5;
          }}
          onSeeked={() => setIsReady(true)}
        />

        <div className="source">
          Video Source:{' '}
          <a href="https://www.youtube.com/watch?v=aqz-KE-bpKQ" target="_blank">
            Big Buck Bunny
          </a>{' '}
          Trailer
        </div>

        {/* Simulate the extension popup overlay */}
        {adapters && isReady && (
          <div className="popupOverlay">
            <div className="popupFrame">
              <AdapterContext.Provider value={adapters}>
                <SharedApp />
              </AdapterContext.Provider>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
