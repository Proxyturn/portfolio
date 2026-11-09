import { expect, test } from '@playwright/test';

/**
 * Asserts every security header from the spec (section 7) on a deployed URL.
 * Skipped unless PREVIEW_URL is set (it cannot run against `vite preview`).
 */
const target = process.env.PREVIEW_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const EXPECTED: Record<string, string | RegExp> = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': /camera=\(\).*microphone=\(\).*geolocation=\(\)/,
};

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

test.skip(!target, 'Set PREVIEW_URL to a deployed URL to run the headers check.');

const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : undefined;

for (const path of ['/', '/api/contact', '/cv/William-Amaro-Finardi-CV.pdf', '/does-not-exist']) {
  test(`security headers on ${path}`, async ({ request }) => {
    const response = await request.get(new URL(path, target).toString(), {
      ...(headers ? { headers } : {}),
      maxRedirects: 0,
    });
    const h = response.headers();
    for (const [name, expected] of Object.entries(EXPECTED)) {
      if (typeof expected === 'string') expect(h[name], name).toBe(expected);
      else expect(h[name], name).toMatch(expected);
    }
    const csp = h['content-security-policy'] ?? '';
    for (const directive of CSP_DIRECTIVES) expect(csp, directive).toContain(directive);
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(h['x-powered-by']).toBeUndefined();
  });
}
