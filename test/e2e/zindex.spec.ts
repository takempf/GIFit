import { test, expect } from './fixtures';

test('Button has correct z-index', async ({ page }) => {
  await page.goto('https://www.youtube.com/watch?v=kSXTGztiNRQ');

  // Wait for the button to appear
  const button = page.locator('#gifit-button');
  await button.waitFor({ state: 'visible' });

  // Get the computed style of the parent container which has the z-index
  const zIndex = await button.evaluate((el) => {
    return window.getComputedStyle(el.parentElement as Element).zIndex;
  });

  // Verify it matches the maximum z-index value (2147483647)
  expect(zIndex).toBe('2147483647');
});
