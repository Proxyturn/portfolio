import { beforeAll, describe, expect, it } from 'vitest';
import { cv } from '../../content/cv';
import { renderWithLang } from '../../test/render';
import { setReducedMotion } from '../../test/setup';
import { en } from '../../i18n/en';
import { ptBR } from '../../i18n/pt-BR';
import { readSource } from '../../test/readSource';
import { TerminalStory } from './TerminalStory';

let fontsCss = '';
let terminalCss = '';
beforeAll(async () => {
  fontsCss = await readSource('./fonts.css', import.meta.url);
  terminalCss = await readSource('./terminal.css', import.meta.url);
});

/** Every `unicode-range` declared in fonts.css, as [from, to] code-point pairs. */
function declaredRanges(): { family: string; ranges: [number, number][] }[] {
  return [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => {
    const body = match[1] ?? '';
    const family = /font-family:\s*'([^']+)'/.exec(body)?.[1] ?? '';
    const list = /unicode-range:([^;]+);/.exec(body)?.[1] ?? '';
    const ranges = list.split(',').map((part): [number, number] => {
      const [from = '', to] = part.trim().replace(/^U\+/i, '').split('-');
      return [parseInt(from, 16), parseInt(to ?? from, 16)];
    });
    return { family, ranges };
  });
}

/** Every string leaf of an object tree. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('Terminal fonts', () => {
  it('self-hosts only the Latin, upright, weight-axis files of the two approved fonts', () => {
    const sources = [...fontsCss.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
    expect(sources).toEqual([
      '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
      '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2',
    ]);
    expect(declaredRanges().map((font) => font.family)).toEqual([
      'JetBrains Mono Variable',
      'IBM Plex Sans Variable',
    ]);
  });

  it('covers every character the story can show, in both languages', () => {
    setReducedMotion(true);
    const texts = [
      ...strings(cv),
      ...strings(en),
      ...strings(ptBR),
      ...[...terminalCss.matchAll(/content:\s*'([^']*)'/g)].map((m) => m[1] ?? ''),
    ];
    for (const lang of ['en', 'pt'] as const) {
      const { container, unmount } = renderWithLang(<TerminalStory />, lang);
      texts.push(container.textContent);
      unmount();
    }
    const used = new Set(Array.from(texts.join(''), (c) => c.codePointAt(0) ?? 0));
    used.delete(0x0a);

    const fonts = declaredRanges();
    expect(fonts).toHaveLength(2);
    for (const font of fonts) {
      expect(font.ranges.length).toBeGreaterThan(5);
      const missing = [...used]
        .filter((cp) => !font.ranges.some(([from, to]) => cp >= from && cp <= to))
        .map((cp) => `U+${cp.toString(16).toUpperCase()} ${String.fromCodePoint(cp)}`);
      expect(missing, font.family).toEqual([]);
    }
    // The arrow is drawn as SVG because the Latin subsets do not include it.
    expect(used.has(0x2192)).toBe(false);
  });
});
