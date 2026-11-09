import { expect, test } from '@playwright/test';
import { chapterIds, cv, expectAllRevealed, scrollThroughStory, visit } from './helpers';

test('the story scrolls from intro to call to action and every chapter becomes visible', async ({
  page,
}) => {
  await visit(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(cv.identity.name);
  await expect(page.getByText(cv.hook.en)).toBeVisible();

  const seen = await scrollThroughStory(page);
  expect([...seen].sort()).toEqual([...chapterIds].sort());

  await expectAllRevealed(page);
  await expect(page.locator('[data-chapter="contact"]')).toBeInViewport();
  for (const job of cv.jobs) {
    await expect(page.locator(`[data-job="${job.id}"]`)).toBeVisible();
  }
});

test('chapters appear in story order', async ({ page }) => {
  await visit(page);
  const order = await page
    .locator('[data-chapter]')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.chapter));
  expect(order).toEqual(chapterIds);
});

test('there is no horizontal page scroll', async ({ page }) => {
  await visit(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
