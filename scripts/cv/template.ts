/**
 * Turns the CV data in `src/content/cv.ts` into the HTML of the downloadable CV PDF.
 *
 * Pure and deterministic: the same data and email always give the same string, so the
 * privacy test can regenerate it (with `EMAIL_PLACEHOLDER`) and compare its hash with the
 * manifest written by `build.ts`. Every value from the data is HTML-escaped.
 *
 * The labels below are print-only English strings approved with the CV draft (2026-11-09).
 * They deliberately live here, not in the site's i18n dictionaries. The PDF is EN only.
 *
 * Runs under Node's `--experimental-strip-types`, so: type-only imports, no enums, no
 * namespaces, no parameter properties.
 */
import type {
  Certification,
  CV,
  Education,
  Fluency,
  Job,
  Sector,
  Skill,
  SkillGroup,
  SkillId,
  YearMonth,
} from '../../src/content/types';

/** Stands in for the email in the hashed HTML, so the manifest reveals nothing. */
export const EMAIL_PLACEHOLDER = 'EMAIL_PLACEHOLDER';

const LABELS = {
  formerly: 'formerly',
  present: 'Present',
  summary: 'Professional Summary',
  skills: 'Technical Skills',
  experience: 'Professional Experience',
  education: 'Education',
  certifications: 'Courses and Certifications',
  languages: 'Languages',
  clients: 'Clients:',
  project: 'Project:',
  sector: 'sector',
  coursework: 'Coursework:',
  graduated: 'Graduated',
  inProgress: 'In progress',
  hours: 'hours',
} as const;

const SKILL_GROUP_LABELS: Record<SkillGroup, string> = {
  languages: 'Languages',
  frameworks: 'Frameworks and technologies',
  concepts: 'Concepts',
};

const SKILL_GROUP_ORDER: readonly SkillGroup[] = ['languages', 'frameworks', 'concepts'];

/**
 * Whether a skill name is a proper noun (kept as written) or a common phrase (lower-cased
 * when it is not the first item of a running line, e.g. "…, cloud services"). A Record so
 * that adding a skill to `SkillId` fails the type check until it is classified here.
 */
const SKILL_NOUN: Record<SkillId, 'proper' | 'common'> = {
  csharp: 'proper',
  javascript: 'proper',
  typescript: 'proper',
  react: 'proper',
  angular: 'proper',
  xamarin: 'proper',
  mendix: 'proper',
  rest: 'proper',
  mvc: 'proper',
  sqlserver: 'proper',
  azuredevops: 'proper',
  cloud: 'common',
  oop: 'common',
  backend: 'common',
  architecture: 'common',
  debugging: 'common',
  maintenance: 'common',
  agile: 'common',
};

/*
 * Layout rules approved with the CV draft (2026-11-09):
 * - Jobs are grouped by company. A company with several jobs (ATOS) gets one header with
 *   the span of all its jobs, and each job becomes a "Project: <project> · <Sector> sector"
 *   entry, or uses UNNAMED_PROJECT_HEADINGS when it names no project.
 * - A company with a single job shows its project as a "Clients:" line instead, split on
 *   ", " and re-joined with an Oxford comma (SEMANTIX: "VCIMENTOS / VPAR, CBA, and
 *   Votorantim"), after its role line if it has one (Novus).
 * - The summary has exactly SUMMARY_PARAGRAPH_COUNT paragraphs in cv.ts; paragraphs 1 and 2
 *   (by position) are merged into the first printed paragraph, the rest print as they are.
 *   A different count fails the build, so the merge has to be reviewed again.
 */

/** Headings for grouped jobs whose CV entry names no project. Keyed by job id. */
const UNNAMED_PROJECT_HEADINGS: Readonly<Record<string, string>> = {
  'atos-frontend': 'Frontend development',
};

/** Number of summary paragraphs the merge rule above was approved for. */
const SUMMARY_PARAGRAPH_COUNT = 3;

/**
 * Casing of each coursework topic in the running "Coursework:" line, by education id and
 * topic position: 'as-written' keeps cv.ts's text, 'lower-first' lower-cases its first letter
 * ("Building AI agents" → "building AI agents"). Every education entry with topics must be
 * listed with one rule per topic, so a new topic (perhaps a proper noun) needs a decision.
 */
const TOPIC_CASING: Readonly<Record<string, readonly ('as-written' | 'lower-first')[]>> = {
  'ai-engineering': ['as-written', 'lower-first', 'lower-first', 'lower-first'],
};

