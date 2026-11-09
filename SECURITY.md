# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's
**[private vulnerability reporting](../../security/advisories/new)**
(repository → **Security** → **Report a vulnerability**).

Please do not open a public issue for security problems. Include what you found, how to
reproduce it, and the impact you expect. You'll get an acknowledgement as soon as possible.

## Scope

- The site and its security headers (`vercel.json`).
- The contact endpoint `POST /api/contact` (`api/`).
- The build and CI pipeline (`.github/`).

## What the project does to stay safe

- **Strict CSP:** `default-src 'self'`, no `'unsafe-inline'` or `'unsafe-eval'`, no third-party
  origins. Fonts and assets are self-hosted. HSTS, `nosniff`, a strict referrer policy, COOP,
  `frame-ancestors 'none'` and a restrictive Permissions-Policy are set as well.
- **No raw HTML:** `dangerouslySetInnerHTML`, `innerHTML`, `eval` and `new Function` are
  banned by ESLint rules.
- **Contact form:** POST only, JSON only, same-origin check, 16 KB body limit, strict Zod
  schema (unknown fields rejected), CR/LF rejected in header fields, plain-text email with
  the visitor only as `reply-to`, honeypot plus minimum fill time, and 5 requests per hour per
  IP (stored as a salted hash in Upstash Redis). The form fails closed if the rate-limit store
  is down. Errors are generic, and logs never contain message bodies or personal data.
- **Secrets:** only in Vercel environment variables, never with a `VITE_` prefix. `.env*`
  files are ignored by git, and gitleaks scans every push.
- **Privacy:** no analytics, tracking or cookies. Phone number and age are
  blocked from the source, the build and the CV by an automated scan.
- **Supply chain:** committed lockfile with `npm ci`, `npm audit --audit-level=high` in CI,
  Dependabot for npm and GitHub Actions, actions pinned to commit SHAs with least-privilege
  permissions, and CodeQL analysis.
