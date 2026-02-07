import css from './ResultPanel.module.css';

import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';

import { Button } from '@/components/ui/Button/Button';

import ArrowRightIcon from '@/assets/arrow-right.svg?react';
import ArrowDownIcon from '@/assets/arrow-down.svg?react';

export function ResultPanel() {
  const setStatus = useAppStore((state) => state.setStatus);
  const { result, name, reset } = useGifStore();

  const imageUrl: string | undefined = result?.dataUrl;
  const downloadFilename = `${name}.gif`;

  function handleCloseClick() {
    setStatus('configuring');
    reset();
  }

  return (
    <div className={css.resultPanel} data-testid="result">
      <div className={css.actions}>
        <Button
          className={css.close}
          size="small"
          variant="secondary"
          rounded={true}
          onClick={handleCloseClick}
          data-testid="back-to-config-button"
          prepend={
            <ArrowRightIcon className={css.icon} style={{ rotate: '180deg' }} />
          }>
          Back
        </Button>
        <a
          className={css.save}
          href={imageUrl}
          download={downloadFilename}
          onClick={(e) => !imageUrl && e.preventDefault()}
          aria-disabled={!imageUrl}>
          <Button
            size="small"
            rounded={true}
            disabled={!imageUrl}
            data-testid="download-gif-button"
            append={<ArrowDownIcon className={css.icon} />}>
            Download GIF
          </Button>
        </a>
      </div>
    </div>
  );
}
