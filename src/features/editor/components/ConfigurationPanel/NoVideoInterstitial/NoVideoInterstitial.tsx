import css from './NoVideoInterstitial.module.css';
import { Button } from '@/components/ui/Button/Button';

interface NoVideoInterstitialProps {
  onRetry: () => void;
}

export function NoVideoInterstitial({ onRetry }: NoVideoInterstitialProps) {
  return (
    <div className={css.interstitial}>
      <span className={css.icon} aria-hidden="true">
        🚫🎬
      </span>
      <div className={css.content}>
        <h2 className={css.title}>No Video Detected</h2>
        <p className={css.message}>
          GIFit couldn&apos;t find a video on this page. Make sure the page has
          a video element and try to detect videos again.
        </p>
      </div>
      <Button onClick={onRetry} variant="primary" size="medium">
        Retry Video Detection
      </Button>
    </div>
  );
}
