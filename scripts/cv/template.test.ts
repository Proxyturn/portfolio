import { describe, expect, it } from 'vitest';
import { cv } from '../../src/content/cv';
import type { CV, Job } from '../../src/content/types';
import {
  EMAIL_PLACEHOLDER,
  certificationLine,
  coursework,
  displayUrl,
  escapeAttr,
  escapeHtml,
  formatSpan,
  groupJobs,
  lowerFirst,
  newestFirst,
  oxfordJoin,
  projectHeading,
  renderCvHtml,
  sectorLabel,
  spanOf,
  summaryTexts,
} from './template';

const render = (data: CV = cv, email = EMAIL_PLACEHOLDER) => renderCvHtml(data, email);
const tagTexts = (html: string, tag: string) =>
  [...html.matchAll(new RegExp(`<${tag}>(.*?)</${tag}>`, 'g'))].map((m) => m[1]);
const job = (id: string) => {
  const found = cv.jobs.find((j) => j.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('escaping', () => {
  it('escapes text and attribute values', () => {
    expect(escapeHtml(`<b>&"'`)).toBe(`&lt;b&gt;&amp;"'`);
    expect(escapeAttr(`"><x a='1'>&`)).toBe('&quot;&gt;&lt;x a=&#39;1&#39;&gt;&amp;');
  });

  it('never lets data inject markup', () => {
    const evil = '"><script>alert(1)</script>';
    const hostile: CV = {
      ...cv,
      identity: { ...cv.identity, name: evil, location: { en: evil, pt: evil } },
      role: { en: evil, pt: evil },
      summary: cv.summary.map(() => ({ en: evil, pt: evil })),
      jobs: cv.jobs.map((j) => ({
        ...j,
        company: `${j.company}${evil}`,
        ...(j.project ? { project: `${j.project}${evil}` } : {}),
        highlights: [{ en: evil, pt: evil }],
      })),
      skills: cv.skills.map((s) => ({ ...s, name: { en: evil, pt: evil } })),
      certifications: [{ id: 'x', title: { en: evil, pt: evil } }],
    };
    const html = render(hostile, evil);
    expect(html).not.toContain('<script');
    const tags = new Set([...html.matchAll(/<\/?([a-z0-9!]+)/gi)].map((m) => m[1]));
    expect([...tags].sort()).toEqual(
      [
        '!doctype',
        ...['html', 'head', 'meta', 'title', 'style', 'body', 'header', 'h1', 'h2', 'h3', 'h4'],
        ...['div', 'span', 'a', 'p', 'b', 'ul', 'li'],
      ].sort(),
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain(`href="mailto:&quot;&gt;&lt;script&gt;`);
  });

  it('refuses links that are not https', () => {
    const bad = (url: string): CV => ({
      ...cv,
      identity: { ...cv.identity, links: { ...cv.identity.links, github: url } },
    });
    expect(() => render(bad('data:text/html,x'))).toThrow(/non-https/);
    expect(() => render(bad('http://example.com'))).toThrow(/non-https/);
    expect(() => render(bad('https://x" onclick="y'))).toThrow(/non-https/);
  });
});

describe('header and links', () => {
  it('shows the name, role, city and exactly three links', () => {
    const html = render(cv, 'someone@example.test');
    expect(html).toContain('<title>William Amaro Finardi – CV</title>');
    expect(html).toContain('<h1>WILLIAM AMARO FINARDI</h1>');
    expect(html).toContain('<div class="role">Software Developer</div>');
    expect(html).toContain('<span>Porto Alegre, RS, Brazil</span>');
    const links = [...html.matchAll(/<a href="([^"]*)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      ['mailto:someone@example.test', 'someone@example.test'],
      [cv.identity.links.linkedin, 'linkedin.com/in/william-finardi-819b21b7'],
      [cv.identity.links.github, 'github.com/Proxyturn'],
    ]);
  });

  it('shortens URLs for display', () => {
    expect(displayUrl('https://www.example.com/a/b/')).toBe('example.com/a/b');
    expect(displayUrl('http://example.com')).toBe('example.com');
  });

  it('only contains the email passed in', () => {
    expect(render()).toContain(`mailto:${EMAIL_PLACEHOLDER}`);
    expect(render()).not.toMatch(/[\w.-]+@[\w-]+\.[a-z]/i);
  });
});

describe('experience', () => {
  it('lists employers newest first, with ATOS grouped once', () => {
    expect(tagTexts(render(), 'h3').slice(0, 3)).toEqual([
      'SEMANTIX (formerly ATOS)',
      'ATOS',
      'Novus Automação',
    ]);
  });

  it('orders the output by date, not by the order of the data', () => {
    const shuffled: CV = { ...cv, jobs: [...cv.jobs].reverse() };
    expect(render(shuffled)).toBe(render());
    expect(newestFirst([...cv.jobs].reverse()).map((j) => j.id)).toEqual(cv.jobs.map((j) => j.id));
  });

  it('nests the six ATOS jobs as projects, newest first', () => {
    const groups = groupJobs(cv.jobs);
    expect(groups.map((g) => g.length)).toEqual([1, 6, 1]);
    expect(tagTexts(render(), 'h4')).toEqual([
      'Project: CEMIG / CPFL · Energy sector',
      'Project: Alphaville',
      'Project: Sodexo',
      'Project: CPFL · Energy sector',
      'Frontend development',
      'Project: Bradesco · Banking sector',
    ]);
  });

  it('derives the ATOS span from its earliest and latest project dates', () => {
    expect(render()).toContain('<h3>ATOS</h3><span class="when">Nov 2021 – Mar 2026</span>');
    const earlier: Job = { ...job('atos-bradesco'), id: 'atos-x', start: { year: 2020, month: 2 } };
    const later: Job = { ...job('atos-alphaville'), id: 'atos-y', end: null };
    const html = render({ ...cv, jobs: [...cv.jobs, earlier, later] });
    expect(html).toContain('<h3>ATOS</h3><span class="when">Feb 2020 – Present</span>');
  });

  it('computes spans with "present" as the latest end', () => {
    expect(spanOf([job('atos-cpfl'), job('atos-sodexo')])).toEqual({
      start: { year: 2023, month: 6 },
      end: { year: 2025, month: 1 },
    });
    expect(spanOf([job('semantix'), job('novus')]).end).toBeNull();
    expect(spanOf([job('novus'), job('semantix')]).end).toBeNull();
    expect(() => spanOf([])).toThrow();
    expect(formatSpan({ year: 2026, month: 3 }, null)).toBe('Mar 2026 – Present');
  });

  it('capitalizes sectors and hides the generic corporate one', () => {
    expect(sectorLabel('energy')).toBe('Energy sector');
    expect(sectorLabel('banking')).toBe('Banking sector');
    expect(sectorLabel('corporate')).toBeNull();
    expect(sectorLabel(undefined)).toBeNull();
  });

  it('uses the approved heading for the ATOS job without a project, and only for it', () => {
    expect(projectHeading(job('atos-frontend'))).toBe('Frontend development');
    const { project: _omit, ...unnamed } = job('atos-cpfl');
    expect(() => projectHeading({ ...unnamed, id: 'atos-unknown' })).toThrow(/atos-unknown/);
  });

  it('shows clients with an Oxford comma and the Novus role line', () => {
    const html = render();
    expect(html).toContain('<p class="sub">Clients: VCIMENTOS / VPAR, CBA, and Votorantim</p>');
    expect(html).toContain('<p class="sub">Intern / Tester / Developer</p>');
  });

  it('prints every highlight exactly as written in cv.ts', () => {
    const items = tagTexts(render(), 'li');
    for (const highlight of cv.jobs.flatMap((j) => j.highlights)) {
      expect(items).toContain(highlight.en);
    }
  });
});

describe('other sections', () => {
  it('merges the first two summary paragraphs', () => {
    const html = render();
    const [first, second, third] = cv.summary.map((p) => p.en);
    const paragraphs = tagTexts(html, 'p').map((p) => p?.replace(/<\/?span[^>]*>/g, ''));
    expect(paragraphs).toContain(`${first ?? ''} ${second ?? ''}`);
    expect(paragraphs).toContain(third);
    expect(html).toContain('<span class="nw">object-oriented</span>');
  });

  it('writes skills as running lines', () => {
    const html = render();
    expect(html).toContain('<p><b>Languages:</b> <span>C#, JavaScript, TypeScript</span></p>');
    expect(html).toContain('MVC architecture, SQL Server, Azure DevOps, cloud services</span></p>');
    expect(html).toContain(
      '<b>Concepts:</b> <span>Object-oriented programming, backend development, software architecture, debugging, system maintenance, agile methodologies</span>',
    );
  });

  it('writes education, certifications and languages', () => {
    const html = render();
    expect(html).toContain('<span class="when">In progress</span>');
    expect(html).toContain('<span class="when">Graduated June 2022</span>');
    expect(html).toContain(
      '<p>Coursework: AI fundamentals, large language models (LLMs), retrieval-augmented generation (RAG), and building AI agents.</p>',
    );
    expect(tagTexts(html, 'li')).toEqual(
      expect.arrayContaining([
        'Python Impressionador – 180 hours',
        'Desenvolvedor.IO – multiple backend-focused certifications',
        'English courses with Cambridge PET and FCE certifications',
      ]),
    );
    expect(html).toContain('<p>Portuguese: native · English: fluent · Spanish: basic</p>');
  });

  it('joins lists with an Oxford comma and keeps acronyms capitalized', () => {
    expect(oxfordJoin([])).toBe('');
    expect(oxfordJoin(['a'])).toBe('a');
    expect(oxfordJoin(['a', 'b'])).toBe('a and b');
    expect(oxfordJoin(['a', 'b', 'c'])).toBe('a, b, and c');
    expect(lowerFirst('Building AI agents')).toBe('building AI agents');
    expect(lowerFirst('AI fundamentals')).toBe('AI fundamentals');
    expect(lowerFirst('REST APIs')).toBe('REST APIs');
  });

  it('is deterministic', () => {
    expect(render()).toBe(render());
  });
});

describe('explicit formatting rules', () => {
  const ai = cv.education.find((e) => e.id === 'ai-engineering');
  if (!ai?.topics) throw new Error('ai-engineering topics missing');
  const topics = ai.topics;

  it('cases each coursework topic by its own rule, never by guessing', () => {
    // A proper-noun topic in a lower-first slot would be lower-cased; one in an
    // 'as-written' slot (position 0 here) keeps its capital.
    const renamed = { ...ai, topics: [{ en: 'Python basics', pt: 'x' }, ...topics.slice(1)] };
    expect(coursework(renamed)).toMatch(/^Coursework: Python basics, large language models/);
  });

  it('refuses topics without a casing rule', () => {
    const extra = { ...ai, topics: [...topics, { en: 'Kubernetes', pt: 'Kubernetes' }] };
    expect(() => coursework(extra)).toThrow(/casing rule/);
    expect(() => coursework({ ...ai, id: 'new-course' })).toThrow(/new-course/);
    expect(coursework({ ...ai, topics: [] })).toBeNull();
  });

  it('only dashes the Desenvolvedor.IO title', () => {
    expect(certificationLine({ id: 'desenvolvedor-io', title: { en: 'A: b', pt: 'A: b' } })).toBe(
      'A – b',
    );
    expect(certificationLine({ id: 'other', title: { en: 'A: b', pt: 'A: b' }, hours: 8 })).toBe(
      'A: b – 8 hours',
    );
    expect(() =>
      certificationLine({ id: 'desenvolvedor-io', title: { en: 'No colon', pt: 'x' } }),
    ).toThrow(/desenvolvedor-io/);
  });

  it('merges summary paragraphs 1 and 2 by position and fails if the count changes', () => {
    const [a, b, c] = cv.summary.map((p) => p.en);
    expect(summaryTexts(cv)).toEqual([`${a ?? ''} ${b ?? ''}`, c]);
    expect(() => summaryTexts({ ...cv, summary: cv.summary.slice(0, 2) })).toThrow(
      /approved for 3/,
    );
    const four = [...cv.summary, { en: 'More.', pt: 'Mais.' }];
    expect(() => summaryTexts({ ...cv, summary: four })).toThrow(/cv.ts has 4/);
  });

  it('uses the Clients line only for single-job companies with a project', () => {
    const html = render();
    expect(html.match(/<p class="sub">Clients:/g)).toHaveLength(1);
    const solo: Job = { ...job('atos-cpfl'), company: 'Solo', start: { year: 2018, month: 1 } };
    expect(render({ ...cv, jobs: [...cv.jobs, solo] })).toContain(
      '<h3>Solo</h3><span class="when">Jan 2018 – Oct 2024</span></div>\n  <p class="sub">Clients: CPFL</p>',
    );
  });
});
