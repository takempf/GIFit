import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';

import { Button } from '@/components/ui/Button/Button';
import { Progress } from '@/components/ui/Progress/Progress';

import XIcon from '@/assets/x.svg?react';

import css from './ProcessingPanel.module.css';

import { useAppStore } from '@/stores/appStore';

export function ProcessingPanel() {
  const setStatus = useAppStore((state) => state.setStatus);
  const { progress, abortGif } = useGifStore();

  return (
    <div className={css.processingPanel}>
      <Progress
        label="Generating GIF"
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
