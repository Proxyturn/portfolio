# Dependencies

Every package in `package.json`, why it's there, and where it runs. All versions are pinned
exactly and locked in `package-lock.json`. CI installs with `npm ci` and fails on any
`npm audit` advisory rated **high** or **critical**.

**Rule:** no new non-trivial dependency without William's approval. Add it to this file in
the same change.

## Runtime: shipped to visitors (browser bundle)

| Package              | Version | Why                                                                                                                                        | Notes                                        |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `react`, `react-dom` | 19.3.1  | UI framework (fixed decision).                                                                                                             | No transitive runtime dependencies.          |
| `gsap`               | 3.15.1  | Scroll storytelling: tweens, timelines, `ScrollTrigger` (fixed decision). Free for commercial use, including all plugins, since GSAP 3.13. | Zero dependencies. Wrapped in `src/motion/`. |

## Runtime: Worlds concept fonts (`concept/worlds` branch only)

These two packages exist **only on the `concept/worlds` branch**. They are not on `main`.
Approved by William on 2026-11-09 (storyboard question 3).

| Package                              | Version | Why                                                       | Notes                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | ------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@fontsource-variable/space-grotesk` | 5.3.0   | Worlds headings and map labels (variable geometric sans). | SIL OFL 1.1. Self-hosted, no JavaScript, no dependencies. Only the Latin subset, upright, weight axis (`space-grotesk-latin-wght-normal.woff2`, 22.3 kB) is referenced, through our own `@font-face` in `src/concepts/worlds/fonts.css`; the package's own CSS (all subsets) is not imported. |
| `@fontsource-variable/inter`         | 5.3.0   | Worlds body text (variable sans).                         | SIL OFL 1.1. Same approach: only `inter-latin-wght-normal.woff2` (48.3 kB) is shipped. Latin (U+0000-00FF plus punctuation) covers every EN and PT-BR character the site uses.                                                                                                                |

Transfer cost for visitors: 70.5 kB of fonts in total (both files, already compressed WOFF2).

## Runtime: server only (`/api/contact` Vercel Function, never in the browser bundle)

| Package              | Version | Why                                                                                                     | Notes                                                                                                 |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `zod`                | 4.6.7   | Strict schema validation of the contact payload: types, lengths, email format, unknown fields rejected. | Zero dependencies. Only imported from `api/`. The browser form uses tiny hand-written checks instead. |
| `@upstash/redis`     | 1.41.0  | HTTP Redis client for Upstash (serverless functions keep no memory between calls).                      | Talks to Upstash over HTTPS with a REST token.                                                        |
| `@upstash/ratelimit` | 2.2.0   | Sliding-window rate limit (5 per hour per IP) on top of `@upstash/redis`.                               | Analytics are turned off. Keys are salted SHA-256 hashes of IPs.                                      |

**Email (Resend)** is called with plain `fetch` against its REST API (`api/_lib/email.ts`). No
SDK, so no extra dependency.

## Development only (never deployed)

| Package                                                                              | Why                                                                                                |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `typescript` 6.0.3                                                                   | Strict type checking. Pinned to 6.0 because `typescript-eslint` does not support TS 7 yet.         |
| `vite`, `@vitejs/plugin-react`                                                       | Dev server and production build.                                                                   |
| `vitest`, `@vitest/coverage-v8`, `jsdom`                                             | Unit, component, API and privacy tests, with coverage thresholds (80% lines and branches).         |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Component tests that interact like a user does.                                                    |
| `@playwright/test`                                                                   | E2E in Chromium, Firefox, WebKit and a mobile viewport, plus the deployed-headers check.           |
| `@axe-core/playwright`                                                               | Accessibility audit in E2E (zero serious or critical violations).                                  |
| `eslint`, `@eslint/js`, `typescript-eslint`, `globals`                               | Linting, including security bans (`innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`). |
| `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`                           | React-specific lint rules.                                                                         |
| `prettier`, `eslint-config-prettier`                                                 | Formatting (checked in CI).                                                                        |
| `@types/node`, `@types/react`, `@types/react-dom`                                    | Type definitions.                                                                                  |

## Deliberately not added

- **`eslint-plugin-jsx-a11y`:** does not support ESLint 10 yet. Accessibility is covered by
  axe in every E2E run plus manual keyboard tests. Revisit when it supports ESLint 10.
- **`@lhci/cli` (Lighthouse CI):** its transitive dependencies (`basic-ftp`, `extract-zip`, …)
  currently carry **high** advisories that would fail `npm audit` for the whole project. It
  runs only in `.github/workflows/preview.yml` through `npx @lhci/cli@0.16.0` (exact version),
  outside the app's dependency tree.
- **i18n library (`react-i18next` etc.):** a typed dictionary in `src/i18n/` gives
  compile-time EN/PT key parity with no dependency.
- **Email SDK:** plain `fetch` is enough.

## Known moderate advisories (accepted, dev only)

`npm audit` reports **moderate** advisories in `minimatch` (a ReDoS issue) pulled in by
`typescript-eslint`. They only affect local lint tooling, never the deployed site. Dependabot
will pick up the fix when upstream releases it.
