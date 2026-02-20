import { Spinner } from '@shared/components/ui/Spinner/Spinner';

import css from './GifPreview.module.css';

type PreviewStatus = 'configuring' | 'generating' | 'generated';

interface GifPreviewProps {
  previewImage: string | null;
  width: number;
  height: number;
  status?: PreviewStatus;
}

export function GifPreview({
  previewImage,
  width,
  height,
  status
}: GifPreviewProps) {
  return (
    <div className={css.previewContainer}>
      {!previewImage ? (
        <div className={css.placeholder}>
          <Spinner />
        </div>
      ) : (
        <img
          src={previewImage}
          className={css.image}
          data-status={status}
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: `min(100%, ${width}px)`,
            maxHeight: `min(100%, ${height}px)`,
            aspectRatio: `${width} / ${height}`
          }}
          alt="Video Preview"
        />
      )}
    </div>
  );
}
