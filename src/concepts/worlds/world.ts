/**
 * The Worlds map as data (docs/STORYBOARDS.md, section 3): the twelve building links in story
 * order, the district palettes, and two arrangements of the same districts:
 *
 * - `landscape`: the sticky stage (≥ 768 px wide and ≥ 600 px tall), moved by the camera.
 * - `portrait`: the overview at the top of the page everywhere else. A taller, single-column
 *   arrangement, because the wide map would make labels and targets too small at 320 px.
 *
 * Coordinates are SVG user units. Each building is placed by its anchor: the middle of its
 * ground line. Everything inside a building is drawn relative to that anchor.
 */
import { cv } from '../../content/cv';
import { jobTitle } from '../../content/selectors';
import type { ChapterId, Lang } from '../../content/types';
import type { Dictionary } from '../../i18n/types';

/** One row of the 3b palette table each (see the v2 mapping in the storyboard). */
export type DistrictId =
  'neutral' | 'industrial' | 'banking' | 'between' | 'energy' | 'corporate' | 'cement' | 'ai';

export interface Palette {
  readonly bg: string;
  readonly surface: string;
  readonly text: string;
  readonly muted: string;
  readonly accent: string;
  /** Text on accent-filled buttons. */
  readonly accentContrast: string;
}

/** Mirrors the `.wd-*` classes in worlds.css (the E2E suite checks they stay in sync). */
export const PALETTES: Readonly<Record<DistrictId, Palette>> = {
  neutral: {
    bg: '#F5F3EF',
    surface: '#FFFFFF',
    text: '#1D1F24',
    muted: '#4F535B',
    accent: '#2E54A3',
    accentContrast: '#FFFFFF',
  },
  industrial: {
    bg: '#2F353B',
    surface: '#3A4148',
    text: '#EEF0F2',
    muted: '#C3C9CF',
    accent: '#F2C230',
    accentContrast: '#2F353B',
  },
  banking: {
    bg: '#0E2747',
    surface: '#15325A',
    text: '#F1F3F7',
    muted: '#C2CBDA',
    accent: '#D9B95E',
    accentContrast: '#0E2747',
  },
  between: {
    bg: '#1B1E24',
    surface: '#252931',
    text: '#E6E8EC',
    muted: '#B6BBC4',
    accent: '#9DB4D6',
    accentContrast: '#1B1E24',
  },
  energy: {
    bg: '#0B1D3A',
    surface: '#12284D',
    text: '#EAF6F4',
    muted: '#B7C9D6',
    accent: '#3FE0C5',
    accentContrast: '#0B1D3A',
  },
  corporate: {
    bg: '#F3EFE7',
    surface: '#FFFFFF',
    text: '#24211C',
    muted: '#57514A',
    accent: '#A63B25',
    accentContrast: '#FFFFFF',
  },
  cement: {
    bg: '#D9D4CC',
    surface: '#ECE8E2',
    text: '#1F1D1A',
    muted: '#47433D',
    accent: '#843F08',
    accentContrast: '#FFFFFF',
  },
  ai: {
    bg: '#120B24',
    surface: '#1C1336',
    text: '#EEE9FB',
    muted: '#C4B8E6',
    accent: '#B9A3FF',
    accentContrast: '#120B24',
  },
};

/** The map's open land between districts (decorative). */
export const LAND = '#E4DED2';

export type BuildingId =
  | 'factory'
  | 'university'
  | 'bank'
  | 'plaza'
  | 'plant'
  | 'substation'
  | 'officeLeft'
  | 'officeRight'
  | 'cementYard'
  | 'observatory'
  | 'workshop'
  | 'postOffice';

type DistrictName = keyof Dictionary['worlds']['districts'];
type MapLabel = keyof Dictionary['worlds']['mapLabels'];

/** Where a building's visible label (= its accessible name) comes from. */
export type LabelSource =
  | { readonly kind: 'jobTitle'; readonly job: string }
  | { readonly kind: 'company'; readonly job: string }
  | { readonly kind: 'mapLabel'; readonly key: MapLabel }
  | { readonly kind: 'district'; readonly key: DistrictName };

export interface Building {
  readonly id: BuildingId;
  readonly href: string;
  readonly district: DistrictId;
  readonly label: LabelSource;
}

