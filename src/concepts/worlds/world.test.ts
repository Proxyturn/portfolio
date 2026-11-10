import { describe, expect, it } from 'vitest';
import { cv } from '../../content/cv';
import { en } from '../../i18n/en';
import { ptBR } from '../../i18n/pt-BR';
import {
  ARRANGEMENTS,
  BANDS,
  BUILDINGS,
  buildingLabel,
  buildingsForJobs,
  cameraFor,
  contrast,
  DRAWING_HALF_WIDTH,
  estimateTextWidth,
  labelLines,
  linkGeometry,
  MAX_ZOOM,
  mixCamera,
  PALETTES,
  PORTRAIT,
  estimateSignWidth,
  signLayout,
  SQUARE,
  viewRect,
  WIDE,
  type DistrictId,
} from './world';

describe('the map links table', () => {
  it('has twelve links in story order with the storyboard targets and labels', () => {
    expect(BUILDINGS.map((b) => [b.href, buildingLabel(b, 'en', en)])).toEqual([
      ['#job-novus', 'Novus Automação'],
      ['#edu-computer-science', 'Computer Science · UniRitter'],
      ['#job-atos-bradesco', 'ATOS · Bradesco'],
      ['#job-atos-frontend', 'Between worlds · ATOS'],
      ['#job-atos-cpfl', 'ATOS · CPFL'],
      ['#job-atos-cemig-cpfl', 'ATOS · CEMIG / CPFL'],
      ['#job-atos-sodexo', 'ATOS · Sodexo'],
      ['#job-atos-alphaville', 'ATOS · Alphaville'],
      ['#job-semantix', 'SEMANTIX'],
      ['#next', 'AI frontier'],
      ['#toolbox', 'Workshop'],
      ['#contact', 'Post office'],
    ]);
    expect(BUILDINGS.map((b) => buildingLabel(b, 'pt', ptBR)).slice(1, 4)).toEqual([
      'Ciência da Computação · UniRitter',
      'ATOS · Bradesco',
      'Entre mundos · ATOS',
    ]);
  });

  it('links every job in the CV exactly once', () => {
    const jobs = BUILDINGS.filter((b) => b.href.startsWith('#job-')).map((b) => b.href.slice(5));
    expect([...jobs].sort()).toEqual(cv.jobs.map((j) => j.id).sort());
  });

  it('throws on an unknown job', () => {
    expect(() =>
      buildingLabel(
        { id: 'bank', href: '#x', district: 'banking', label: { kind: 'company', job: 'nope' } },
        'en',
        en,
      ),
    ).toThrow(/Unknown job/);
  });

  it('wraps a label into lines that join back to exactly the label', () => {
    const cases: [string, number, string[]][] = [
      ['SEMANTIX', 12, ['SEMANTIX']],
      ['ATOS · CEMIG / CPFL', 12, ['ATOS ·', ' CEMIG / CPFL']],
      ['Computer Science · UniRitter', 22, ['Computer Science ·', ' UniRitter']],
      ['Computer Science · UniRitter', 12, ['Computer', ' Science ·', ' UniRitter']],
      ['Ciência da Computação · UniRitter', 12, ['Ciência da', ' Computação ·', ' UniRitter']],
      ['Entre mundos · ATOS', 12, ['Entre', ' mundos ·', ' ATOS']],
      ['Novus Automação', 12, ['Novus', ' Automação']],
    ];
    for (const [label, max, lines] of cases) {
      expect(labelLines(label, max), label).toEqual(lines);
      expect(labelLines(label, max).join('')).toBe(label);
    }
  });

  it('keeps every label line within its arrangement, in both languages', () => {
    for (const arrangement of [SQUARE, WIDE, PORTRAIT]) {
      for (const [lang, dict] of [
        ['en', en],
        ['pt', ptBR],
      ] as const) {
        for (const building of BUILDINGS) {
          const lines = labelLines(buildingLabel(building, lang, dict), arrangement.maxChars);
          expect(lines.length, building.id).toBeLessThanOrEqual(3);
          for (const line of lines) {
            expect(line.trim().length, `${arrangement.id} ${line}`).toBeLessThanOrEqual(
              arrangement.maxChars,
            );
          }
        }
      }
    }
  });
});

