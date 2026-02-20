import { test, expect } from './fixtures';
import { Page } from '@playwright/test';

const YOUTUBE_VIDEO_URL =
  'https://www.youtube.com/watch?v=kSXTGztiNRQ&list=PLXzNzl-6IoyWE1nI6kR_xqXqY5aDLTAOv';

export async function openPopup(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector('#root');
  return page;
}

test('Popup renders and communicates with active tab', async ({
  page: ytPage,
  context,
  extensionId
}) => {
  // 1. Navigate to YouTube video
  await ytPage.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'domcontentloaded' });

  // 1.1 Get the YouTube tab ID via Service Worker to avoid recursion in popup mock
  let ytTabId: number;

  // Poll for service worker to be ready
  await expect
    .poll(
      async () => {
        const workers = context.serviceWorkers();
        if (workers.length > 0) return true;
        return false;
      },
      { timeout: 10000 }
    )
    .toBeTruthy();

  const worker = context.serviceWorkers()[0];

  // Query for the tab ID
  await expect
    .poll(
      async () => {
        try {
          const tabs = await worker.evaluate(async () => {
            // @ts-ignore
            const result = await chrome.tabs.query({
              url: '*://*.youtube.com/*'
            });
            return result;
          });
          if (tabs && tabs.length > 0) {
            ytTabId = tabs[0].id;
            return true;
          }
        } catch (e) {
          console.error('Worker evaluation failed:', e);
        }
        return false;
      },
      { timeout: 10000 }
    )
    .toBeTruthy();

  // 2. Open popup
  const popupPage = await context.newPage();
  popupPage.on('console', (msg) => console.log('POPUP LOG:', msg.text()));
  popupPage.on('pageerror', (err) => console.log('POPUP ERROR:', err));

  // Targeted Mock: Return the specific YT tab ID
  await popupPage.addInitScript((targetTabId) => {
    const log = (...args: unknown[]) => console.log('[Mock]', ...args);

    interface ChromeTabsQuery {
      active?: boolean;
      currentWindow?: boolean;
    }

    interface ChromeTab {
      id: number;
      active: boolean;
      currentWindow: boolean;
      windowId: number;
      title: string;
      url: string;
    }

    interface ChromeAPI {
      tabs: {
        query: (
          queryInfo: ChromeTabsQuery,
          callback?: (result: ChromeTab[]) => void
        ) => Promise<ChromeTab[]> | void;
      };
    }

    const win = window as unknown as { chrome: ChromeAPI };
    win.chrome = win.chrome || {};
    win.chrome.tabs = win.chrome.tabs || {};

    // Keep reference if needed, or just overwrite
    const originalQuery = win.chrome.tabs.query;

    win.chrome.tabs.query = function (
      queryInfo: ChromeTabsQuery,
      callback?: (result: ChromeTab[]) => void
    ) {
      // If asking for active/currentWindow (popup's view of "active"), return our target tab
      if (queryInfo.active && queryInfo.currentWindow) {
        log(`Intercepting query, returning target tab ${targetTabId}`);
        const result: ChromeTab[] = [
          {
            id: targetTabId,
            active: true,
            currentWindow: true,
            windowId: 1, // Add windowId as it might be checked
            title: 'Mock Video', // Title doesn't matter much for messaging
            url: 'https://www.youtube.com/watch?v=kSXTGztiNRQ'
          }
        ];

        if (callback) {
          callback(result);
        }
        // Support Promise expectation
        return Promise.resolve(result);
      }

      // Pass through other queries (though mostly unused by popup)
      if (originalQuery) {
        return (originalQuery as Function).apply(win.chrome.tabs, arguments);
      }
      return Promise.resolve([]);
    };
  }, ytTabId!); // Pass value provided by Node to Page context

  await openPopup(popupPage, extensionId);

  // 3. Verify Popup UI Elements (Real Data)

  const startInput = popupPage.getByTestId('start-input');
  await expect(startInput).toBeVisible({ timeout: 10000 });

  // Real video metadata might be slightly different depending on load time,

  const durationInput = popupPage.getByTestId('duration-input');
  await expect(durationInput).toBeVisible();
  // Default is 2s (config), not video duration.
  await expect(durationInput).toHaveValue('2');

  // 4. Interact (Create GIF)
  // This should send a real message to the content script.
  // The content script should respond.

  // Determine if successful by checking for side-effects on the Content Page.
  const msgPromise = ytPage.waitForEvent('console', {
    predicate: (msg) =>
      msg.text().includes('Content Script received message: START_GIF'),
    timeout: 10000
  });

  const createBtn = popupPage.getByRole('button', { name: /Create GIF/i });
  await createBtn.click();

  // Wait for the message to be logged in the YouTube page console
  await msgPromise;
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== test.info().status) {
    const screenshotPath = testInfo.outputPath(`failure.png`);
    console.log(`Saving screenshot to: ${screenshotPath}`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('Screenshot saved successfully.');
    } catch (e) {
      console.error('Failed to save screenshot:', e);
    }

    // Dump HTML
    try {
      const html = await page.content();
      console.log('PAGE HTML DUMP:', html);
    } catch (e) {
      console.error('Failed to get page content:', e);
    }
  }
});
