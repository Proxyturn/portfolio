import { expect, test } from '@playwright/test';
import { cv, expectAllRevealed, visit } from './helpers';

test.use({ reducedMotion: 'reduce' });

test('reduced motion shows all content without scrolling animations', async ({ page }) => {
  await visit(page);
  // Nothing waits for a scroll trigger: everything is opaque and untransformed right away.
  await expectAllRevealed(page);
  const transformed = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>('.reveal')].filter(
        (el) => el.style.transform !== '' || el.style.opacity !== '',
      ).length,
  );
  expect(transformed).toBe(0);
  for (const job of cv.jobs) {
    await page.locator(`[data-job="${job.id}"]`).scrollIntoViewIfNeeded();
    await expect(page.locator(`[data-job="${job.id}"]`)).toBeVisible();
  }
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );
});
