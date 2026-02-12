import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import css from './DemoSection.module.css';

import { AppCore } from '@/components/AppCore';
import { StoreProvider } from '@/stores/storeContext';
import { DirectVideoAdapter, DirectGifAdapter, InMemoryStorageAdapter } from '@/adapters/direct';

const DEMO_VIDEOS = [
  {
    id: 'ocean',
    label: 'Ocean Waves',
    src: import.meta.env.BASE_URL + 'videos/ocean.mp4',
    credit: 'Pexels'
  },
  {
    id: 'city',
    label: 'City Traffic',
    src: import.meta.env.BASE_URL + 'videos/city.mp4',
    credit: 'Pexels'
  },
  {
    id: 'nature',
    label: 'Forest Stream',
    src: import.meta.env.BASE_URL + 'videos/nature.mp4',
    credit: 'Pexels'
  }
];

export function DemoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedVideo, setSelectedVideo] = useState(DEMO_VIDEOS[0]);
  const [videoReady, setVideoReady] = useState(false);

  const getVideo = useCallback(() => videoRef.current, []);

  const videoAdapter = useMemo(() => new DirectVideoAdapter(getVideo), [getVideo]);
  const gifAdapter = useMemo(() => new DirectGifAdapter(getVideo), [getVideo]);
  const storageAdapter = useMemo(() => new InMemoryStorageAdapter(), []);

  const getVideoTitle = useCallback(async () => {
    return selectedVideo.label;
  }, [selectedVideo]);

  // Reset when video changes
  useEffect(() => {
    setVideoReady(false);
  }, [selectedVideo]);

  function handleVideoCanPlay() {
    setVideoReady(true);
  }

  function handleVideoSelect(video: typeof DEMO_VIDEOS[number]) {
    setSelectedVideo(video);
  }

  return (
    <div className={css.demoContainer}>
      {/* Video Selector */}
      <div className={css.videoSelector}>
        <span className={css.selectorLabel}>Choose a video:</span>
        <div className={css.selectorButtons}>
          {DEMO_VIDEOS.map((video) => (
            <button
              key={video.id}
              className={`${css.selectorButton} ${selectedVideo.id === video.id ? css.selectorButtonActive : ''}`}
              onClick={() => handleVideoSelect(video)}
              type="button">
              {video.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video Element (hidden, used by adapters) */}
      <div className={css.videoContainer}>
        <video
          ref={videoRef}
          src={selectedVideo.src}
          crossOrigin="anonymous"
          preload="auto"
          muted
          playsInline
          onCanPlay={handleVideoCanPlay}
          className={css.video}
        />
        <span className={css.videoCredit}>
          Video: {selectedVideo.credit}
        </span>
      </div>

      {/* GIFit Editor */}
      {videoReady && (
        <div className={css.editorContainer}>
          <StoreProvider
            key={selectedVideo.id}
            videoAdapter={videoAdapter}
            gifAdapter={gifAdapter}
            storageAdapter={storageAdapter}>
            <AppCore getVideoTitle={getVideoTitle} hideFooter />
          </StoreProvider>
        </div>
      )}

      {!videoReady && (
        <div className={css.loading}>
          Loading video...
        </div>
      )}
    </div>
  );
}