/** The storyboard's links table, in story order. */
export const BUILDINGS: readonly Building[] = [
  {
    id: 'factory',
    href: '#job-novus',
    district: 'industrial',
    label: { kind: 'company', job: 'novus' },
  },
  {
    id: 'university',
    href: '#edu-computer-science',
    district: 'industrial',
    label: { kind: 'mapLabel', key: 'computerScience' },
  },
  {
    id: 'bank',
    href: '#job-atos-bradesco',
    district: 'banking',
    label: { kind: 'jobTitle', job: 'atos-bradesco' },
  },
  {
    id: 'plaza',
    href: '#job-atos-frontend',
    district: 'between',
    label: { kind: 'mapLabel', key: 'betweenWorldsAtos' },
  },
  {
    id: 'plant',
    href: '#job-atos-cpfl',
    district: 'energy',
    label: { kind: 'jobTitle', job: 'atos-cpfl' },
  },
  {
    id: 'substation',
    href: '#job-atos-cemig-cpfl',
    district: 'energy',
    label: { kind: 'jobTitle', job: 'atos-cemig-cpfl' },
  },
  {
    id: 'officeLeft',
    href: '#job-atos-sodexo',
    district: 'corporate',
    label: { kind: 'jobTitle', job: 'atos-sodexo' },
  },
  {
    id: 'officeRight',
    href: '#job-atos-alphaville',
    district: 'corporate',
    label: { kind: 'jobTitle', job: 'atos-alphaville' },
  },
  {
    id: 'cementYard',
    href: '#job-semantix',
    district: 'cement',
    label: { kind: 'company', job: 'semantix' },
  },
  { id: 'observatory', href: '#next', district: 'ai', label: { kind: 'district', key: 'ai' } },
  {
    id: 'workshop',
    href: '#toolbox',
    district: 'neutral',
    label: { kind: 'district', key: 'workshop' },
  },
  {
    id: 'postOffice',
    href: '#contact',
    district: 'neutral',
    label: { kind: 'district', key: 'postOffice' },
  },
];

/** The visible label of a building, which is also its link's accessible name. */
export function buildingLabel(building: Building, lang: Lang, dict: Dictionary): string {
  const source = building.label;
  switch (source.kind) {
    case 'mapLabel':
      return dict.worlds.mapLabels[source.key];
    case 'district':
      return dict.worlds.districts[source.key];
    default: {
      const job = cv.jobs.find((j) => j.id === source.job);
      if (!job) throw new Error(`Unknown job ${source.job}`);
      return source.kind === 'company' ? job.company : jobTitle(job, lang);
    }
  }
}

