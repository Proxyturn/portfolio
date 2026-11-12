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

| Script                            | What it does                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`                     | Vite dev server                                                                            |
| `npm run build`                   | Type-check and build to `dist/`                                                            |
| `npm run preview`                 | Serve `dist/` with the **production security headers** from `vercel.json`                  |
| `npm run lint`                    | ESLint (includes security bans)                                                            |
| `npm run format` / `format:check` | Prettier write / check                                                                     |
| `npm run typecheck`               | `tsc` for the app, tooling and the API                                                     |
| `npm test`                        | All Vitest projects: `unit` (jsdom), `api`, `scripts` and `privacy` (node)                 |
| `npm run test:coverage`           | Same, with coverage thresholds (80% lines and branches for `src/`, `api/`, `scripts/`)     |
| `npm run test:privacy`            | Privacy scan only (source + `dist/` when present)                                          |
| `npm run test:e2e`                | Playwright: Chromium, WebKit, mobile (builds first locally)                                |
| `npm run test:headers`            | Security headers against a deployed URL: `PREVIEW_URL=https://… npm run test:headers`      |
| `npm run check`                   | Everything CI runs before E2E                                                              |
| `npm run cv`                      | Regenerate the CV PDF from `src/content/cv.ts` (commit only a Windows build; see "CV PDF") |

First E2E run: `npx playwright install chromium webkit`.

Firefox is not tested (William's decision, 2026-11-11).

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
tests/privacy/         privacy scan of source, content, dist/ and the CV PDF
scripts/cv/            CV PDF generator (template, build, manifest)
docs/DEPENDENCIES.md   every dependency and why
```

### Rules for concepts

- Read CV text only from `src/content/cv.ts` and UI strings only from `src/i18n/`. Never
  hard-code copy.
- Wrap each beat in `<ChapterSection id="…">`. Navigation, progress and tests rely on its
  `data-chapter` attribute. Its optional `eyebrow` prop renders a short label
  (`.chapter__eyebrow`) that comes before the heading in reading order (it isn't announced
  when a jump focuses the heading); nothing is rendered when it is empty. Style it in the
  concept.
- Jumps (chapter nav, skills results, deep links, Back/forward) share one behavior from
  `src/components/jump.ts`: native hash navigation, then focus on the target's heading. A
  concept's own cards keep the jump contract: an `id` (`job-<id>` / `edu-<id>`) plus
  `data-job` / `data-education`, and a heading with `tabIndex={-1}`. Any other element a link
  should jump to gets `data-jump-target` (and ideally a `tabIndex={-1}` heading, visually
  hidden if needed).
- Every jump target stops at `scroll-margin-top: var(--jump-offset)`, where `--jump-offset` =
  `--site-header-height` + `--jump-gap`. The header height is measured at runtime, so don't
  hard-code it. A concept with taller sticky chrome (such as a map strip) adds its height to
  `--jump-offset`.
- Don't put a structural `translateY` (one that is part of the resting layout) on ancestors of
  jump targets: deep links ignore vertical translations when they measure a landing, so reveal
  tweens don't shift it, and a resting one would make the target land off its margin.
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

| Name                              | Purpose                                                                                                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRIVACY_DENYLIST`                | Exact private strings the privacy scan must never find (see below); never the public email. Set it under **both** Actions secrets and Dependabot secrets, with the same value |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Lets the preview checks reach protected Vercel previews                                                                                                                       |

## Privacy scan

`tests/privacy/privacy.test.ts` fails the build if a phone number (any Brazilian format,
`tel:` or WhatsApp links) or an age appears in any committed file or in
`dist/`. Exact private values are **never committed**. Put them, one per line, in an
untracked `.privacy-denylist` file locally, and in the `PRIVACY_DENYLIST` secret for CI (as
an Actions secret and, with the same value, a Dependabot secret, since Dependabot runs only
read Dependabot secrets). CI sets `PRIVACY_DENYLIST_REQUIRED=1` on every run except pull
requests from forks, which get no secrets, and the test then fails if the denylist is
empty. Never add the email to the denylist: it is
public, and the CV PDF links it by William's decision (A, 2026-11-09). A test fails if a
denylist entry matches it.

## CV PDF

`public/cv/William-Amaro-Finardi-CV.pdf` is generated from `src/content/cv.ts`, so the site
and the PDF cannot disagree. It is English only.

- `scripts/cv/template.ts` turns the CV data into HTML (pure, unit-tested). Its print-only
  labels ("Professional Summary", "Clients:", "Frontend development"…) and layout rules
  (ATOS grouping, summary merge, coursework casing) were approved with the CV draft and live
  there, not in `src/i18n/`.
- `npm run cv` (`scripts/cv/build.ts`) prints that HTML to A4 with Playwright's Chromium
  (tagged PDF with an outline, JavaScript off) and writes `scripts/cv/cv-pdf.manifest.json`:
  the SHA-256 of the HTML rendered with `EMAIL_PLACEHOLDER` instead of the address, and the
  SHA-256 of the PDF. The metadata is only the title plus Chromium's Creator, Producer and
  dates.
- The email is a visible `mailto:` link in the PDF (William's decision, 2026-11-09), so the
  address is in the committed PDF: the one exception to the rule that it is never written in
  plain text in the repo.
- Node runs the TypeScript directly with `--experimental-strip-types` (Node 22.12+), so the
  build imports use `.ts` paths (`allowImportingTsExtensions` in `tsconfig.node.json`).
  `cv.ts`, `email.ts`, `template.ts` and anything they import must stay loadable by plain
  Node ESM: runtime imports need `.ts` paths, and imports of types must be `import type`.
- The script runs anywhere, but **the committed PDF must be generated on Windows**. The
  layout uses Calibri, the font it was approved with; other systems would substitute a font
  and reflow the pages. CI never regenerates it.
- Every `npm run cv` changes the PDF bytes and the manifest (Chromium writes the creation
  date), even with identical input. Run it only when `cv.ts` or the template changed, read the
  `pdftotext` output (default, `-layout` and `-raw`) before committing, and commit the PDF
  and the manifest together.
- The privacy test regenerates the HTML, scans it, checks the HTML and PDF hashes against the
  manifest (a consistency check, not proof of how the PDF was made), and checks the PDF's
  metadata and its three link targets.

## Deploy

Vercel's GitHub integration builds every branch: each concept branch gets its own preview
URL, and `main` deploys to production. After each successful deployment,
`.github/workflows/preview.yml` checks the security headers and the Lighthouse budgets
(mobile: Performance ≥ 90, Accessibility, Best Practices and SEO ≥ 95).

## Security

See [SECURITY.md](SECURITY.md).

## License

Code: MIT. CV content, copy and images: all rights reserved. See [LICENSE](LICENSE).
