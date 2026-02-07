import { useGifStore } from '@/features/generator/stores/gifGeneratorStore';

import { Button } from '@/components/ui/Button/Button';

import css from './ProcessingPanel.module.css';

import { useAppStore } from '@/stores/appStore';

export function ProcessingPanel() {
  const setStatus = useAppStore((state) => state.setStatus);
  const { progress, abortGif } = useGifStore();

  return (
    <div className={css.processingPanel}>
      <progress value={progress} />
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
