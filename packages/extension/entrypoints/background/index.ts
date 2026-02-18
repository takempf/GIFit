import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { extensionAnalyticsProvider } from '../../lib/analytics';

const MIGRATION_NOTICE_KEY = 'gifit:show_v4_migration_notice';
console.log('within background');
export default defineBackground(() => {
  console.log('background, within define background');
  browser.runtime.onInstalled.addListener((details) => {
    extensionAnalyticsProvider.track('extension_installed', {
      reason: details.reason
    });

    if (
      details.reason === 'update' &&
      details.previousVersion?.startsWith('3.')
    ) {
      browser.storage.sync
        .set({ [MIGRATION_NOTICE_KEY]: true })
        .catch((error: unknown) => {
          console.error('GIFit: Failed to set migration notice flag', error);
        });
    }
  });
});