/** Certifications whose "Name: detail" title prints as "Name – detail". Keyed by id. */
const DASHED_CERTIFICATION_TITLES: ReadonlySet<string> = new Set(['desenvolvedor-io']);

/** Sectors not shown next to a project name ("corporate" is the generic catch-all). */
const HIDDEN_SECTORS: ReadonlySet<Sector> = new Set<Sector>(['corporate']);

const FLUENCY_LABELS: Record<Fluency, string> = {
  native: 'native',
  fluent: 'fluent',
  basic: 'basic',
};

/** Words kept on one line in the summary (layout only; the text is unchanged). */
const SUMMARY_NOWRAP: readonly string[] = ['object-oriented'];

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DASH = '–';

const STYLE = `  @page { size: A4; margin: 15mm 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 10.4pt; line-height: 1.32; color: #1f2328; }
  a { color: inherit; text-decoration: none; }
  .nw { white-space: nowrap; }
  header { border-bottom: 2px solid #1f4e79; padding-bottom: 6pt; margin-bottom: 8pt; }
  h1 { font-size: 21pt; letter-spacing: 0.5pt; margin: 0; font-weight: 600; color: #1f4e79; }
  .role { font-size: 12pt; margin: 1pt 0 3pt; font-weight: 600; }
  .contact { font-size: 9.6pt; color: #3d444d; }
  .contact > span + span::before { content: "  ·  "; color: #8c959f; }
  h2 { font-size: 10.6pt; text-transform: uppercase; letter-spacing: 0.3pt; color: #1f4e79; margin: 10pt 0 4pt; padding-bottom: 2pt; border-bottom: 1px solid #d0d7de; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; }
  h3, h4 { font-size: inherit; margin: 0; }
  h3 { font-weight: 700; }
  h4 { font-weight: 600; }
  .when { font-weight: 600; white-space: nowrap; color: #3d444d; }
  p { margin: 0 0 4pt; }
  .skills p { margin-bottom: 2pt; }
  .job { margin-bottom: 7pt; }
  .job > .row, .job > .sub { break-after: avoid; }
  .sub { font-style: italic; color: #3d444d; margin: 0 0 1pt; }
  ul { margin: 1pt 0 0; padding-left: 13pt; }
  li { margin-bottom: 1pt; }
  .project { margin: 4pt 0 0 8pt; break-inside: avoid; }
  .edu { margin-bottom: 5pt; break-inside: avoid; }`;

// ---------------------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------------------

