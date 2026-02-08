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
  if (!previewImage) {
    return null;
  }

  return (
    <div className={css.previewContainer}>
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
    </div>
  );
}
