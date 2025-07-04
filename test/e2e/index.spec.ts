import { test, expect } from './fixtures';
import { Page } from '@playwright/test';

export async function getGifit(page: Page) {
  await page.goto(
    'https://www.youtube.com/watch?v=kSXTGztiNRQ&list=PLXzNzl-6IoyWE1nI6kR_xqXqY5aDLTAOv'
  );

  await page.waitForSelector('#gifit-button');

  const gifit = {
    // element getters
    getEntryButton: () => page.waitForSelector('#gifit-button'),
    getSubmitButton: () => page.waitForSelector('#gifit-submit'),
    getProgress: () =>
      page.getByTestId('progress').waitFor({ state: 'visible' }),
    getResultImage: () =>
      page.getByTestId('result-image').waitFor({ state: 'visible' }),

    // actions
    clickEntryButton: async () => {
      const entryButton = await gifit.getEntryButton();
      await entryButton.click();
    },
    clickSubmitButton: async () => {
      const submitButton = await gifit.getSubmitButton();
      await submitButton.click();
    }
  };
  return gifit;
}

test('Creates GIF using default settings', async ({ page }) => {
  const gifit = await getGifit(page);
  await gifit.clickEntryButton();
  await gifit.clickSubmitButton();
  await gifit.getProgress();
  expect(await gifit.getResultImage());
});
