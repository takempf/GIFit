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

    // Disable action on all tabs by default, then enable where appropriate
    browser.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        updateActionState(tab.id, tab.url);
      });
    });
  });

  // Listen for tab updates (URL changes)
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      updateActionState(tabId, tab.url);
    }
  });

  // Listen for tab activation (switching tabs)
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    updateActionState(activeInfo.tabId, tab.url);
  });
});

function updateActionState(tabId: number | undefined, url: string | undefined) {
  if (!tabId) return;

  const isYouTube =
    url &&
    (url.startsWith('https://www.youtube.com/') ||
      url.startsWith('https://youtube.com/'));

  if (isYouTube) {
    browser.action.enable(tabId);
  } else {
    browser.action.disable(tabId);
  }
}
