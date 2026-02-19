import posthog from 'posthog-js';
import type { AnalyticsProvider } from '@gifit/shared/adapters/types';

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY as
  | string
  | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

console.log('(posthog) analytics.ts loaded', POSTHOG_API_KEY);
if (POSTHOG_API_KEY) {
  console.log('init posthog innit');
  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST ?? 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
    persistence: 'localStorage',
    disable_surveys: true,
    disable_session_recording: true
  });

  posthog.register({ source: 'extension' });
}

export const extensionAnalyticsProvider: AnalyticsProvider = {
  track(event: string, properties?: Record<string, unknown>): void {
    posthog.capture(event, properties);
  },
  identify(distinctId: string, properties?: Record<string, unknown>): void {
    posthog.identify(distinctId, properties);
  }
};
