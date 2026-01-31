import css from './GifPreview.module.css';

interface GifPreviewProps {
  previewImage: string | null;
  width: number;
  height: number;
}

export function GifPreview({ previewImage, width, height }: GifPreviewProps) {
  if (!previewImage) {
    return null;
  }

  return (
    <div className={css.previewContainer}>
      <img
        src={previewImage}
        className={css.image}
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
