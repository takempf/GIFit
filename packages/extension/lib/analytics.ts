import posthog from 'posthog-js/dist/module.no-external';
import type { AnalyticsProvider } from '@gifit/shared/adapters/types';

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY as
  | string
  | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

if (POSTHOG_API_KEY) {
  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST ?? 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
    persistence: 'localStorage',
    disable_surveys: true,
    disable_session_recording: true,
    disable_external_dependency_loading: true
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
