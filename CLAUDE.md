# Portfolio of William Amaro Finardi: project brief

Read this first in every session. It records the rules, the decisions already made and
where the work stands. The full original spec is `PROMPT.md`, which is gitignored on
purpose because it contains phone-number fragments. **Never commit it or quote those
fragments.**

## Golden rules (from William)

1. **Ask, never guess.** For any doubt about content, wording, translations, design,
   libraries, versions, services, security trade-offs, git or deployment, stop and ask
   William. Ask in numbered batches. Give a recommendation and the trade-off of each option.
2. **Never invent facts.** Use only `src/content/cv.ts` (which mirrors spec section 4) and
   William's answers. No made-up metrics, projects, clients, testimonials, technologies,
   dates, locations or achievements.
3. **Ask before anything hard to undo or that leaves this machine:** creating repos, pushing,
   deploying, linking Vercel, paid services, deleting branches.
4. **Stop at the end of every phase.** Summarize, show how to see it, and wait for the
   go-ahead.
5. **The critic gate.** Everything goes through the `critic` agent and must be APPROVED by
   it before it reaches William. See "Workflow" below.

## Workflow: workers → critic → William

```
William's request
  → main session plans and hands each task to a worker agent (.claude/agents/)
  → worker delivers (code, copy, storyboard, config…) with tests green
  → critic reviews against the rubric in .claude/agents/critic.md
      CHANGES REQUIRED → back to the worker with the numbered findings → re-review
      APPROVED         → main session presents it to William, with the critic's verdict
  → William approves, or asks for changes (which go through the same loop)
```

- Nothing goes to William unreviewed: code, copy (EN and PT), storyboards, docs, configs,
  phase summaries, and questions that propose options.
- After **3 rejected rounds** on the same item, stop the loop and bring William the
  disagreement and the options.
- The critic never edits files and never approves its own suggestions without
  re-reviewing the result.
- Outward actions (push, deploy, repo settings, sending anything) still need William's
  explicit yes, even when the critic approves.
- **Audit trail:** when presenting work to William, the main session quotes the critic's
  `VERDICT:` line verbatim and lists any remaining Minor findings.
- **Tool limits:** worker agents have all tools; the bans on push, deploy and git changes are
  enforced by their instructions and by the main session, not technically. The critic is
  limited to Read, Grep, Glob and Bash, and must only write gitignored build and test output.

### Agents

| Agent             | Role                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `critic`          | Reviews every deliverable. Read-only. Verdict: APPROVED or CHANGES REQUIRED               |
| `concept-builder` | Builds one concept on its `concept/*` branch from an approved storyboard                  |
| `test-engineer`   | Writes and maintains unit, API, E2E, a11y and privacy tests                               |
| `copy-editor`     | EN and PT-BR copy in `src/i18n/` and `src/content/`: facts only, parity, tone             |
| `devops`          | CI, Vercel and GitHub configuration, prepared locally; never pushes or deploys on its own |

## Fixed decisions (spec section 3: don't re-ask)

- **Stack:** React + TypeScript (strict) + Vite, GSAP + ScrollTrigger.
- **Tests:** Vitest + React Testing Library; Playwright on Chromium, Firefox, WebKit and
  mobile; axe.
- **Hosting:** Vercel, as a static build plus a serverless function `/api/contact`.
- **Languages:** EN + PT-BR with a toggle.
- **Concepts:** three branches (`concept/journey`, `concept/terminal`, `concept/worlds`),
  each with its own Vercel preview. William picks the winner.
- **Visual style:** each concept has its own look that fits its story.
- **Personal data:** only email and city are public. Phone, age and nationality must never
  appear anywhere: site, repo, CV PDF or metadata.
- **Links and features:** LinkedIn, GitHub, CV download, contact form.

## William's Phase 0 answers (2026-11-08)

