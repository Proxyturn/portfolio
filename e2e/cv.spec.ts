import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { cv, visit } from './helpers';

const pdfOnDisk = existsSync(join(import.meta.dirname, '..', 'public', cv.identity.cvPath));

test('CV download link serves a PDF', async ({ page, request }) => {
  test.skip(!pdfOnDisk, 'Sanitized CV PDF not added to public/cv/ yet (pending from William).');
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
