import { Progress as BaseProgress } from '@base-ui/react/progress';

import css from './Progress.module.css';

export interface ProgressProps {
  value: number;
  label?: string;
  showValue?: boolean;
}

export function Progress({ value, label, showValue = false }: ProgressProps) {
  return (
    <BaseProgress.Root className={css.root} value={value}>
      {label && (
        <BaseProgress.Label className={css.label}>{label}</BaseProgress.Label>
      )}
      {showValue && <BaseProgress.Value className={css.value} />}
      <BaseProgress.Track className={css.track}>
        <BaseProgress.Indicator className={css.indicator} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