| Topic            | Decision                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LinkedIn         | https://www.linkedin.com/in/william-finardi-819b21b7/                                                                                                                  |
| GitHub           | https://github.com/Proxyturn                                                                                                                                           |
| Repo             | Public, named `portfolio`                                                                                                                                              |
| License          | MIT for code; all rights reserved for content                                                                                                                          |
| Email provider   | Resend                                                                                                                                                                 |
| Spam protection  | Honeypot + minimum fill time + rate limit (no captcha)                                                                                                                 |
| Rate limit       | Upstash Redis, 5 requests per hour per IP (salted hash)                                                                                                                |
| Form fields      | name (100), email (254), subject (optional, 150), message (5000), delivered to William's email (`CONTACT_TO_EMAIL`; don't write the address in plain text in the repo) |
| Dependencies     | Approved list; document every one in `docs/DEPENDENCIES.md`                                                                                                            |
| CV PDF           | William provides a sanitized PDF (not received yet)                                                                                                                    |
| Photo            | Avatar component built but commented out                                                                                                                               |
| Domain           | `*.vercel.app` for now                                                                                                                                                 |
| Analytics        | None                                                                                                                                                                   |
| SECURITY.md      | GitHub private vulnerability reporting                                                                                                                                 |
| Privacy denylist | Generic patterns + exact values out of band; **no** nationality words blocked                                                                                          |
| Default language | `pt*` browser → PT, else EN; remembered in localStorage                                                                                                                |
| Language URLs    | Single URL with a toggle                                                                                                                                               |
| i18n             | Custom typed dictionary                                                                                                                                                |
| Hook line        | EN "Seven years, five industries, one constant: software that keeps working." / PT "Sete anos, cinco setores, uma constante: software que continua funcionando."       |

## Status

- **Phase 0:** done.
- **Phase 1** (foundation on `main`): **approved by William on 2026-11-09** and committed
  (eabafcc) as William Amaro Finardi with his GitHub noreply address. Shared pieces from the
  Journey build (SkillsExplorer `onChange`, ContactSection `cvLabel`, lag smoothing off) were
  then added to `main` (3019a94), and `concept/journey` branches from that commit.
- **Repo:** public at https://github.com/Proxyturn/portfolio since 2026-11-09, with `main`
  (default) and `concept/journey` pushed and private vulnerability reporting on, with
  William's yes. The Vercel import is in progress on William's side.
- **Phase 2:** storyboards and the question batch for William are in `docs/STORYBOARDS.md`.
  Critic verdicts (2026-11-09, round 3): A storyboards APPROVED, B questions APPROVED, C
  project setup APPROVED. Presented to William; answers recorded at the end of `docs/STORYBOARDS.md`. Storyboards are approved one by one. **Journey approved by William (2026-11-09)** and built on `concept/journey`. The critic approved the build; William's decisions on it (copy, labels, skills line, CV caption) are recorded at the end of `docs/STORYBOARDS.md`. Terminal and Worlds are not approved yet.
  An earlier pre-critic draft had been shown to him before the gate existed.

## Conventions (summary; details in README.md)

- CV facts only from `src/content/cv.ts`, UI strings only from `src/i18n/`.
- Every beat is wrapped in `<ChapterSection id>`, which provides the `data-chapter` hook.
- Animations go through `useScrollScene()` (skipped under reduced motion, reverted on
  unmount). Animate only `transform` and `opacity`, and keep the resting markup visible.
- Themes set the tokens from `src/theme/themes.ts` under `:root[data-theme='<id>']`.
- Self-host fonts and assets. The CSP allows no third-party origins.
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` (enforced by ESLint).
- Tests are part of done: `npm run check` plus Playwright must be green.

## Commands

```bash
npm run check          # lint, format, types, build, unit/API/privacy tests with coverage
npx playwright test --project=chromium --project=webkit --project=mobile
```

**Local note:** Playwright's Firefox fails to start on this Windows machine (a side-by-side
`mozglue` error, an OS issue). Firefox runs in CI.
