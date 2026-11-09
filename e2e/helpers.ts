import { expect, type Page } from '@playwright/test';
import { cv } from '../src/content/cv';

export { cv };

export const chapterIds = cv.chapters.map((chapter) => chapter.id);

/** Fresh visit in a fixed language (bypasses browser-language detection). */
export async function visit(page: Page, lang: 'en' | 'pt' = 'en') {
  await page.addInitScript((value) => {
    if (!window.sessionStorage.getItem('e2e-init')) {
      window.localStorage.setItem('portfolio.lang', value);
      window.sessionStorage.setItem('e2e-init', '1');
    }
  }, lang);
  await page.goto('/');
  await expect(page.locator('[data-chapter="hook"]')).toBeVisible();
}

/**
 * Scrolls the whole page in viewport-sized steps, like a visitor would, and returns the
 * chapters that entered the viewport along the way.
 */
export async function scrollThroughStory(page: Page): Promise<Set<string>> {
  const seen = new Set<string>();
  for (let step = 0; step < 200; step++) {
    const visible = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-chapter]')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight && r.bottom > 0;
        })
        .map((el) => el.dataset.chapter ?? ''),
    );
    visible.forEach((id) => seen.add(id));
    const atBottom = await page.evaluate(() => {
      const before = window.scrollY;
      // 'instant' overrides the page's smooth scrolling so the position updates synchronously.
      window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'instant' });
      return (
        window.scrollY === before ||
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      );
    });
    await page.waitForTimeout(60);
    if (atBottom) {
      const last = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-chapter]')]
          .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
          .map((el) => el.dataset.chapter ?? ''),
      );
      last.forEach((id) => seen.add(id));
      break;
    }
  }
  return seen;
}

/** Waits until every reveal animation has finished (fully opaque). */
export async function expectAllRevealed(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            [...document.querySelectorAll<HTMLElement>('.reveal')].filter(
              (el) => getComputedStyle(el).opacity !== '1',
            ).length,
        ),
      { timeout: 10_000 },
    )
    .toBe(0);
}
