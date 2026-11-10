/**
 * Privacy guard (spec, sections 3 and 8): no phone number or age may appear in the source,
 * the content, the public assets or the production build.
 *
 * Two layers:
 * 1. Generic patterns committed here (any Brazilian phone format, ages, birth dates).
 *    The real values are never written in the repo.
 * 2. Exact strings supplied out of band, one per line or comma-separated:
 *    - locally: an untracked `.privacy-denylist` file in the repo root,
 *    - in CI: the `PRIVACY_DENYLIST` secret, exposed as an environment variable.
 *    Digit-only entries also match with any separators (spaces, dots, dashes, brackets).
 *
 * The CV PDF's text is compressed and glyph-encoded by Chromium, so the raw scan cannot read
 * it. Instead the test regenerates the CV HTML from cv.ts (email replaced by a placeholder),
 * scans that, and checks its hash and the PDF's hash against the manifest written by
 * `npm run cv`. That is a consistency check (cv.ts, template, manifest and committed PDF
 * still belong together), not a proof of how the PDF was produced. The PDF's metadata and
 * link targets are checked separately.
 *
 * William's email is public and, by his decision (A, 2026-11-09), linked from the CV PDF as
 * a visible mailto: link. It must therefore never be put in the denylist.
 *
 * This file and its folder are excluded from the scan because they describe the patterns.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMAIL_PLACEHOLDER, renderCvHtml } from '../../scripts/cv/template';
import { cv } from '../../src/content/cv';
import { emailFromParts } from '../../src/content/email';

const ROOT = join(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const SELF_DIR = join('tests', 'privacy');
const CV_PDF = join(ROOT, 'public', ...cv.identity.cvPath.split('/').filter(Boolean));
const CV_MANIFEST = join(ROOT, 'scripts', 'cv', 'cv-pdf.manifest.json');

const BINARY = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
]);

export const GENERIC_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  {
    name: 'phone with +55 country code',
    pattern: /\+\s?55[\s.-]*\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]?\d{4}/,
  },
  { name: 'phone with (DDD)', pattern: /\(\d{2}\)\s?9?\d{4}[\s.-]?\d{4}/ },
  { name: 'phone DDD + mobile', pattern: /(?<![\w.])\d{2}[\s.-]9\d{4}[\s.-]?\d{4}(?![\w.])/ },
  { name: 'mobile number 9XXXX-XXXX', pattern: /(?<![\w.])9\d{4}-\d{4}(?![\w.])/ },
  { name: 'tel: link', pattern: /\btel:\+?\d/i },
  { name: 'WhatsApp link', pattern: /\bwa\.me\/|api\.whatsapp\.com/i },
  { name: 'age (years old)', pattern: /\b\d{2}\s*(years?\s+old|anos\s+de\s+idade|y\/o)\b/i },
  { name: 'age (label)', pattern: /\b(age|idade)\s*[:=-]\s*\d{2}\b/i },
  {
    name: 'date of birth',
    pattern: /\b(date of birth|birth\s?date|data de nascimento|nascid[oa] em)\b/i,
  },
];

function denylist(): string[] {
  const sources = [process.env.PRIVACY_DENYLIST ?? ''];
  const local = join(ROOT, '.privacy-denylist');
  if (existsSync(local)) sources.push(readFileSync(local, 'utf8'));
  return sources
    .flatMap((s) => s.split(/[\n,]/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !s.startsWith('#'));
}

/**
 * CI sets PRIVACY_DENYLIST_REQUIRED=1 on every run except pull requests from forks (which
 * get no secrets). Returns the failure message when the denylist is then empty, else null.
 */
export function missingDenylist(
  required: string | undefined,
  entries: readonly string[],
): string | null {
  if (required !== '1' || entries.length > 0) return null;
  return (
    'PRIVACY_DENYLIST is empty: set the PRIVACY_DENYLIST secret under both Actions and ' +
    'Dependabot secrets (exact private values such as the phone number; never the public ' +
    'email, which the CV PDF links by decision A)'
  );
}

/** Removes separators between digits, so "51 9 1234-5678" matches "51912345678". */
const collapseDigits = (text: string) => text.replace(/(?<=\d)[\s().+-]+(?=\d)/g, '');

