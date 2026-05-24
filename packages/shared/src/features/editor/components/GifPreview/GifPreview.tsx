import { useCallback, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Spinner } from '@shared/components/ui/Spinner/Spinner';
import { CropOverlay } from '../CropOverlay/CropOverlay';

import css from './GifPreview.module.css';

type PreviewStatus = 'configuring' | 'generating' | 'generated';

interface GifPreviewProps {
  previewImage: string | null;
  width: number;
  height: number;
  videoWidth: number;
  videoHeight: number;
  status?: PreviewStatus;
}

export function GifPreview({
  previewImage,
  width,
  height,
  videoWidth,
  videoHeight,
  status
}: GifPreviewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const measureDisplaySize = useCallback(() => {
    if (imgRef.current) {
      const w = imgRef.current.clientWidth;
      const h = imgRef.current.clientHeight;
      setDisplaySize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    }
  }, []);

  // Measure synchronously before paint when sizing inputs change,
  // so the crop overlay never renders with stale dimensions.
  useLayoutEffect(() => {
    measureDisplaySize();
  }, [measureDisplaySize, width, height, videoWidth, videoHeight, status, previewImage]);

  // ResizeObserver as a fallback for container-driven size changes.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new ResizeObserver(measureDisplaySize);
    observer.observe(img);
    return () => observer.disconnect();
  }, [measureDisplaySize]);

  const isConfiguring = status === 'configuring';
  const showCropOverlay =
    isConfiguring && previewImage && displaySize.width > 0 && videoWidth > 0;

  // During configuring: video aspect ratio so the crop overlay maps correctly.
  // During generating/generated: crop (GIF output) aspect ratio.
  const videoAspect =
    videoWidth && videoHeight ? videoWidth / videoHeight : 16 / 9;
  const maxW = width;
  const maxH = isConfiguring ? Math.round(width / videoAspect) : height;
  const aspectW = isConfiguring ? videoWidth : width;
  const aspectH = isConfiguring ? videoHeight : height;

  return (
    <div className={css.previewContainer}>
      {!previewImage ? (
        <div className={css.placeholder}>
          <Spinner />
        </div>
      ) : (
        <div
          className={css.imageWrapper}
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: `min(100%, ${maxW}px)`,
            maxHeight: `min(100%, ${maxH}px)`,
            aspectRatio: `${aspectW} / ${aspectH}`
          }}
        >
          <img
            ref={imgRef}
            src={previewImage}
            className={css.image}
            data-status={status}
            onLoad={measureDisplaySize}
            alt="Video Preview"
          />
          {showCropOverlay && (
            <CropOverlay
              displayWidth={displaySize.width}
              displayHeight={displaySize.height}
            />
          )}
        </div>
      )}
    </div>
  );
}
