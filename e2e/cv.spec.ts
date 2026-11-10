import { expect, test } from '@playwright/test';
import { cv, visit } from './helpers';

test('CV download link serves a PDF', async ({ page, request }) => {
  await visit(page);
  const link = page.getByRole('link', { name: 'Download CV (PDF)' });
  await expect(link).toHaveAttribute('href', cv.identity.cvPath);
  await expect(link).toHaveAttribute('download', '');

  const response = await request.get(cv.identity.cvPath);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  const body = await response.body();
  expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
});
