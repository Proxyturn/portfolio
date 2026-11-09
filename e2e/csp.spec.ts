import { expect, test } from '@playwright/test';
import { scrollThroughStory, visit } from './helpers';

/** `vite preview` serves the production CSP (see vite.config.ts); nothing may violate it. */
test('the page runs under the production CSP without violations or console errors', async ({
  page,
}) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });

  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await visit(page);
  await scrollThroughStory(page);
  await page.getByRole('button', { name: 'Xamarin' }).click();
  await page.getByRole('button', { name: /Português/ }).click();
  expect(problems).toEqual([]);
});