/** Splits a long label at its " · " into two lines whose text still joins to the label. */
export function labelLines(label: string, wrap: boolean): string[] {
  const at = label.indexOf(' · ');
  if (!wrap || at < 0) return [label];
  return [label.slice(0, at + 2), label.slice(at + 2)];
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type GroundId =
  'arrival' | 'industrial' | 'banking' | 'between' | 'energy' | 'corporate' | 'cement' | 'ai';

export interface Ground {
  readonly id: GroundId;
  readonly district: DistrictId;
  /** Decorative sign (aria-hidden); the arrival ground has none. */
  readonly sign: DistrictName | null;
  readonly rect: Rect;
}

export interface Placement {
  readonly x: number;
  readonly y: number;
  /** Two-line label. */
  readonly wrap: boolean;
}

export interface Arrangement {
  readonly id: 'landscape' | 'portrait';
  readonly width: number;
  readonly height: number;
  /** Label chip below the building, or to its right. */
  readonly labelAt: 'below' | 'right';
  readonly fontSize: number;
  readonly signSize: number;
  readonly drawingScale: number;
  readonly grounds: readonly Ground[];
  readonly places: Readonly<Record<BuildingId, Placement>>;
  readonly road: string;
}

const place = (x: number, y: number, wrap = false): Placement => ({ x, y, wrap });

/** Rows: grounds at y 20, 288 and 556 (236 tall); ground lines 150 below each top. */
export const LANDSCAPE: Arrangement = {
  id: 'landscape',
  width: 1200,
  height: 800,
  labelAt: 'below',
  fontSize: 20,
  signSize: 15,
  drawingScale: 1,
  grounds: [
    { id: 'arrival', district: 'neutral', sign: null, rect: { x: 16, y: 20, w: 314, h: 236 } },
    {
      id: 'industrial',
      district: 'industrial',
      sign: 'industrial',
      rect: { x: 345, y: 20, w: 560, h: 236 },
    },
    {
      id: 'banking',
      district: 'banking',
      sign: 'banking',
      rect: { x: 920, y: 20, w: 264, h: 236 },
    },
    {
      id: 'between',
      district: 'between',
      sign: 'betweenWorlds',
      rect: { x: 930, y: 288, w: 254, h: 236 },
    },
    { id: 'energy', district: 'energy', sign: 'energy', rect: { x: 450, y: 288, w: 465, h: 236 } },
    {
      id: 'corporate',
      district: 'corporate',
      sign: 'corporate',
      rect: { x: 16, y: 288, w: 419, h: 236 },
    },
    { id: 'cement', district: 'cement', sign: 'cement', rect: { x: 16, y: 556, w: 624, h: 236 } },
    { id: 'ai', district: 'ai', sign: 'ai', rect: { x: 860, y: 556, w: 324, h: 236 } },
  ],
  places: {
    workshop: place(95, 170),
    postOffice: place(250, 170),
    factory: place(470, 170),
    university: place(755, 170, true),
    bank: place(1052, 170),
    plaza: place(1057, 438),
    plant: place(565, 438),
    substation: place(785, 438),
    officeLeft: place(125, 438),
    officeRight: place(315, 438),
    cementYard: place(300, 706),
    observatory: place(1022, 706),
  },
  road: 'M16 272H1192V540H750V706H860',
};

/** Portrait bands, top to bottom in story order. */
const PORTRAIT_BANDS: readonly {
  ground: Ground['id'];
  district: DistrictId;
  sign: DistrictName | null;
  buildings: BuildingId[];
}[] = [
  {
    ground: 'industrial',
    district: 'industrial',
    sign: 'industrial',
    buildings: ['factory', 'university'],
  },
  { ground: 'banking', district: 'banking', sign: 'banking', buildings: ['bank'] },
  { ground: 'between', district: 'between', sign: 'betweenWorlds', buildings: ['plaza'] },
  { ground: 'energy', district: 'energy', sign: 'energy', buildings: ['plant', 'substation'] },
  {
    ground: 'corporate',
    district: 'corporate',
    sign: 'corporate',
    buildings: ['officeLeft', 'officeRight'],
  },
  { ground: 'cement', district: 'cement', sign: 'cement', buildings: ['cementYard'] },
  { ground: 'ai', district: 'ai', sign: 'ai', buildings: ['observatory'] },
  { ground: 'arrival', district: 'neutral', sign: null, buildings: ['workshop', 'postOffice'] },
];

const P = {
  width: 600,
  top: 12,
  header: 40,
  noHeader: 6,
  row: 100,
  pad: 6,
  gap: 14,
  x: 100,
  ground: 82,
};

function buildPortrait(): Arrangement {
  const grounds: Ground[] = [];
  const places: Partial<Record<BuildingId, Placement>> = {};
  let y = P.top;
  for (const band of PORTRAIT_BANDS) {
    const header = band.sign ? P.header : P.noHeader;
    const h = header + band.buildings.length * P.row + P.pad;
    grounds.push({
      id: band.ground,
      district: band.district,
      sign: band.sign,
      rect: { x: 12, y, w: P.width - 24, h },
    });
    band.buildings.forEach((id, i) => {
      places[id] = place(P.x, y + header + i * P.row + P.ground, id === 'university');
    });
    y += h + P.gap;
  }
  return {
    id: 'portrait',
    width: P.width,
    height: y - P.gap + P.top,
    labelAt: 'right',
    fontSize: 28,
    signSize: 20,
    drawingScale: 0.6,
    grounds,
    places: places as Record<BuildingId, Placement>,
    road: `M${P.x} ${P.top}V${y - P.gap}`,
  };
}

export const PORTRAIT: Arrangement = buildPortrait();

/** Horizontal half-width of each placeholder drawing at scale 1 (they are 110 units tall). */
export const DRAWING_HALF_WIDTH: Readonly<Record<BuildingId, number>> = {
  factory: 70,
  university: 62,
  bank: 60,
  plaza: 50,
  plant: 66,
  substation: 60,
  officeLeft: 44,
  officeRight: 44,
  cementYard: 130,
  observatory: 58,
  workshop: 56,
  postOffice: 56,
};
export const DRAWING_HEIGHT = 110;

/** Label chip and link target geometry, relative to the building's anchor. */
export interface LinkGeometry {
  readonly chip: Rect;
  readonly hit: Rect;
  /** Text x (middle) and the first baseline. */
  readonly textX: number;
  readonly textY: number;
  readonly lineHeight: number;
}

export const CHIP_PAD_X = 10;

export function linkGeometry(
  arrangement: Arrangement,
  building: BuildingId,
  lines: number,
  textWidth: number,
): LinkGeometry {
  const font = arrangement.fontSize;
  const lineHeight = Math.round(font * 1.2);
  const padY = Math.round(font * 0.35);
  const chipW = Math.ceil(textWidth) + 2 * CHIP_PAD_X;
  const chipH = lines * lineHeight + 2 * padY;
  const half = DRAWING_HALF_WIDTH[building] * arrangement.drawingScale;
  const top = DRAWING_HEIGHT * arrangement.drawingScale;
  if (arrangement.labelAt === 'below') {
    const chip = { x: -chipW / 2, y: 12, w: chipW, h: chipH };
    const left = Math.min(-half, chip.x) - 6;
    const right = Math.max(half, chip.x + chipW) + 6;
    const hit = { x: left, y: -top - 14, w: right - left, h: top + 14 + chip.y + chipH + 6 };
    return { chip, hit, textX: 0, textY: chip.y + padY + font * 0.8, lineHeight };
  }
  const rowTop = -P.ground;
  const chip = { x: half + 20, y: rowTop + (P.row - chipH) / 2, w: chipW, h: chipH };
  const hit = { x: -half - 6, y: rowTop + 3, w: chip.x + chipW + 8 + half + 6, h: P.row - 6 };
  return { chip, hit, textX: chip.x + chipW / 2, textY: chip.y + padY + font * 0.8, lineHeight };
}

/** Rough text width before the browser can measure it (and in jsdom). */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

/** Camera viewpoint for each chapter: the whole world, or the union of some grounds. */
export const CHAPTER_VIEW: Readonly<Record<ChapterId, 'world' | readonly GroundId[]>> = {
  hook: 'world',
  origins: ['industrial'],
  enterprise: ['banking', 'between'],
  energy: ['energy'],
  breadth: ['corporate'],
  now: ['cement'],
  next: ['ai'],
  toolbox: 'world',
  contact: ['arrival'],
};

/** The area a chapter's viewpoint must show, in landscape units. */
export function viewRect(chapter: ChapterId, arrangement: Arrangement = LANDSCAPE): Rect {
  const view = CHAPTER_VIEW[chapter];
  if (view === 'world') return { x: 0, y: 0, w: arrangement.width, h: arrangement.height };
  const rects = arrangement.grounds.filter((g) => view.includes(g.id)).map((g) => g.rect);
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

export const MAX_ZOOM = 2;

export interface CameraTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/**
 * The camera wrapper's transform (origin top left) that centres `rect` in a stage of
 * `stageW` × `stageH` px, where the SVG is drawn with `xMidYMid meet`. Zoom stays between 1
 * (the whole world) and MAX_ZOOM, and the world always covers the stage.
 */
export function cameraFor(
  rect: Rect,
  stageW: number,
  stageH: number,
  arrangement: Arrangement = LANDSCAPE,
): CameraTransform {
  if (stageW <= 0 || stageH <= 0) return { x: 0, y: 0, scale: 1 };
  const k = Math.min(stageW / arrangement.width, stageH / arrangement.height);
  const ox = (stageW - arrangement.width * k) / 2;
  const oy = (stageH - arrangement.height * k) / 2;
  const pad = 16;
  const fit = Math.min(stageW / ((rect.w + 2 * pad) * k), stageH / ((rect.h + 2 * pad) * k));
  const scale = Math.min(MAX_ZOOM, Math.max(1, fit));
  const cx = ox + (rect.x + rect.w / 2) * k;
  const cy = oy + (rect.y + rect.h / 2) * k;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return {
    x: clamp(stageW / 2 - scale * cx, stageW * (1 - scale)),
    y: clamp(stageH / 2 - scale * cy, stageH * (1 - scale)),
    scale,
  };
}

/** Linear blend of two camera transforms (zoom blended geometrically). */
export function mixCamera(a: CameraTransform, b: CameraTransform, t: number): CameraTransform {
  const p = Math.min(1, Math.max(0, t));
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    scale: a.scale * Math.pow(b.scale / a.scale, p),
  };
}

/** WCAG 2.x contrast ratio of two `#RRGGBB` colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}
