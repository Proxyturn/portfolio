import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const isCI = process.env.CI === 'true';

/**
 * E2E against the production build served by `vite preview`.
 * In CI the build already exists (the build step runs first); locally we build here.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['headers.spec.ts'],
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 2 } : {}),
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: isCI
      ? `npx vite preview --port ${PORT} --strictPort`
      : `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
