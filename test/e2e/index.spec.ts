import { test, expect } from './fixtures';
import { Page } from '@playwright/test';

export async function getGifit(page: Page) {
  async function getByTestIdAsync(testId: string) {
    const elementLocator = await page.getByTestId(testId);
    await elementLocator.waitFor({ state: 'visible' });
    return elementLocator;
  }

  await page.waitForSelector('#gifit-button');

  const gifit = {
    // element getters
    getEntryButton: () => page.waitForSelector('#gifit-button'),
    getStartInput: () => getByTestIdAsync('start-input'),
    getDurationInput: () => getByTestIdAsync('duration-input'),
    getSubmitButton: () => page.waitForSelector('#gifit-submit'),
    getProgress: () => getByTestIdAsync('progress'),
    getResultImage: () => getByTestIdAsync('result-image'),
    getBackToConfigButton: () => getByTestIdAsync('back-to-config-button'),
    getDownloadGifButton: () => getByTestIdAsync('download-gif-button'),

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
  await page.goto(
    'https://www.youtube.com/watch?v=kSXTGztiNRQ&list=PLXzNzl-6IoyWE1nI6kR_xqXqY5aDLTAOv'
  );
  const gifit = await getGifit(page);

  await gifit.clickEntryButton();
  await gifit.clickSubmitButton();
  await gifit.getProgress();
  expect(await gifit.getResultImage());
});

test('Creates GIF at a specific timecode', async ({ page }) => {
  await page.goto(
    'https://www.youtube.com/watch?v=kSXTGztiNRQ&list=PLXzNzl-6IoyWE1nI6kR_xqXqY5aDLTAOv'
  );
  const gifit = await getGifit(page);

  await gifit.clickEntryButton();
  const startInput = await gifit.getStartInput();
  startInput.fill('20');
  const durationInput = await gifit.getDurationInput();
  durationInput.fill('3');
  await page.waitForTimeout(500); // allow "commit" to happen for start input
  await gifit.clickSubmitButton();
  await gifit.getProgress();
  expect(await gifit.getResultImage());
  // TODO test how long the generated GIF is
});

test('After creating GIF, can return to config and generate another', async ({
  page
}) => {
  await page.goto(
    'https://www.youtube.com/watch?v=kSXTGztiNRQ&list=PLXzNzl-6IoyWE1nI6kR_xqXqY5aDLTAOv'
  );
  const gifit = await getGifit(page);

  await gifit.clickEntryButton();

  // First generation
  await gifit.clickSubmitButton();
  await gifit.getProgress();
  expect(await gifit.getResultImage());

  // Back to config
  const backToConfigButton = await gifit.getBackToConfigButton();
  backToConfigButton.click();
  await page.waitForTimeout(1000); // allow time for animation to clear

  // Second generation
  const startInput = await gifit.getStartInput();
  startInput.fill('20');
  const durationInput = await gifit.getDurationInput();
  durationInput.fill('3');
  await page.waitForTimeout(500); // allow "commit" to happen for start input
  await gifit.clickSubmitButton();
  await gifit.getProgress();
  expect(await gifit.getResultImage());
  // TODO test how long the generated GIF is
});

test('Creates a GIF after navigating from the front page', async ({ page }) => {
  await page.goto('https://www.youtube.com/');
  const ytSearch = await page.waitForSelector('yt-searchbox input');
  ytSearch.fill('Gundam Wing Just Communication');
  ytSearch.press('Enter');
  const ytSearchFirstResult = await page.waitForSelector(
    'ytd-search ytd-video-renderer:first-child a'
  );
  ytSearchFirstResult.click();

  const gifit = await getGifit(page);

  await gifit.clickEntryButton();
  await page.waitForTimeout(1000);

  // First generation
  await gifit.clickSubmitButton();
  await gifit.getProgress();
  expect(await gifit.getResultImage());
});
