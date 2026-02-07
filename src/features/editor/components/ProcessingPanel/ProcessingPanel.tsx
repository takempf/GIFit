import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';

import { Button } from '@/components/ui/Button/Button';
import { Progress } from '@/components/ui/Progress/Progress';

import css from './ProcessingPanel.module.css';

import { useAppStore } from '@/stores/appStore';

export function ProcessingPanel() {
  const setStatus = useAppStore((state) => state.setStatus);
  const { progress, abortGif } = useGifStore();

  return (
    <div className={css.processingPanel}>
      <Progress value={progress * 100} />
      <Button
        variant="secondary"
        onClick={() => {
          abortGif();
          setStatus('configuring');
        }}>
        Cancel
      </Button>
    </div>
  );
}