export function findViolations(text: string, exact: readonly string[]): string[] {
  const found = GENERIC_PATTERNS.filter(({ pattern }) => pattern.test(text)).map((p) => p.name);
  const lower = text.toLowerCase();
  const collapsed = collapseDigits(text);
  for (const entry of exact) {
    const digits = entry.replace(/\D/g, '');
    const isNumber = digits.length >= 6 && /^[\d\s().+-]+$/.test(entry);
    if (isNumber ? collapsed.includes(digits) : lower.includes(entry.toLowerCase())) {
      found.push('denylisted value');
    }
  }
  return found;
}

/** Files git would commit (tracked + untracked, minus .gitignore'd), plus the build output. */
function repoFiles(): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  return out
    .split('\0')
    .filter(Boolean)
    .filter((file) => !file.split('/').join(sep).startsWith(SELF_DIR))
    .filter((file) => existsSync(join(ROOT, file)));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function scan(files: readonly string[], base: string) {
  const exact = denylist();
  const violations: string[] = [];
  for (const file of files) {
    const full = join(base, file);
    if (BINARY.has(extname(full).toLowerCase())) continue;
    // PDFs are scanned as latin1 so their metadata and uncompressed text are covered too.
    const text = readFileSync(full, extname(full) === '.pdf' ? 'latin1' : 'utf8');
    for (const v of findViolations(text, exact)) violations.push(`${file}: ${v}`);
  }
  return violations;
}

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

interface CvPdfManifest {
  pdf: string;
  pdfSha256: string;
  htmlSha256: string;
  htmlEmailPlaceholder: string;
  chromium: string;
}

// ---------------------------------------------------------------------------------------
// Minimal PDF reader for the document information dictionary (the trailer's /Info).
// ---------------------------------------------------------------------------------------

const WHITESPACE = /[\0\t\n\f\r ]/;
const DELIMITER = /[\0\t\n\f\r ()<>[\]{}/%]/;

function skipSpace(pdf: string, i: number): number {
  while (i < pdf.length && WHITESPACE.test(pdf.charAt(i))) i++;
  return i;
}

/** Reads one PDF object starting at `i` and returns its raw text and the next index. */
function readValue(pdf: string, i: number): [string, number] {
  const start = i;
  const c = pdf.charAt(i);
  if (c === '(') {
    let depth = 0;
    for (; i < pdf.length; i++) {
      const ch = pdf.charAt(i);
      if (ch === '\\') i++;
      else if (ch === '(') depth++;
      else if (ch === ')' && --depth === 0) return [pdf.slice(start, i + 1), i + 1];
    }
    throw new Error('Unterminated PDF string');
  }
  if (pdf.startsWith('<<', i)) {
    const end = parseDict(pdf, i + 2).end;
    return [pdf.slice(start, end), end];
  }
  if (c === '<') {
    const end = pdf.indexOf('>', i);
    if (end < 0) throw new Error('Unterminated PDF hex string');
    return [pdf.slice(start, end + 1), end + 1];
  }
  if (c === '[') {
    i = skipSpace(pdf, i + 1);
    while (pdf.charAt(i) !== ']') {
      if (i >= pdf.length) throw new Error('Unterminated PDF array');
      i = skipSpace(pdf, readValue(pdf, i)[1]);
    }
    return [pdf.slice(start, i + 1), i + 1];
  }
  i++;
  while (i < pdf.length && !DELIMITER.test(pdf.charAt(i))) i++;
  // An indirect reference "12 0 R" is one value.
  const ref = /^\s+\d+\s+R(?![^\0\t\n\f\r ()<>[\]{}/%])/.exec(pdf.slice(i, i + 32));
  if (/^\d+$/.test(pdf.slice(start, i)) && ref) i += ref[0].length;
  return [pdf.slice(start, i), i];
}

/** Parses a dictionary whose `<<` ends just before `i`. Keys keep their order. */
function parseDict(pdf: string, i: number): { entries: [string, string][]; end: number } {
  const entries: [string, string][] = [];
  for (;;) {
    i = skipSpace(pdf, i);
    if (pdf.startsWith('>>', i)) return { entries, end: i + 2 };
    if (pdf.charAt(i) !== '/') throw new Error(`Expected a PDF name at ${i}`);
    const [key, afterKey] = readValue(pdf, i);
    const [value, afterValue] = readValue(pdf, skipSpace(pdf, afterKey));
    entries.push([key.slice(1), value]);
    i = afterValue;
  }
}

