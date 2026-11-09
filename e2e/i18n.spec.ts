import { expect, test } from '@playwright/test';
import { cv, visit } from './helpers';

test('EN/PT toggle switches text and is remembered on reload', async ({ page }) => {
  await visit(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText(cv.hook.en)).toBeVisible();

  await page.getByRole('button', { name: 'Português' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByText(cv.hook.pt)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No mundo corporativo' })).toBeAttached();
  await expect(page).toHaveTitle(/Desenvolvedor de Software/);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByText(cv.hook.pt)).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();
  await page.reload();
  await expect(page.getByText(cv.hook.en)).toBeVisible();
});

test.describe('browser language detection', () => {
  test.use({ locale: 'pt-BR' });
  test('a Portuguese browser starts in Portuguese', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByText(cv.hook.pt)).toBeVisible();
  });
});
