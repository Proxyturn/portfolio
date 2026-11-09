/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `vite preview` serves the same security headers as production (from vercel.json), so the
 * E2E suite runs under the real CSP and catches violations before deploy. HSTS is dropped
 * locally because preview is plain http.
 */
function productionHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const global = config.headers.find((entry) => entry.source === '/(.*)');
  return Object.fromEntries(
    (global?.headers ?? [])
      .filter((h) => h.key !== 'Strict-Transport-Security')
      .map((h) => [h.key, h.value]),
  );
}

export default defineConfig({
  plugins: [react()],
  preview: { headers: productionHeaders() },
  build: {
    target: 'es2022',
    // Never inline assets as data: URIs, so the CSP can stay at img-src/font-src 'self'.
    assetsInlineLimit: 0,
    // Every supported browser has native modulepreload; skip the polyfill.
    modulePreload: { polyfill: false },
    sourcemap: false,
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts', 'shared/**/*.ts'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'src/main.tsx',
        'src/test/**',
        'src/content/types.ts',
        'src/i18n/types.ts',
      ],
      thresholds: {
        'src/**': { lines: 80, branches: 80 },
        'api/**': { lines: 80, branches: 80 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.ts'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'api',
          environment: 'node',
          include: ['tests/api/**/*.test.ts'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'privacy',
          environment: 'node',
          include: ['tests/privacy/**/*.test.ts'],
        },
      },
    ],
  },
});