/** The document information dictionary of a PDF read as latin1. */
export function pdfInfo(pdf: string): [string, string][] {
  const trailer = pdf.lastIndexOf('trailer');
  const ref = trailer < 0 ? null : /\/Info\s+(\d+)\s+(\d+)\s+R/.exec(pdf.slice(trailer));
  if (!ref) throw new Error('PDF has no classic trailer with an /Info entry');
  const header = new RegExp(`(?<![\\d.])${ref[1]}\\s+${ref[2]}\\s+obj\\s*<<`, 'g');
  let start = -1;
  // In an updated PDF the last definition of an object wins.
  for (const match of pdf.matchAll(header)) start = match.index + match[0].length;
  if (start < 0) throw new Error('PDF /Info object not found');
  return parseDict(pdf, start).entries;
}

/** Decodes a PDF text string (literal or hex; PDFDocEncoding-as-latin1 or UTF-16BE). */
export function pdfText(raw: string): string {
  let bytes: string;
  if (raw.startsWith('(')) {
    bytes = raw.slice(1, -1).replace(/\\([0-7]{1,3}|[\s\S])/g, (_, esc: string) => {
      if (/^[0-7]/.test(esc)) return String.fromCharCode(parseInt(esc, 8));
      const named: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
      return esc === '\n' ? '' : (named[esc] ?? esc);
    });
  } else if (raw.startsWith('<')) {
    bytes = Buffer.from(raw.slice(1, -1).replace(/\s/g, ''), 'hex').toString('latin1');
  } else {
    throw new Error(`Not a PDF string: ${raw}`);
  }
  if (!bytes.startsWith('\xFE\xFF')) return bytes;
  return Buffer.from(bytes.slice(2), 'latin1').swap16().toString('utf16le');
}

describe('privacy scan', () => {
  it('the detector catches phone numbers, ages and denylisted values', () => {
    const samples = [
      '+55 (11) 91234-5678',
      '+5511912345678',
      'call (11) 91234-5678',
      '11 91234-5678',
      '91234-5678',
      '<a href="tel:+5511">',
      'Age: 30',
      '30 years old',
      '30 anos de idade',
      'Data de nascimento',
    ];
    for (const sample of samples) expect(findViolations(sample, []), sample).not.toEqual([]);
    expect(findViolations('id 11-9-1234-5678', ['11 912345678'])).toContain('denylisted value');
    expect(findViolations('Some Secret Word', ['secret word'])).toContain('denylisted value');
  });

  it('does not flag ordinary content', () => {
    for (const sample of [
      'Oct 2019 – Oct 2021',
      'Python Impressionador (180 hours)',
      'Seven years, five industries',
      'Porto Alegre, RS, Brazil',
      'version 1.2.3-beta.4',
      'sha512-9Abc1234-5678xyz',
    ]) {
      expect(findViolations(sample, []), sample).toEqual([]);
    }
  });

  it('the guard requires a denylist only when PRIVACY_DENYLIST_REQUIRED is 1', () => {
    expect(missingDenylist('1', [])).toMatch(/Actions and Dependabot/);
    expect(missingDenylist('1', ['x'])).toBeNull();
    expect(missingDenylist('', [])).toBeNull();
    expect(missingDenylist(undefined, [])).toBeNull();
    expect(missingDenylist('true', [])).toBeNull();
  });

  it('has a denylist to scan with when CI requires one', () => {
    expect(missingDenylist(process.env.PRIVACY_DENYLIST_REQUIRED, denylist())).toBeNull();
  });

  it('the denylist does not contain the public email (the CV PDF links it, decision A)', () => {
    const email = emailFromParts(cv.identity.emailParts).toLowerCase();
    const listed = denylist().some((entry) => email.includes(entry.toLowerCase()));
    // Compared as a boolean so a failure never prints the address.
    expect(
      listed,
      'A denylist entry matches the public email. Remove it: the CV PDF links the email by ' +
        "William's decision (A, 2026-11-09).",
    ).toBe(false);
  });

  it('source, content, config and public assets are clean', () => {
    const files = repoFiles();
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.startsWith('src/content/'))).toBe(true);
    expect(scan(files, ROOT)).toEqual([]);
  });

  const requireDist = process.env.CI === 'true' || process.env.REQUIRE_DIST === '1';
  it.runIf(existsSync(DIST) || requireDist)('the production build (dist/) is clean', () => {
    expect(existsSync(DIST), 'dist/ missing: run `npm run build` first').toBe(true);
    const files = walk(DIST).map((f) => relative(DIST, f));
    expect(files.some((f) => f.endsWith('.js'))).toBe(true);
    expect(scan(files, DIST)).toEqual([]);
  });
});

