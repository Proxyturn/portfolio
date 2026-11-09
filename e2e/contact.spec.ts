import { expect, test, type Page } from '@playwright/test';
import { visit } from './helpers';

async function fill(page: Page) {
  const form = page.getByRole('form', { name: 'Contact form' });
  await form.getByLabel('Name').fill('Ada Lovelace');
  await form.getByLabel('Your email').fill('ada@example.com');
  await form.getByLabel('Message').fill('Hello from the E2E test.');
  return form;
}

test('happy path: the message is sent and a success message shows', async ({ page }) => {
  let payload: unknown;
  await page.route('**/api/contact', async (route) => {
    payload = route.request().postDataJSON();
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['content-type']).toContain('application/json');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await visit(page);
  const form = await fill(page);
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByRole('status')).toHaveText('Thanks! Your message was sent.');
  expect(payload).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', website: '' });
});

test('error path: a server error shows a friendly message and keeps the input', async ({
  page,
}) => {
  await page.route('**/api/contact', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' }),
  );
  await visit(page);
  const form = await fill(page);
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByRole('status')).toHaveText(/could not be sent/);
  await expect(form.getByLabel('Name')).toHaveValue('Ada Lovelace');
});

test('client-side validation blocks an incomplete form', async ({ page }) => {
  let called = false;
  await page.route('**/api/contact', (route) => {
    called = true;
    return route.fulfill({ status: 200, body: '{}' });
  });
  await visit(page);
  const form = page.getByRole('form', { name: 'Contact form' });
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByLabel('Name')).toBeFocused();
  await expect(form.getByText('This field is required.').first()).toBeVisible();
  expect(called).toBe(false);
});

test('email is revealed only on request', async ({ page }) => {
  await visit(page);
  const html = await page.content();
  expect(html).not.toMatch(/william\.a\.finardi@/);
  await page.getByRole('button', { name: 'Show email address' }).click();
  await expect(page.locator('a[href^="mailto:"]')).toHaveText(/@gmail\.com$/);
});
