import posthog from 'posthog-js';
import type { AnalyticsProvider } from '@gifit/shared/adapters/types';

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY as
  | string
  | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
if (POSTHOG_API_KEY) {
  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    autocapture: true
  });

  posthog.register({ source: 'web' });
}

export const webAnalyticsProvider: AnalyticsProvider = {
  track(event: string, properties?: Record<string, unknown>): void {
    posthog.capture(event, properties);
  },
  identify(distinctId: string, properties?: Record<string, unknown>): void {
    posthog.identify(distinctId, properties);
  }
};
