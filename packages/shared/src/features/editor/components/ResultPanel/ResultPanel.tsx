import css from './ResultPanel.module.css';

import cx from 'classnames';

import { useAppStore } from '@shared/stores/appStore';
import { useGifStore } from '@shared/features/generator/stores/gifGeneratorStore';

import { Button } from '@shared/components/ui/Button/Button';

import ArrowRightIcon from '@shared/assets/arrow-right.svg?react';
import ArrowDownIcon from '@shared/assets/arrow-down.svg?react';
import { Input } from '@shared/components/ui/Input/Input';

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} bytes`;
}

export function ResultPanel() {
  const setStatus = useAppStore((state) => state.setStatus);
  const { result, name, reset, setName, frameCount } = useGifStore();

  const imageUrl: string | undefined = result?.dataUrl;
  const downloadFilename = `${name}.gif`;

  function handleCloseClick() {
    setStatus('configuring');
    reset();
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  return (
    <div className={css.resultPanel} data-testid="result">
      <span className={cx(css.frames, css.stat)}>{frameCount} frames</span>
      <span className={cx(css.size, css.stat)}>
        {result?.size ? formatFileSize(result.size) : '—'}
      </span>
      <span className={cx(css.dimensions, css.stat)}>
        {result?.width}x{result?.height}
      </span>
      <span className={css.name}>
        <Input
          name="name"
          type="text"
          value={name}
          onChange={handleNameChange}
          append=".gif"
        />
      </span>

      <Button
        className={css.reset}
        variant="secondary"
        rounded={true}
        onClick={handleCloseClick}
        data-testid="back-to-config-button"
        prepend={
          <ArrowRightIcon className={css.icon} style={{ rotate: '180deg' }} />
        }>
        Reset
      </Button>
      <Button
        as="a"
        className={css.download}
        href={imageUrl}
        download={downloadFilename}
        onClick={(e: React.MouseEvent) => !imageUrl && e.preventDefault()}
        rounded
        disabled={!imageUrl}
        data-testid="download-gif-button"
        append={<ArrowDownIcon className={css.icon} />}>
        Download GIF
      </Button>
    </div>
  );
}
