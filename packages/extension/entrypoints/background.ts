import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';

const MIGRATION_NOTICE_KEY = 'gifit:show_v4_migration_notice';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
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
