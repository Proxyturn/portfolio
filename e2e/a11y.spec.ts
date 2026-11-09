import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectAllRevealed, scrollThroughStory, visit } from './helpers';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) }));
}

for (const lang of ['en', 'pt'] as const) {
  test(`no serious or critical axe violations (${lang})`, async ({ page }) => {
    await visit(page, lang);
    await scrollThroughStory(page);
    await expectAllRevealed(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test('no serious or critical axe violations with form errors and revealed email', async ({
  page,
}) => {
  await visit(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByRole('button', { name: 'Show email address' }).click();
  await page.getByRole('button', { name: 'Xamarin' }).click();
  await scrollThroughStory(page);
  await expectAllRevealed(page);
  expect(await seriousViolations(page)).toEqual([]);
});

test.describe('dark color scheme', () => {
  test.use({ colorScheme: 'dark' });
  test('no serious or critical axe violations in dark mode', async ({ page }) => {
    await visit(page);
    await scrollThroughStory(page);
    await expectAllRevealed(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
