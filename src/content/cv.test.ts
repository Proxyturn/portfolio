import { describe, expect, it } from 'vitest';
import { cv } from './cv';
import type { ChapterId, Localized } from './types';
import { toIndex } from './selectors';

const STORY_ORDER: readonly ChapterId[] = [
  'hook',
  'origins',
  'enterprise',
  'energy',
  'breadth',
  'now',
  'next',
  'toolbox',
  'contact',
];

function expectLocalized(value: Localized, where: string) {
  expect(value.en.trim(), `${where} (en)`).not.toBe('');
  expect(value.pt.trim(), `${where} (pt)`).not.toBe('');
}

describe('CV data module', () => {
  it('lists chapters in the story order from the spec', () => {
    expect(cv.chapters.map((c) => c.id)).toEqual(STORY_ORDER);
    for (const chapter of cv.chapters) {
      expectLocalized(chapter.title, `chapter ${chapter.id} title`);
      expectLocalized(chapter.navLabel, `chapter ${chapter.id} nav label`);
    }
  });

  it('gives every job a company, valid dates and EN + PT text', () => {
    expect(cv.jobs.length).toBe(8);
    for (const job of cv.jobs) {
      expect(job.company.trim(), job.id).not.toBe('');
      expect(job.start.month).toBeGreaterThanOrEqual(1);
      expect(job.start.month).toBeLessThanOrEqual(12);
      if (job.end) expect(toIndex(job.end), job.id).toBeGreaterThanOrEqual(toIndex(job.start));
      expect(job.highlights.length, job.id).toBeGreaterThan(0);
      job.highlights.forEach((h, i) => {
        expectLocalized(h, `${job.id} highlight ${i}`);
      });
      if (job.role) expectLocalized(job.role, `${job.id} role`);
      if (job.project !== undefined) expect(job.project.trim()).not.toBe('');
    }
  });

  it('keeps jobs newest first with no date going backwards', () => {
    for (let i = 1; i < cv.jobs.length; i++) {
      const newer = cv.jobs[i - 1];
      const older = cv.jobs[i];
      if (!newer || !older) throw new Error('unreachable');
      expect(toIndex(older.start), `${older.id} before ${newer.id}`).toBeLessThan(
        toIndex(newer.start),
      );
      if (older.end) expect(toIndex(older.end)).toBeLessThanOrEqual(toIndex(newer.start));
    }
  });

  it('has exactly one current job', () => {
    expect(cv.jobs.filter((job) => job.end === null).map((job) => job.id)).toEqual(['semantix']);
  });

  it('places jobs in the beats the spec describes', () => {
    const byChapter = (id: ChapterId) => cv.jobs.filter((j) => j.chapter === id).map((j) => j.id);
    expect(byChapter('origins')).toEqual(['novus']);
    expect(byChapter('enterprise').sort()).toEqual(['atos-bradesco', 'atos-frontend']);
    expect(byChapter('energy').sort()).toEqual(['atos-cemig-cpfl', 'atos-cpfl']);
    expect(byChapter('breadth').sort()).toEqual(['atos-alphaville', 'atos-sodexo']);
    expect(byChapter('now')).toEqual(['semantix']);
  });

  it('only references skills that exist, and skill ids are unique', () => {
    const ids = cv.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const job of cv.jobs) {
      for (const skill of job.skills) expect(ids, `${job.id} -> ${skill}`).toContain(skill);
    }
    for (const skill of cv.skills) expectLocalized(skill.name, `skill ${skill.id}`);
  });

  it('has complete education, certifications, languages and summary', () => {
    for (const entry of cv.education) {
      expectLocalized(entry.title, entry.id);
      expect(entry.institution.trim()).not.toBe('');
      expect(entry.inProgress).toBe(entry.graduated === null);
      entry.topics?.forEach((topic) => {
        expectLocalized(topic, `${entry.id} topic`);
      });
    }
    for (const cert of cv.certifications) expectLocalized(cert.title, cert.id);
    for (const language of cv.spokenLanguages) expectLocalized(language.name, language.id);
    cv.summary.forEach((p, i) => {
      expectLocalized(p, `summary ${i}`);
    });
    expectLocalized(cv.hook, 'hook');
    expectLocalized(cv.role, 'role');
  });

  it('uses https links and a PDF path for the CV', () => {
    expect(cv.identity.links.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/in\//);
    expect(cv.identity.links.github).toMatch(/^https:\/\/github\.com\//);
    expect(cv.identity.cvPath).toMatch(/^\/cv\/.+\.pdf$/);
  });

  it('never stores the email as a plain string', () => {
    expect(JSON.stringify(cv)).not.toMatch(/[\w.]+@[\w.]+/);
  });
});
