import { beforeAll, describe, expect, it } from 'vitest';
import { CHIP_CMD, isoMonth, LINK_CMD } from './code';
import { readSource } from './readSource';

let css = '';
beforeAll(async () => {
  css = await readSource('./terminal.css');
});

/** The `content` value set by a rule whose selector list ends with `selector`. */
function contentOf(selector: string): string | undefined {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  return rules.map((rule) => /content:\s*'([^']*)'/.exec(rule[1] ?? '')?.[1]).find(Boolean);
}

describe('Terminal code', () => {
  it('writes dates as YYYY-MM, the same in both languages', () => {
    expect(isoMonth({ year: 2019, month: 10 })).toBe('2019-10');
    expect(isoMonth({ year: 2022, month: 6 })).toBe('2022-06');
  });

  it('keeps the commands added in CSS identical to code.ts', () => {
    expect(contentOf('.terminal .skills__chip::before')).toBe(`${CHIP_CMD} `);
    expect(contentOf('.term-contact__cv .button::before')).toBe(`${LINK_CMD.cv} · `);
    expect(contentOf('.term-contact__email .button::before')).toBe(`${LINK_CMD.email} · `);
  });
});
