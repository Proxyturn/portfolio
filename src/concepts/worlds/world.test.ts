import { describe, expect, it } from 'vitest';
import { cv } from '../../content/cv';
import { en } from '../../i18n/en';
import { ptBR } from '../../i18n/pt-BR';
import {
  BUILDINGS,
  buildingLabel,
  cameraFor,
  contrast,
  estimateTextWidth,
  labelLines,
  LANDSCAPE,
  linkGeometry,
  MAX_ZOOM,
  mixCamera,
  PALETTES,
  PORTRAIT,
  viewRect,
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

  it('splits a label in two lines whose text joins back to the label', () => {
    expect(labelLines('Computer Science · UniRitter', true)).toEqual([
      'Computer Science ·',
      ' UniRitter',
    ]);
    expect(labelLines('Computer Science · UniRitter', true).join('')).toBe(
      'Computer Science · UniRitter',
    );
    expect(labelLines('SEMANTIX', true)).toEqual(['SEMANTIX']);
    expect(labelLines('ATOS · CPFL', false)).toEqual(['ATOS · CPFL']);
  });
});

describe('arrangements', () => {
  for (const arrangement of [LANDSCAPE, PORTRAIT]) {
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
    });
  }

  it('builds the portrait bands top to bottom in story order', () => {
    const ys = BUILDINGS.map((b) => PORTRAIT.places[b.id].y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(PORTRAIT.height).toBeGreaterThan(PORTRAIT.width);
  });

  it('sizes the chip to the text, and the target around building and chip', () => {
    const below = linkGeometry(LANDSCAPE, 'bank', 1, 100);
    expect(below.chip.w).toBe(120);
    expect(below.chip.x).toBe(-60);
    expect(below.hit.x).toBeLessThanOrEqual(below.chip.x);
    expect(below.hit.y + below.hit.h).toBeGreaterThan(below.chip.y + below.chip.h);
    const right = linkGeometry(PORTRAIT, 'bank', 2, 200);
    expect(right.chip.x).toBeGreaterThan(0);
    expect(right.hit.x + right.hit.w).toBeGreaterThan(right.chip.x + right.chip.w);
    expect(right.chip.h).toBeGreaterThan(linkGeometry(PORTRAIT, 'bank', 1, 200).chip.h);
    expect(estimateTextWidth('abcd', 20)).toBe(48);
  });
});

describe('camera maths', () => {
  it('shows the whole world at zoom 1 with no offset', () => {
    expect(cameraFor(viewRect('hook'), 768, 661)).toEqual({ x: 0, y: 0, scale: 1 });
    expect(viewRect('toolbox')).toEqual({ x: 0, y: 0, w: 1200, h: 800 });
    expect(cameraFor(viewRect('origins'), 0, 0)).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('zooms into a district without passing MAX_ZOOM, keeping the world on the stage', () => {
    for (const chapter of ['origins', 'enterprise', 'energy', 'breadth', 'now', 'next'] as const) {
      const cam = cameraFor(viewRect(chapter), 768, 661);
      expect(cam.scale, chapter).toBeGreaterThan(1);
      expect(cam.scale, chapter).toBeLessThanOrEqual(MAX_ZOOM);
      expect(cam.x).toBeLessThanOrEqual(0);
      expect(cam.x).toBeGreaterThanOrEqual(768 * (1 - cam.scale));
      expect(cam.y).toBeLessThanOrEqual(0);
      expect(cam.y).toBeGreaterThanOrEqual(661 * (1 - cam.scale));
    }
    // The enterprise viewpoint covers both the bank and the plaza.
    expect(viewRect('enterprise')).toEqual({ x: 920, y: 20, w: 264, h: 504 });
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