/** Escapes text content. */
export function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Escapes a double-quoted attribute value. */
export function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** Only absolute https links are allowed into the PDF. */
function safeHttpsUrl(url: string): string {
  if (!/^https:\/\/[^\s"'<>]+$/.test(url)) throw new Error(`Refusing non-https link: ${url}`);
  return url;
}

// ---------------------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------------------

/** "a", "a and b", "a, b, and c" (Oxford comma). */
export function oxfordJoin(items: readonly string[]): string {
  if (items.length <= 2) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1] ?? ''}`;
}

/** Lower-cases the first letter of a capitalized word ("Building" → "building"), not acronyms. */
export function lowerFirst(value: string): string {
  return /^[A-Z][a-z]/.test(value) ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "https://www.linkedin.com/in/x/" → "linkedin.com/in/x". */
export function displayUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------

const monthIndex = (date: YearMonth) => date.year * 12 + (date.month - 1);

export function formatShort(date: YearMonth): string {
  return `${MONTHS_SHORT[date.month - 1] ?? ''} ${date.year}`;
}

export function formatLong(date: YearMonth): string {
  return `${MONTHS_LONG[date.month - 1] ?? ''} ${date.year}`;
}

/** "Mar 2026 – Present". `null` end means present. */
export function formatSpan(start: YearMonth, end: YearMonth | null): string {
  return `${formatShort(start)} ${DASH} ${end ? formatShort(end) : LABELS.present}`;
}

/** Newest first: by start date, then by end date (present last-ending wins). */
export function newestFirst(jobs: readonly Job[]): Job[] {
  const endIndex = (job: Job) => (job.end ? monthIndex(job.end) : Number.POSITIVE_INFINITY);
  return [...jobs].sort(
    (a, b) => monthIndex(b.start) - monthIndex(a.start) || endIndex(b) - endIndex(a),
  );
}

/** Earliest start and latest end of a set of jobs (`null` end = present). */
export function spanOf(jobs: readonly Job[]): { start: YearMonth; end: YearMonth | null } {
  const [first, ...rest] = jobs;
  if (!first) throw new Error('spanOf needs at least one job');
  let start = first.start;
  let end = first.end;
  for (const job of rest) {
    if (monthIndex(job.start) < monthIndex(start)) start = job.start;
    if (end !== null && (job.end === null || monthIndex(job.end) > monthIndex(end))) end = job.end;
  }
  return { start, end };
}

/**
 * Groups jobs by company, newest first. A company with several jobs (ATOS) becomes one
 * entry with its projects nested; the group sits where its newest job falls.
 */
export function groupJobs(jobs: readonly Job[]): Job[][] {
  const groups = new Map<string, Job[]>();
  for (const job of newestFirst(jobs)) {
    const group = groups.get(job.company);
    if (group) group.push(job);
    else groups.set(job.company, [job]);
  }
  return [...groups.values()];
}

// ---------------------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------------------

export function sectorLabel(sector: Sector | undefined): string | null {
  if (!sector || HIDDEN_SECTORS.has(sector)) return null;
  return `${capitalize(sector)} ${LABELS.sector}`;
}

/** "Project: CPFL · Energy sector", or the approved heading for a job with no project. */
export function projectHeading(job: Job): string {
  if (!job.project) {
    const heading = UNNAMED_PROJECT_HEADINGS[job.id];
    if (!heading) throw new Error(`No CV heading for job "${job.id}" (it names no project)`);
    return heading;
  }
  const sector = sectorLabel(job.sector);
  return `${LABELS.project} ${job.project}${sector ? ` · ${sector}` : ''}`;
}

/** "SEMANTIX (formerly ATOS)". */
export function companyHeading(job: Job): string {
  return job.formerly ? `${job.company} (${LABELS.formerly} ${job.formerly})` : job.company;
}

/** "Languages: C#, JavaScript, TypeScript" lines, common phrases lower-cased mid-line. */
export function skillLines(skills: readonly Skill[]): { label: string; values: string }[] {
  return SKILL_GROUP_ORDER.map((group) => ({
    label: SKILL_GROUP_LABELS[group],
    values: skills
      .filter((skill) => skill.group === group)
      .map((skill, i) =>
        i > 0 && SKILL_NOUN[skill.id] === 'common' ? lowerFirst(skill.name.en) : skill.name.en,
      )
      .join(', '),
  })).filter((line) => line.values.length > 0);
}

export function coursework(education: Education): string | null {
  if (!education.topics?.length) return null;
  const casing = TOPIC_CASING[education.id];
  if (casing?.length !== education.topics.length) {
    throw new Error(`No casing rule for every coursework topic of "${education.id}"`);
  }
  const topics = education.topics.map((topic, i) =>
    casing[i] === 'lower-first' ? lowerFirst(topic.en) : topic.en,
  );
  return `${LABELS.coursework} ${oxfordJoin(topics)}.`;
}

export function educationWhen(education: Education): string {
  if (education.inProgress) return LABELS.inProgress;
  return education.graduated ? `${LABELS.graduated} ${formatLong(education.graduated)}` : '';
}

function bullets(job: Job, indent: string): string[] {
  return [
    `${indent}<ul>`,
    ...job.highlights.map((h) => `${indent}  <li>${escapeHtml(h.en)}</li>`),
    `${indent}</ul>`,
  ];
}

const row = (tag: 'h3' | 'h4', heading: string, when: string) =>
  `<div class="row"><${tag}>${escapeHtml(heading)}</${tag}><span class="when">${escapeHtml(when)}</span></div>`;

function singleJob(job: Job): string {
  const subs = [
    job.role ? job.role.en : null,
    job.project ? `${LABELS.clients} ${oxfordJoin(job.project.split(', '))}` : null,
  ].filter((line): line is string => line !== null);
  return [
    '<div class="job">',
    `  ${row('h3', companyHeading(job), formatSpan(job.start, job.end))}`,
    ...subs.map((line) => `  <p class="sub">${escapeHtml(line)}</p>`),
    ...bullets(job, '  '),
    '</div>',
  ].join('\n');
}

function groupedJobs(group: readonly Job[]): string {
  const [newest] = group;
  if (!newest) return '';
  const span = spanOf(group);
  const projects = group.map((job) =>
    [
      '  <div class="project">',
      `    ${row('h4', projectHeading(job), formatSpan(job.start, job.end))}`,
      ...bullets(job, '    '),
      '  </div>',
    ].join('\n'),
  );
  return [
    '<div class="job">',
    `  ${row('h3', companyHeading(newest), formatSpan(span.start, span.end))}`,
    '',
    projects.join('\n\n'),
    '</div>',
  ].join('\n');
}

/** The printed summary: paragraphs 1 and 2 merged, the rest unchanged. */
export function summaryTexts(cv: CV): string[] {
  if (cv.summary.length !== SUMMARY_PARAGRAPH_COUNT) {
    throw new Error(
      `The CV summary merge was approved for ${SUMMARY_PARAGRAPH_COUNT} paragraphs; cv.ts has ${cv.summary.length}`,
    );
  }
  const [first, second, ...rest] = cv.summary.map((p) => p.en);
  return [`${first ?? ''} ${second ?? ''}`, ...rest];
}

function summaryParagraphs(cv: CV): string[] {
  return summaryTexts(cv).map((text) => {
    let html = escapeHtml(text);
    for (const phrase of SUMMARY_NOWRAP) {
      html = html.replaceAll(escapeHtml(phrase), `<span class="nw">${escapeHtml(phrase)}</span>`);
    }
    return `<p>${html}</p>`;
  });
}

function educationEntry(education: Education): string {
  const course = coursework(education);
  return [
    '<div class="edu">',
    `  ${row('h3', `${education.title.en} · ${education.institution}`, educationWhen(education))}`,
    ...(course ? [`  <p>${escapeHtml(course)}</p>`] : []),
    '</div>',
  ].join('\n');
}

/** "Python Impressionador – 180 hours", "Desenvolvedor.IO – multiple…". */
export function certificationLine(certification: Certification): string {
  const { id, title, hours } = certification;
  let name = title.en;
  if (DASHED_CERTIFICATION_TITLES.has(id)) {
    if (!name.includes(': ')) throw new Error(`Certification "${id}" has no "Name: detail" title`);
    name = name.replace(': ', ` ${DASH} `);
  }
  return hours === undefined ? name : `${name} ${DASH} ${hours} ${LABELS.hours}`;
}

// ---------------------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------------------

/** The full CV as an HTML document, ready for Chromium's `page.pdf()`. */
export function renderCvHtml(cv: CV, email: string): string {
  const { identity } = cv;
  const linkedin = safeHttpsUrl(identity.links.linkedin);
  const github = safeHttpsUrl(identity.links.github);
  const link = (href: string, text: string) =>
    `<a href="${escapeAttr(href)}">${escapeHtml(text)}</a>`;

  const contact = [
    `<span>${escapeHtml(identity.location.en)}</span>`,
    `<span>${link(`mailto:${email}`, email)}</span>`,
    `<span>${link(linkedin, displayUrl(linkedin))}</span>`,
    `<span>${link(github, displayUrl(github))}</span>`,
  ].join('');

  const skills = skillLines(cv.skills).map(
    ({ label, values }) =>
      `  <p><b>${escapeHtml(label)}:</b> <span>${escapeHtml(values)}</span></p>`,
  );

  const jobs = groupJobs(cv.jobs).map((group) =>
    group.length > 1 ? groupedJobs(group) : singleJob(group[0] as Job),
  );

  const certifications = cv.certifications.map(
    (c) => `  <li>${escapeHtml(certificationLine(c))}</li>`,
  );

  const languages = cv.spokenLanguages
    .map((l) => `${l.name.en}: ${FLUENCY_LABELS[l.fluency]}`)
    .join(' · ');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(`${identity.name} ${DASH} CV`)}</title>`,
    '<style>',
    STYLE,
    '</style>',
    '</head>',
    '<body>',
    '<header>',
    `  <h1>${escapeHtml(identity.name.toUpperCase())}</h1>`,
    `  <div class="role">${escapeHtml(cv.role.en)}</div>`,
    '  <div class="contact">',
    `    ${contact}`,
    '  </div>',
    '</header>',
    '',
    `<h2>${LABELS.summary}</h2>`,
    ...summaryParagraphs(cv),
    '',
    `<h2>${LABELS.skills}</h2>`,
    '<div class="skills">',
    ...skills,
    '</div>',
    '',
    `<h2>${LABELS.experience}</h2>`,
    '',
    jobs.join('\n\n'),
    '',
    `<h2>${LABELS.education}</h2>`,
    ...cv.education.map(educationEntry),
    '',
    `<h2>${LABELS.certifications}</h2>`,
    '<ul>',
    ...certifications,
    '</ul>',
    '',
    `<h2>${LABELS.languages}</h2>`,
    `<p>${escapeHtml(languages)}</p>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
