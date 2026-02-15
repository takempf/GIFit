import { useGifStore } from '@shared/features/generator/stores/gifGeneratorStore';

import { Button } from '@shared/components/ui/Button/Button';
import { Progress } from '@shared/components/ui/Progress/Progress';
import { Spinner } from '@shared/components/ui/Spinner/Spinner';

import XIcon from '@shared/assets/x.svg?react';

import css from './ProcessingPanel.module.css';

import { useAppStore } from '@shared/stores/appStore';

export function ProcessingPanel() {
  const setStatus = useAppStore((state) => state.setStatus);
  const { progress, abortGif } = useGifStore();

  return (
    <div className={css.processingPanel}>
      <Progress
        label={
          <span className={css.progressLabel}>
            <Spinner /> Generating GIF
          </span>
        }
        showValue={true}
        value={progress * 100}
      />
      <Button
        className={css.cancelButton}
        rounded={true}
        variant="secondary"
        onClick={() => {
          abortGif();
          setStatus('configuring');
        }}
        append={<XIcon />}>
        Cancel
      </Button>
    </div>
  );
}
