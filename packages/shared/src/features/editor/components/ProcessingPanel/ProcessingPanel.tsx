import { useGifStore } from '@shared/features/generator/stores/gifGeneratorStore';

import { Button } from '@shared/components/ui/Button/Button';
import { Progress } from '@shared/components/ui/Progress/Progress';
import { Spinner } from '@shared/components/ui/Spinner/Spinner';

import XIcon from '@shared/assets/x.svg?react';

import css from './ProcessingPanel.module.css';

import { useAppStore } from '@shared/stores/appStore';
import { useAdapters } from '@shared/adapters/context';

export function ProcessingPanel() {
  const setStatus = useAppStore((state) => state.setStatus);
  const { progress, stage, abortGif } = useGifStore();
  const { gif } = useAdapters();

  return (
    <div className={css.processingPanel}>
      <Progress
        label={
          <span className={css.progressLabel}>
            <Spinner />{' '}
            {progress === 0 && !stage
              ? 'Starting...'
              : (stage ?? 'Generating GIF...')}
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
          abortGif(); // Updates local store state
          gif.abortGif(); // Signals backend to stop
          setStatus('configuring');
        }}
        append={<XIcon />}>
        Cancel
      </Button>
    </div>
  );
}