describe('CV PDF', () => {
  const manifest = JSON.parse(readFileSync(CV_MANIFEST, 'utf8')) as CvPdfManifest;
  const pdf = readFileSync(CV_PDF);
  const rebuild = 'cv.ts or the CV template changed: run `npm run cv` on Windows and commit';

  it('the PDF reader handles literal, hex and UTF-16 strings, references and nesting', () => {
    const sample = [
      '1 0 obj',
      '<</Title <FEFF00412013>',
      String.raw`/Creator (Chro\(mi\)um)`,
      String.raw`/Producer (a/b \050c\051)`,
      '/Ref 12 0 R /Arr [1 (x) <</K /V>>] /Nested <</Author (x)>>>>',
      'endobj',
      '11 0 obj <</Title (old)>> endobj',
      'trailer',
      '<</Size 2 /Info 1 0 R>>',
    ].join('\n');
    const info = pdfInfo(sample);
    expect(info.map(([key]) => key)).toEqual([
      'Title',
      'Creator',
      'Producer',
      'Ref',
      'Arr',
      'Nested',
    ]);
    expect(pdfText(info[0]?.[1] ?? '')).toBe('A–');
    expect(pdfText(info[1]?.[1] ?? '')).toBe('Chro(mi)um');
    expect(pdfText(info[2]?.[1] ?? '')).toBe('a/b (c)');
    expect(info[3]?.[1]).toBe('12 0 R');
    expect(() => pdfInfo('%PDF-1.4 no trailer')).toThrow();
  });

  it('the CV HTML regenerated from cv.ts is clean and matches the manifest', () => {
    expect(manifest.htmlEmailPlaceholder).toBe(EMAIL_PLACEHOLDER);
    const html = renderCvHtml(cv, EMAIL_PLACEHOLDER);
    expect(findViolations(html, denylist())).toEqual([]);
    expect(sha256(html), rebuild).toBe(manifest.htmlSha256);
  });

  it('the committed PDF is the one recorded in the manifest', () => {
    expect(manifest.pdf).toBe(relative(ROOT, CV_PDF).split(sep).join('/'));
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(sha256(pdf), rebuild).toBe(manifest.pdfSha256);
  });

  it('the PDF links only to the cv.ts email, LinkedIn and GitHub', () => {
    const raw = pdf.toString('latin1');
    // "/URI (…)" entries of link actions; "/S /URI" (the action type) is not followed by a string.
    const uris = [...raw.matchAll(/\/URI\s*(?=[(<])/g)].map((match) =>
      pdfText(readValue(raw, match.index + match[0].length)[0]),
    );
    const mailtos = uris.filter((uri) => uri.toLowerCase().startsWith('mailto:'));
    const expectedMailto = `mailto:${emailFromParts(cv.identity.emailParts)}`;
    expect(mailtos.length).toBe(1);
    // Compared as a boolean so a failure never prints the address.
    expect(mailtos[0] === expectedMailto, 'the mailto: link is not the cv.ts address').toBe(true);
    expect(uris.filter((uri) => !mailtos.includes(uri)).sort()).toEqual(
      [cv.identity.links.linkedin, cv.identity.links.github].sort(),
    );
  });

  it('the PDF metadata is only the title and Chromium fields, with no XMP', () => {
    const raw = pdf.toString('latin1');
    // Every dictionary must be readable as plain text for the checks below to mean anything.
    expect(raw).not.toContain('/ObjStm');
    expect(raw).not.toContain('/Metadata');
    const info = pdfInfo(raw);
    expect(info.map(([key]) => key).sort()).toEqual(
      ['CreationDate', 'Creator', 'ModDate', 'Producer', 'Title'].sort(),
    );
    const title = info.find(([key]) => key === 'Title')?.[1] ?? '';
    expect(pdfText(title)).toBe(`${cv.identity.name} – CV`);
    for (const [, value] of info) expect(findViolations(pdfText(value), denylist())).toEqual([]);
  });
});
