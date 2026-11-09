import { defineConfig } from '@playwright/test';

/**
 * Security headers check against a deployed URL (Vercel preview or production).
 *   PREVIEW_URL=https://<deployment>.vercel.app npm run test:headers
 * For protected previews also set VERCEL_AUTOMATION_BYPASS_SECRET.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['headers.spec.ts'],
  reporter: process.env.CI === 'true' ? [['github']] : [['list']],
});