describe('arrangements', () => {
  for (const arrangement of [SQUARE, WIDE, PORTRAIT]) {
    it(`places every building inside a ground of its district (${arrangement.id})`, () => {
      for (const building of BUILDINGS) {
        const spot = arrangement.places[building.id];
        const ground = arrangement.grounds.find(
          (g) =>
            spot.x >= g.rect.x &&
            spot.x <= g.rect.x + g.rect.w &&
            spot.y >= g.rect.y &&
            spot.y <= g.rect.y + g.rect.h,
        );
        expect(ground?.district, building.id).toBe(building.district);
      }
      expect(arrangement.road).toMatch(/^M/);
      expect(ARRANGEMENTS[arrangement.id]).toBe(arrangement);
    });
  }

  it('keeps every drawing footprint inside its ground (landscape arrangements)', () => {
    for (const arrangement of [SQUARE, WIDE]) {
      for (const ground of arrangement.grounds) {
        for (const id of BANDS[ground.id].buildings) {
          const half = DRAWING_HALF_WIDTH[id];
          const x = arrangement.places[id].x;
          expect(x - half, id).toBeGreaterThanOrEqual(ground.rect.x);
          expect(x + half, id).toBeLessThanOrEqual(ground.rect.x + ground.rect.w);
        }
      }
    }
  });

  it('builds the portrait bands top to bottom in story order', () => {
    const ys = BUILDINGS.map((b) => PORTRAIT.places[b.id].y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(PORTRAIT.height).toBeGreaterThan(PORTRAIT.width);
  });

  /**
   * The 12 px floor (William, 2026-11-10), from the geometry alone: the whole world drawn in
   * the smallest stage each gate allows. The E2E suite measures the real pages.
   */
  it('keeps whole-world labels and signs at 12 px or more at the edge of each gate', () => {
    const header = 70;
    const k = (a: typeof SQUARE, w: number, h: number) => Math.min(w / a.width, h / a.height);
    for (const [a, w, h] of [
      [SQUARE, 1024 * 0.6, 600 - header],
      [WIDE, 768, 760 * 0.4],
      // The wide overview at 820 px (gutters 2 × 4vw).
      [WIDE, 820 - 2 * 32.8, Infinity],
      // Portrait at 320 px (gutters 2 × 16 px).
      [PORTRAIT, 320 - 32, Infinity],
    ] as const) {
      expect(a.fontSize * k(a, w, h), a.id).toBeGreaterThanOrEqual(12);
      expect(a.signSize * k(a, w, h), `${a.id} sign`).toBeGreaterThanOrEqual(12);
    }
  });

  it('draws each landscape snake in story order, with the arrival last', () => {
    const story = [
      'industrial',
      'banking',
      'between',
      'energy',
      'corporate',
      'cement',
      'ai',
      'arrival',
    ];
    for (const arrangement of [SQUARE, WIDE]) {
      const rows = [...new Set(arrangement.grounds.map((g) => g.rect.y))].sort((a, b) => a - b);
      const read = rows.flatMap((y, r) => {
        const row = arrangement.grounds
          .filter((g) => g.rect.y === y)
          .sort((a, b) => a.rect.x - b.rect.x)
          .map((g) => g.id);
        return r % 2 === 0 ? row : row.reverse();
      });
      expect(read, arrangement.id).toEqual(story);
      // The road starts top left and ends beside the last row, at the end it is read from.
      expect(arrangement.road, arrangement.id).toMatch(/^M8 8V/);
      expect(arrangement.road.endsWith(`V${arrangement.height - 8}`)).toBe(true);
    }
  });

  it('sizes the chip to the text, and the target around building and chip', () => {
    const below = linkGeometry(SQUARE, 'bank', 1, 100);
    expect(below.chip.w).toBe(120);
    expect(below.chip.x).toBe(-60);
    expect(below.hit.x).toBeLessThanOrEqual(below.chip.x);
    expect(below.hit.y + below.hit.h).toBeGreaterThan(below.chip.y + below.chip.h);
    expect(below.halo.w).toBeGreaterThan(2 * DRAWING_HALF_WIDTH.bank);
    const right = linkGeometry(PORTRAIT, 'bank', 2, 200);
    expect(right.chip.x).toBeGreaterThan(0);
    expect(right.hit.x + right.hit.w).toBeGreaterThan(right.chip.x + right.chip.w);
    expect(right.chip.h).toBeGreaterThan(linkGeometry(PORTRAIT, 'bank', 1, 200).chip.h);
    expect(estimateTextWidth('abcd', 20)).toBe(48);
  });

  it('shows a sign only where it fits on one line, beside the decor or alone', () => {
    const ground = (a: typeof SQUARE, id: string) => {
      const g = a.grounds.find((x) => x.id === id);
      if (!g) throw new Error(id);
      return g;
    };
    // Wide grounds: sign and decor.
    expect(signLayout(ground(SQUARE, 'energy'), en.worlds.districts.energy, SQUARE)).toEqual({
      sign: true,
      decor: true,
    });
    // The long cement sign doesn't fit the landscape maps: left off (the chapter keeps it).
    expect(signLayout(ground(SQUARE, 'cement'), en.worlds.districts.cement, SQUARE).sign).toBe(
      false,
    );
    expect(signLayout(ground(WIDE, 'cement'), ptBR.worlds.districts.cement, WIDE).sign).toBe(false);
    // The redundant narrow ones go first.
    expect(signLayout(ground(SQUARE, 'ai'), en.worlds.districts.ai, SQUARE).sign).toBe(false);
    expect(signLayout(ground(WIDE, 'between'), en.worlds.districts.betweenWorlds, WIDE).sign).toBe(
      false,
    );
    // No sign: the decor stays (the arrival ground has no sign at all).
    expect(signLayout(ground(SQUARE, 'arrival'), null, SQUARE)).toEqual({
      sign: false,
      decor: true,
    });
    // A sign that fits only without the decor drops the decor.
    const g = ground(SQUARE, 'banking');
    const alone = 'x'.repeat(Math.floor((g.rect.w - 28) / (SQUARE.signSize * 0.63)));
    expect(estimateSignWidth(alone, SQUARE.signSize)).toBeLessThanOrEqual(g.rect.w - 28);
    expect(signLayout(g, alone, SQUARE)).toEqual({ sign: true, decor: false });
    // Portrait has room for every sign but the long PT cement one.
    for (const [lang, dict] of [
      ['en', en],
      ['pt', ptBR],
    ] as const) {
      for (const pg of PORTRAIT.grounds) {
        if (!pg.sign) continue;
        const shown = signLayout(pg, dict.worlds.districts[pg.sign], PORTRAIT).sign;
        expect(shown, `${lang} ${pg.id}`).toBe(!(lang === 'pt' && pg.id === 'cement'));
      }
    }
  });

  it("maps a skill's jobs to their buildings", () => {
    expect(buildingsForJobs(['atos-cpfl', 'novus', 'nope'])).toEqual(['factory', 'plant']);
  });
});

describe('camera maths', () => {
  it('shows the whole world at zoom 1 with no offset', () => {
    expect(cameraFor(viewRect('hook', SQUARE), 768, 661, SQUARE)).toEqual({
      x: 0,
      y: 0,
      scale: 1,
    });
    expect(viewRect('toolbox', WIDE)).toEqual({ x: 0, y: 0, w: WIDE.width, h: WIDE.height });
    expect(cameraFor(viewRect('origins', SQUARE), 0, 0, SQUARE)).toEqual({
      x: 0,
      y: 0,
      scale: 1,
    });
  });

  it('zooms into a district without passing MAX_ZOOM, keeping the world on the stage', () => {
    for (const [arrangement, w, h] of [
      [SQUARE, 768, 661],
      [WIDE, 820, 472],
    ] as const) {
      for (const chapter of [
        'origins',
        'enterprise',
        'energy',
        'breadth',
        'now',
        'next',
      ] as const) {
        const cam = cameraFor(viewRect(chapter, arrangement), w, h, arrangement);
        expect(cam.scale, chapter).toBeGreaterThan(1);
        expect(cam.scale, chapter).toBeLessThanOrEqual(MAX_ZOOM);
        expect(cam.x).toBeLessThanOrEqual(0);
        expect(cam.x).toBeGreaterThanOrEqual(w * (1 - cam.scale));
        expect(cam.y).toBeLessThanOrEqual(0);
        expect(cam.y).toBeGreaterThanOrEqual(h * (1 - cam.scale));
      }
    }
    // The enterprise viewpoint covers both the bank and the plaza.
    const bank = SQUARE.grounds.find((g) => g.id === 'banking');
    const plaza = SQUARE.grounds.find((g) => g.id === 'between');
    const view = viewRect('enterprise', SQUARE);
    expect(view.x).toBe(bank?.rect.x);
    expect(view.x + view.w).toBe((plaza?.rect.x ?? 0) + (plaza?.rect.w ?? 0));
  });

  it('blends two viewpoints, zoom geometrically', () => {
    const a = { x: 0, y: 0, scale: 1 };
    const b = { x: -100, y: -50, scale: 4 };
    expect(mixCamera(a, b, 0.5)).toEqual({ x: -50, y: -25, scale: 2 });
    expect(mixCamera(a, b, -1)).toEqual(a);
    expect(mixCamera(a, b, 2)).toEqual(b);
  });
});

describe('palettes', () => {
  const districts = Object.keys(PALETTES) as DistrictId[];

  it('keep chip text ≥ 4.5:1 and the focus ring ≥ 3:1 on every ground', () => {
    for (const id of districts) {
      const p = PALETTES[id];
      expect(contrast(p.text, p.surface), id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.muted, p.surface), id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.muted, p.bg), id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, p.bg), id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, p.surface), id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, p.bg), `${id} ring`).toBeGreaterThanOrEqual(3);
    }
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('keep text on accent-filled buttons ≥ 4.5:1', () => {
    for (const id of districts) {
      expect(contrast(PALETTES[id].accent, PALETTES[id].accentContrast), id).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});
