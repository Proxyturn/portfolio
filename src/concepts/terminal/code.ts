/**
 * Commands and code shown by the Terminal concept, exactly as approved in the storyboard
 * (docs/STORYBOARDS.md, section 2). They stay in English in both languages (William,
 * 2026-11-09, question 7): only descriptions are translated, and those come from
 * src/content/cv.ts and src/i18n/. Nothing here is a CV fact.
 */
import type { YearMonth } from '../../content/types';

export const CMD = {
  whoami: 'whoami',
  role: 'cat role.txt',
  readme: 'cat README.md',
  log: 'git log career',
  tail: 'tail -f semantix.log',
  checkout: 'git checkout -b feature/ai-engineering',
  deploy: 'deploy --target future',
  man: 'man william',
  certs: 'ls certs/',
  locale: 'locale',
  contact: './contact.sh',
} as const;

/** Conventional-commit prefix of each `git log career` entry (Novus has none). */
export const COMMIT_TYPE: Readonly<Record<string, string>> = {
  'atos-bradesco': 'feat(bradesco):',
  'atos-frontend': 'feat(frontend):',
  'atos-cpfl': 'feat(cpfl):',
  'atos-cemig-cpfl': 'ops(cemig/cpfl):',
};

/** Extra commit subjects shown under an entry. */
export const EXTRA_COMMITS: Readonly<Record<string, readonly string[]>> = {
  'atos-cpfl': ['feat(kiosk): Xamarin kiosk app'],
};

/**
 * Entries told as a short ops log instead of prose. The lines follow the CV wording; there
 * are no numbers or timestamps (storyboard facts rule).
 */
export const OPS_LOG: Readonly<Record<string, readonly (readonly [string, string?])[]>> = {
  'atos-cemig-cpfl': [
    ['support:', 'development team'],
    ['maintain:', 'production servers, processing queues'],
    ['review code'],
    ['oversee deploy:', 'test'],
    ['oversee deploy:', 'production'],
    ['keep critical systems stable'],
  ],
};

/** Git tag that marks the Computer Science degree. */
export const DEGREE_TAG = 'tag: v1.0.0';

/** Tab names of the split editor in Breadth. */
export const EDITOR_TAB: Readonly<Record<string, string>> = {
  'atos-sodexo': 'sodexo.mendix',
  'atos-alphaville': 'alphaville/legacy-backend',
};

/** The one generic incident pair in the "Now" log. */
export const INCIDENT = '[INCIDENT]';
export const RESOLVED = '[RESOLVED]';

/** Stack line of the "Now" log. */
export const STACK_LINE = 'stack: react, typescript, javascript (angular), csharp, sqlserver';

/**
 * Commands shown before the plain label of the contact links. The CV download and the email
 * reveal are shared components with fixed text, so their command is added in terminal.css
 * (`::before` content, which is part of the accessible name) and must match these values.
 */
export const LINK_CMD = {
  linkedin: 'open linkedin',
  github: 'open github',
  cv: 'curl -O cv.pdf',
  email: 'reveal email',
} as const;

/** Commands shown before each skill chip (also added in terminal.css). */
export const CHIP_CMD = 'grep';

/** `2019-10`: the date format of the log, the same in both languages. */
export function isoMonth(date: YearMonth): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}`;
}
