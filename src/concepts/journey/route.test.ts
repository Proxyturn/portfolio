import { describe, expect, it } from 'vitest';
import { cv } from '../../content/cv';
import { contour, routeStops, sideOf, stopLabel } from './route';

describe('routeStops', () => {
  it('visits every job once, in beat order and oldest first within a beat', () => {
    expect(routeStops().map((job) => job.id)).toEqual([
      'novus',
      'atos-bradesco',
      'atos-frontend',
      'atos-cpfl',
      'atos-cemig-cpfl',
      'atos-sodexo',
      'atos-alphaville',
      'semantix',
    ]);
    expect(new Set(routeStops().map((job) => job.id))).toEqual(
      new Set(cv.jobs.map((job) => job.id)),
    );
  });
});

describe('sideOf and stopLabel', () => {
  it('alternates lanes', () => {
    expect([0, 1, 2, 3].map(sideOf)).toEqual(['left', 'right', 'left', 'right']);
  });

  it('labels ATOS stops by employer and client, others by company', () => {
    expect(stopLabel({ company: 'ATOS', project: 'Bradesco' })).toBe('ATOS · Bradesco');
    expect(stopLabel({ company: 'ATOS' })).toBe('ATOS');
    expect(stopLabel({ company: 'SEMANTIX', project: 'VCIMENTOS / VPAR, CBA, Votorantim' })).toBe(
      'SEMANTIX',
    );
  });
});

describe('contour', () => {
  it('is a closed path made of 8 curves, the same every time', () => {
    const d = contour(100, 100, 50, 2);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(8);
    expect(contour(100, 100, 50, 2)).toBe(d);
    expect(contour(100, 100, 50, 3)).not.toBe(d);
  });
});
