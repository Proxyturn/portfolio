import { cv } from './cv';
import { emailFromParts } from './email';
import type { ChapterId, Job, Lang, Localized, SkillId, YearMonth } from './types';

/** Picks the string for the active language. */
export function t(text: Localized, lang: Lang): string {
  return text[lang];
}

/** Builds the email address at runtime only, so it never sits in markup as plain text. */
export function assembleEmail(parts = cv.identity.emailParts): string {
  return emailFromParts(parts);
}

export function jobsForChapter(chapter: ChapterId, jobs: readonly Job[] = cv.jobs): Job[] {
  return jobs.filter((job) => job.chapter === chapter);
}

/** Jobs in chronological order (oldest first), the order a story is told in. */
export function jobsChronological(jobs: readonly Job[] = cv.jobs): Job[] {
  return [...jobs].sort((a, b) => toIndex(a.start) - toIndex(b.start));
}

export function jobsUsingSkill(skill: SkillId, jobs: readonly Job[] = cv.jobs): Job[] {
  return jobs.filter((job) => job.skills.includes(skill));
}

/** Months since year 0, for comparing dates. */
export function toIndex(date: YearMonth): number {
  return date.year * 12 + (date.month - 1);
}

const locales: Record<Lang, string> = { en: 'en-US', pt: 'pt-BR' };

export function formatYearMonth(date: YearMonth, lang: Lang): string {
  const formatted = new Intl.DateTimeFormat(locales[lang], {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(date.year, date.month - 1, 1)));
  // pt-BR renders "out. de 2019"; keep it compact: "out. 2019".
  return formatted.replace(' de ', ' ');
}

const presentLabel: Localized = { en: 'Present', pt: 'Atual' };

export function formatPeriod(job: Pick<Job, 'start' | 'end'>, lang: Lang): string {
  const end = job.end ? formatYearMonth(job.end, lang) : t(presentLabel, lang);
  return `${formatYearMonth(job.start, lang)} – ${end}`;
}

/** Display title for a job: "ATOS · Bradesco", "SEMANTIX (formerly ATOS) · …". */
export function jobTitle(job: Job, lang: Lang): string {
  const formerly = job.formerly
    ? ` (${t({ en: 'formerly', pt: 'antiga' }, lang)} ${job.formerly})`
    : '';
  const project = job.project ? ` · ${job.project}` : '';
  return `${job.company}${formerly}${project}`;
}
