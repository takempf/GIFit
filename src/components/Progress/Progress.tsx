import css from './Progress.module.css';

import { CSSProperties, MouseEvent } from 'react';

import { useGifStore } from '@/stores/gifGeneratorStore';

const DEFAULT_IMAGE_DISPLAY_WIDTH = 240;

interface ImageInfo {
  blob: Blob;
  height: number;
  width: number;
}

interface ProgressProps {}

export function Progress({}: ProgressProps) {
  const result = useGifStore((state) => state.result);
  const progress = useGifStore((state) => state.progress);
  const status = useGifStore((state) => state.status);

  const percent = progress * 100;

  let imageUrl: string | undefined;
  let progressElementsStyle: CSSProperties | undefined;

  // Calculate image dimensions and create object URL if image exists
  if (result?.blob && result?.width > 0) {
    console.log('result blob', result.blob);
    // Ensure width is positive to avoid division by zero
    const imageDisplayHeight =
      DEFAULT_IMAGE_DISPLAY_WIDTH * (result.height / result.width);
    imageUrl = URL.createObjectURL(result.blob);
    progressElementsStyle = {
      width: `${DEFAULT_IMAGE_DISPLAY_WIDTH}px`,
      height: imageDisplayHeight
    };
  }

  const downloadFilename = `gifit_${Date.now()}.gif`;

  console.log('image url', imageUrl);

  return (
    <div className={css.gifitProgress}>
      <div className={css.details}>
        {status && <div className={css.status}>{status}</div>}

        <div className={css.elements} style={progressElementsStyle}>
          <progress className={css.progress} value={percent} max="100" />
          {imageUrl && (
            <img
              className={css.result}
              src={imageUrl}
              alt="Generated GIF preview"
            />
          )}
        </div>

        <a
          className={css.save}
          href={imageUrl}
          download={downloadFilename}
          onClick={(e) => !imageUrl && e.preventDefault()}
          aria-disabled={!imageUrl}>
          Save GIF
        </a>
      </div>
    </div>
  );
}

export default Progress;
