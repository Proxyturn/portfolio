import { expect, test, type Page } from '@playwright/test';
import { visit } from './helpers';

async function focusedOutline(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const style = getComputedStyle(el);
    return { tag: el.tagName, style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
}

test('chapter navigation jumps to a chapter and marks it current', async ({ page }) => {
  await visit(page);
  const nav = page.getByRole('navigation', { name: 'Chapters' });
  await nav.getByRole('link', { name: 'Energy' }).click();
  await expect(page).toHaveURL(/#energy$/);
  await expect(page.locator('#energy h2')).toBeInViewport();
  await expect(nav.getByRole('link', { name: 'Energy' })).toHaveAttribute('aria-current', 'true');

  await nav.getByRole('link', { name: 'Contact' }).click();
  await expect(page.locator('#contact h2')).toBeInViewport();
});

/**
 * Safari (and Playwright's WebKit) only Tab to links when the user enables "Press Tab to
 * highlight each item", so the link-order test runs on Chromium and Firefox only.
 */
test('keyboard: skip link first, visible focus, then navigation in order', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Keyboard navigation is a desktop concern.');
  test.skip(browserName === 'webkit', 'WebKit skips links on Tab by default (Safari setting).');
  const tab = 'Tab';
  await visit(page);

  await page.keyboard.press(tab);
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  const outline = await focusedOutline(page);
  expect(outline?.style).not.toBe('none');
  expect(outline?.width).toBeGreaterThan(0);

  await page.keyboard.press(tab);
  await expect(page.getByRole('link', { name: 'Intro' })).toBeFocused();
  await page.keyboard.press(tab);
  await expect(page.getByRole('link', { name: 'Origins' })).toBeFocused();
});

test('skip link moves focus into main content', async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Keyboard navigation is a desktop concern.');
  const tab = 'Tab';
  await visit(page);
  if (browserName === 'webkit') await page.getByRole('link', { name: 'Skip to content' }).focus();
  else await page.keyboard.press(tab);
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  // Next Tab continues inside the story, not back in the header.
  await page.keyboard.press(tab);
  const inMain = await page.evaluate(
    () => document.getElementById('main')?.contains(document.activeElement) ?? false,
  );
  expect(inMain).toBe(true);
});

test('language toggle and form controls are reachable by keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Keyboard navigation is a desktop concern.');
  await visit(page);
  const pt = page.getByRole('button', { name: 'Português' });
  await pt.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('button', { name: 'Português' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
