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
 * This file and its folder are excluded from the scan because they describe the patterns.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const SELF_DIR = join('tests', 'privacy');

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
