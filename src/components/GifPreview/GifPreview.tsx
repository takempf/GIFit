import css from './GifPreview.module.css';

interface GifPreviewProps {
  previewImage: string | null;
  aspectRatio: number;
}

export function GifPreview({ previewImage, aspectRatio }: GifPreviewProps) {
  if (!previewImage) {
    return null;
  }

  return (
    <div className={css.previewContainer}>
      <img
        src={previewImage}
        className={css.image}
        style={{ aspectRatio: aspectRatio }}
        alt="Video Preview"
      />
    </div>
  );
}
