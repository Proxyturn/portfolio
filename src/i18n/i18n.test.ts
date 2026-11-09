import { describe, expect, it } from 'vitest';
import { en } from './en';
import { format } from './format';
import { detectLang, readStoredLang, STORAGE_KEY, storeLang } from './language';
import { ptBR } from './pt-BR';

type Tree = { readonly [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of leaves(value, path)) out.set(k, v);
  }
  return out;
}

describe('i18n dictionaries', () => {
  const enLeaves = leaves(en);
  const ptLeaves = leaves(ptBR);

  it('has every EN key in PT-BR and vice versa', () => {
    expect([...ptLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of [...enLeaves, ...ptLeaves]) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('uses the same placeholders in both languages', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, value] of enLeaves) {
      expect(placeholders(ptLeaves.get(key) ?? ''), key).toEqual(placeholders(value));
    }
  });
});

describe('format', () => {
  it('fills known placeholders and keeps unknown ones visible', () => {
    expect(format('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });
});

describe('language detection and storage', () => {
  it('detects Portuguese browsers', () => {
    expect(detectLang(['pt-BR', 'en'])).toBe('pt');
    expect(detectLang(['PT'])).toBe('pt');
    expect(detectLang(['en-US'])).toBe('en');
    expect(detectLang(['es'])).toBe('en');
    expect(detectLang([])).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });

  it('reads and writes the stored choice, ignoring junk', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    expect(readStoredLang(storage)).toBeNull();
    storeLang(storage, 'pt');
    expect(store.get(STORAGE_KEY)).toBe('pt');
    expect(readStoredLang(storage)).toBe('pt');
    store.set(STORAGE_KEY, 'fr');
    expect(readStoredLang(storage)).toBeNull();
  });

  it('survives storage that throws (private mode)', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readStoredLang(broken)).toBeNull();
    expect(() => {
      storeLang(broken, 'en');
    }).not.toThrow();
    expect(readStoredLang(undefined)).toBeNull();
  });
});
