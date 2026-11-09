# William Amaro Finardi: portfolio

A story-driven, scroll-based, bilingual (EN / PT-BR) portfolio. The CV is told as a sequence
of chapters: Origins → Enterprise → Energy → Breadth → Now → Next (AI) → Toolbox → Contact.

**Stack:** React 19 + TypeScript (strict) + Vite, GSAP + ScrollTrigger, Vercel (static site +
a serverless function under `/api`). Tests use Vitest + React Testing Library and Playwright
with axe.

## Quick start

Requires Node 22.12+ (`.nvmrc`).

```bash
npm ci
npm run dev          # http://localhost:5173 (the contact API is not served by Vite)
```

To run the contact function locally too, use the Vercel CLI after linking the project:
`vercel dev` (it reads the variables listed below from `vercel env pull`).

## Scripts

| Script                            | What it does                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server                                                                       |
| `npm run build`                   | Type-check and build to `dist/`                                                       |
| `npm run preview`                 | Serve `dist/` with the **production security headers** from `vercel.json`             |
| `npm run lint`                    | ESLint (includes security bans)                                                       |
| `npm run format` / `format:check` | Prettier write / check                                                                |
| `npm run typecheck`               | `tsc` for the app, tooling and the API                                                |
| `npm test`                        | All Vitest projects: `unit` (jsdom), `api` (node), `privacy` (node)                   |
| `npm run test:coverage`           | Same, with coverage thresholds (80% lines and branches for `src/` and `api/`)         |
| `npm run test:privacy`            | Privacy scan only (source + `dist/` when present)                                     |
| `npm run test:e2e`                | Playwright: Chromium, Firefox, WebKit, mobile (builds first locally)                  |
| `npm run test:headers`            | Security headers against a deployed URL: `PREVIEW_URL=https://… npm run test:headers` |
| `npm run check`                   | Everything CI runs before E2E                                                         |

First E2E run: `npx playwright install chromium firefox webkit`.

> **Local note (this Windows machine):** Playwright's Firefox fails to start with a Windows
> side-by-side (`mozglue`) error. That's an OS issue, not the project. Firefox runs in CI on
> Ubuntu. Locally use `npx playwright test --project=chromium --project=webkit --project=mobile`.

## Project structure

```
api/
  contact.ts           POST /api/contact (Vercel Function, Web Request/Response)
  _lib/                handler, Zod schema, sanitizers, Resend sender, Upstash limiter
shared/contact.ts      limits and constants shared by the form and the API
src/
  content/             cv.ts (every CV fact, EN + PT side by side), types, selectors
  i18n/                UI strings (en.ts, pt-BR.ts), provider, language detection and storage
  theme/               theme tokens (CSS custom properties) and the theme switcher
  motion/              GSAP setup, useScrollScene (reduced-motion aware), useReducedMotion
  components/          shared chrome: ChapterNav, LanguageToggle, ContactSection, CvDownload,
                       SkillsExplorer, Footer, SkipLink, Avatar (built, not shown yet)
  concepts/
    active.ts          which concept is rendered (each concept branch changes this)
    base/              neutral reference story used on main
e2e/                   Playwright specs (story, nav and keyboard, i18n, reduced motion, contact,
                       CV, axe, CSP, deployed headers)
tests/api/             handler tests (provider and rate-limit store mocked)
tests/privacy/         privacy scan of source, content and dist/
docs/DEPENDENCIES.md   every dependency and why
```

### Rules for concepts

- Read CV text only from `src/content/cv.ts` and UI strings only from `src/i18n/`. Never
  hard-code copy.
- Wrap each beat in `<ChapterSection id="…">`. Navigation, progress and tests rely on its
  `data-chapter` attribute.
- Animate through `useScrollScene()`. It skips setup under `prefers-reduced-motion` and
  reverts every tween and ScrollTrigger on unmount. Animate only `transform` and `opacity`, and
  leave the resting markup fully visible.
- `src/motion/gsap.ts` turns GSAP lag smoothing off for the whole site, so animations run on
  wall-clock time and content never stays half-revealed on slow devices.
- Define the theme tokens listed in `src/theme/themes.ts` under `:root[data-theme='<id>']`.
- Self-host any font (for example `@fontsource/*`). The CSP allows no external origins.

## Environment variables (names only)

Set these in Vercel → Project → Settings → Environment Variables. See `.env.example`.
None use the `VITE_` prefix, so none can reach the browser bundle.

| Name                                                  | Used by        | Purpose                                                                  |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `RESEND_API_KEY`                                      | `/api/contact` | Resend API key                                                           |
| `CONTACT_TO_EMAIL`                                    | `/api/contact` | Inbox that receives messages                                             |
| `CONTACT_FROM_EMAIL`                                  | `/api/contact` | Verified sender (`Portfolio <onboarding@resend.dev>` for now)            |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | `/api/contact` | Rate-limit store (`KV_REST_API_URL` / `KV_REST_API_TOKEN` also accepted) |
| `RATE_LIMIT_SALT`                                     | `/api/contact` | Secret salt for hashing IPs                                              |
| `ALLOWED_ORIGINS` (optional)                          | `/api/contact` | Extra allowed origins, e.g. a custom domain                              |

GitHub Actions secrets:

| Name                              | Purpose                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `PRIVACY_DENYLIST`                | Exact private strings the privacy scan must never find (see below) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Lets the preview checks reach protected Vercel previews            |

## Privacy scan

`tests/privacy/privacy.test.ts` fails the build if a phone number (any Brazilian format,
`tel:` or WhatsApp links) or an age appears in any committed file or in
`dist/`. Exact private values are **never committed**. Put them, one per line, in an
untracked `.privacy-denylist` file locally, and in the `PRIVACY_DENYLIST` secret for CI.

## Deploy

Vercel's GitHub integration builds every branch: each concept branch gets its own preview
URL, and `main` deploys to production. After each successful deployment,
`.github/workflows/preview.yml` checks the security headers and the Lighthouse budgets
(mobile: Performance ≥ 90, Accessibility, Best Practices and SEO ≥ 95).

## Security

See [SECURITY.md](SECURITY.md).

## License

Code: MIT. CV content, copy and images: all rights reserved. See [LICENSE](LICENSE).
