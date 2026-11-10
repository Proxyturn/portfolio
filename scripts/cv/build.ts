/**
 * Builds the downloadable CV PDF from `src/content/cv.ts`: `npm run cv`.
 *
 * 1. Renders the HTML with `template.ts` (EN only).
 * 2. Prints it to A4 PDF with Playwright's Chromium (tagged, with an outline from the
 *    headings). The PDF metadata is only Chromium's Title (from `<title>`), Creator,
 *    Producer and dates; there is no Author.
 * 3. Writes `cv-pdf.manifest.json` next to this file: the SHA-256 of the HTML rendered with
 *    `EMAIL_PLACEHOLDER` instead of the address (so the manifest reveals nothing) and the
 *    SHA-256 of the PDF. The privacy test regenerates and scans that HTML and checks both
 *    hashes: a consistency check that cv.ts, the template, the manifest and the committed
 *    PDF still belong together (it cannot prove how a given PDF was produced).
 *
 * The script runs anywhere, but the committed PDF must be generated on Windows, where it
 * was approved (the layout uses Calibri). CI never runs it.
 * The email address is assembled in memory only; it is never written to disk except inside
 * the PDF, as the visible mailto: link William approved.
 *
 * Node runs this file with `--experimental-strip-types`, hence the `.ts` import paths.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { chromium } from '@playwright/test';
import { cv } from '../../src/content/cv.ts';
import { emailFromParts } from '../../src/content/email.ts';
import { EMAIL_PLACEHOLDER, renderCvHtml } from './template.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PDF_PATH = join(ROOT, 'public', ...cv.identity.cvPath.split('/').filter(Boolean));
const MANIFEST_PATH = join(import.meta.dirname, 'cv-pdf.manifest.json');

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const email = emailFromParts(cv.identity.emailParts);

const browser = await chromium.launch();
try {
  // The CV is static HTML: no script may run while it is printed.
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.setContent(renderCvHtml(cv, email), { waitUntil: 'load' });
  mkdirSync(dirname(PDF_PATH), { recursive: true });
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: true,
  });

  const manifest = {
    pdf: relative(ROOT, PDF_PATH).split('\\').join('/'),
    pdfSha256: sha256(readFileSync(PDF_PATH)),
    htmlSha256: sha256(renderCvHtml(cv, EMAIL_PLACEHOLDER)),
    htmlEmailPlaceholder: EMAIL_PLACEHOLDER,
    chromium: browser.version(),
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${manifest.pdf} and scripts/cv/cv-pdf.manifest.json`);
} finally {
  await browser.close();
}
