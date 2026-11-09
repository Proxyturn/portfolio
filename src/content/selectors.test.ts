import { describe, expect, it } from 'vitest';
import { cv } from './cv';
import {
  assembleEmail,
  formatPeriod,
  formatYearMonth,
  jobTitle,
  jobsChronological,
  jobsForChapter,
  jobsUsingSkill,
  t,
} from './selectors';

describe('selectors', () => {
  it('assembles the email only at runtime', () => {
    expect(assembleEmail()).toBe(['william.a.finardi', 'gmail.com'].join('@'));
  });

  it('picks the right language', () => {
    expect(t({ en: 'Hi', pt: 'Oi' }, 'pt')).toBe('Oi');
  });

  it('formats dates per language', () => {
    expect(formatYearMonth({ year: 2019, month: 10 }, 'en')).toBe('Oct 2019');
    expect(formatYearMonth({ year: 2019, month: 10 }, 'pt')).toMatch(/^out\.? 2019$/);
  });

  it('formats open-ended periods as present', () => {
    const current = cv.jobs.find((job) => job.end === null);
    if (!current) throw new Error('no current job');
    expect(formatPeriod(current, 'en')).toMatch(/Present$/);
    expect(formatPeriod(current, 'pt')).toMatch(/Atual$/);
  });

  it('builds job titles with former names and projects', () => {
    const semantix = cv.jobs.find((job) => job.id === 'semantix');
    const frontend = cv.jobs.find((job) => job.id === 'atos-frontend');
    if (!semantix || !frontend) throw new Error('missing job');
    expect(jobTitle(semantix, 'en')).toBe(
      'SEMANTIX (formerly ATOS) · VCIMENTOS / VPAR, CBA, Votorantim',
    );
    expect(jobTitle(semantix, 'pt')).toContain('(antiga ATOS)');
    expect(jobTitle(frontend, 'en')).toBe('ATOS');
  });

  it('filters and sorts jobs', () => {
    expect(jobsForChapter('now').map((j) => j.id)).toEqual(['semantix']);
    expect(jobsChronological()[0]?.id).toBe('novus');
    expect(jobsUsingSkill('xamarin').map((j) => j.id)).toEqual(['atos-cpfl']);
    expect(jobsUsingSkill('agile')).toEqual([]);
  });
});
