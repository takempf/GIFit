import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { extensionAnalyticsProvider } from '../../lib/analytics';

function getExtensionAction() {
  const legacyBrowser = browser as unknown as {
    browserAction?: typeof browser.action;
  };
  return browser.action || legacyBrowser.browserAction;
}

const MIGRATION_NOTICE_KEY = 'gifit:show_v4_migration_notice';
console.log('within background');
const CONTEXT_MENU_ID = 'gifit:create-gif';

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

    // Create context menu
    browser.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Create a GIF',
      contexts: ['page', 'video'],
      documentUrlPatterns: [
        'https://www.youtube.com/*',
        'https://youtube.com/*'
      ]
    });

    // Disable action on all tabs by default, then enable where appropriate
    browser.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        updateActionState(tab.id, tab.url);
      });
    });
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener((info, _tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID) {
      const action = getExtensionAction();

      if (action?.openPopup) {
        action.openPopup().catch((err: unknown) => {
          console.error('GIFit: Failed to open popup', err);
        });
      } else {
        console.error('GIFit: openPopup API not available');
      }
    }
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

  const action = getExtensionAction();

  if (isYouTube) {
    if (action?.enable) action.enable(tabId);
    browser.contextMenus
      .update(CONTEXT_MENU_ID, { enabled: true })
      .catch(() => {});
  } else {
    if (action?.disable) action.disable(tabId);
    browser.contextMenus
      .update(CONTEXT_MENU_ID, { enabled: false })
      .catch(() => {});
  }
}
