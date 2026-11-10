/**
 * The Worlds map as data (docs/STORYBOARDS.md, section 3): the twelve building links in story
 * order, the district palettes, and three arrangements of the same districts, each sized so
 * the whole world keeps labels at 12 px or more where it is used (William, 2026-11-10):
 *
 * - `square`: the split layout's sticky stage (≥ 1024 × 600), moved by the camera.
 * - `wide`: the tablet strip (768–1023 wide, ≥ 760 tall), also moved by the camera, and the
 *   overview map on wide but short screens (≥ 820 wide).
 * - `portrait`: the overview map on narrow screens, one band per district.
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

/**
 * Breaks a label into lines of at most `maxChars` characters, at spaces, keeping " ·" with the
 * word before it. A label with " · " whose two halves both fit breaks there. Every line after
 * the first keeps its leading space, so the lines join back to exactly the label (the link's
 * accessible name is the text of its <tspan>s).
 */
export function labelLines(label: string, maxChars: number): string[] {
  if (label.length <= maxChars) return [label];
  const at = label.indexOf(' · ');
  if (at >= 0 && at + 2 <= maxChars && label.length - (at + 3) <= maxChars) {
    return [label.slice(0, at + 2), label.slice(at + 2)];
  }
  const words = label.split(' ').reduce<string[]>((out, word) => {
    // "·" stays at the end of the word before it.
    const last = out.length - 1;
    if (word === '·' && last >= 0) out[last] = `${out[last] ?? ''} ·`;
    else out.push(word);
    return out;
  }, []);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.map((text, i) => (i === 0 ? text : ` ${text}`));
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
}

export type ArrangementId = 'square' | 'wide' | 'portrait';

export interface Arrangement {
  readonly id: ArrangementId;
  readonly width: number;
  readonly height: number;
  /** Label chip below the building, or to its right. */
  readonly labelAt: 'below' | 'right';
  readonly fontSize: number;
  /** Longest label line, in characters. */
  readonly maxChars: number;
  readonly signSize: number;
  readonly drawingScale: number;
  readonly grounds: readonly Ground[];
  readonly places: Readonly<Record<BuildingId, Placement>>;
  readonly road: string;
}

interface Band {
  readonly ground: GroundId;
  readonly district: DistrictId;
  readonly sign: DistrictName | null;
  readonly buildings: readonly BuildingId[];
}

export const BANDS: Readonly<Record<GroundId, Band>> = {
  industrial: {
    ground: 'industrial',
    district: 'industrial',
    sign: 'industrial',
    buildings: ['factory', 'university'],
  },
  banking: { ground: 'banking', district: 'banking', sign: 'banking', buildings: ['bank'] },
  between: {
    ground: 'between',
    district: 'between',
    sign: 'betweenWorlds',
    buildings: ['plaza'],
  },
  energy: {
    ground: 'energy',
    district: 'energy',
    sign: 'energy',
    buildings: ['plant', 'substation'],
  },
  corporate: {
    ground: 'corporate',
    district: 'corporate',
    sign: 'corporate',
    buildings: ['officeLeft', 'officeRight'],
  },
  cement: { ground: 'cement', district: 'cement', sign: 'cement', buildings: ['cementYard'] },
  ai: { ground: 'ai', district: 'ai', sign: 'ai', buildings: ['observatory'] },
  arrival: {
    ground: 'arrival',
    district: 'neutral',
    sign: null,
    buildings: ['workshop', 'postOffice'],
  },
};

/** All drawings are 100 units tall at scale 1, standing on their anchor. */
export const DRAWING_HEIGHT = 100;

/** Horizontal half-width of each drawing at scale 1 (the tested footprint). */
export const DRAWING_HALF_WIDTH: Readonly<Record<BuildingId, number>> = {
  factory: 86,
  university: 80,
  bank: 76,
  plaza: 70,
  plant: 84,
  substation: 80,
  officeLeft: 56,
  officeRight: 60,
  cementYard: 112,
  observatory: 72,
  workshop: 72,
  postOffice: 72,
};

interface RowSpec {
  readonly fontSize: number;
  /** District sign size: at least 12 px in the smallest whole-world view of its layout. */
  readonly signSize: number;
  readonly slot: number;
  readonly wideSlot: number;
  /**
   * Rows of grounds as drawn, left to right. Story order snakes: even rows read left to
   * right, odd rows right to left (see the road).
   */
  readonly rows: readonly (readonly GroundId[])[];
}

/** Outer margin: room for the road along the left and right edges (stroke 14). */
const MARGIN = 16;
const DISTRICT_PAD = 8;
const GROUND_GAP = 12;
const ROW_GAP = 14;
/** Ground line below a ground's top: room for a one-line sign above the drawings. */
export const GROUND_LINE = 160;

/**
 * A landscape arrangement (labels below the buildings): rows of grounds, every building in a
 * slot wide enough for its chip, each row stretched to the widest one. Every ground is tall
 * enough for a three-line chip.
 */
function buildLandscape(id: 'square' | 'wide', spec: RowSpec): Arrangement {
  const lineHeight = Math.round(spec.fontSize * 1.2);
  const chipMax = 3 * lineHeight + 2 * Math.round(spec.fontSize * 0.35);
  const groundH = GROUND_LINE + 12 + chipMax + 6 + 10;
  const slotOf = (b: BuildingId) => (b === 'cementYard' ? spec.wideSlot : spec.slot);
  const natural = (row: readonly GroundId[]) =>
    row.reduce(
      (sum, g) => sum + 2 * DISTRICT_PAD + BANDS[g].buildings.reduce((s, b) => s + slotOf(b), 0),
      0,
    ) +
    (row.length - 1) * GROUND_GAP;
  const inner = Math.max(...spec.rows.map(natural));
  const width = inner + 2 * MARGIN;
  const grounds: Ground[] = [];
  const places: Partial<Record<BuildingId, Placement>> = {};
  spec.rows.forEach((row, r) => {
    const top = MARGIN + r * (groundH + ROW_GAP);
    const slots = row.reduce((n, g) => n + BANDS[g].buildings.length, 0);
    const extra = (inner - natural(row)) / slots;
    let x = MARGIN;
    for (const g of row) {
      const band = BANDS[g];
      const start = x;
      x += DISTRICT_PAD;
      for (const b of band.buildings) {
        const w = slotOf(b) + extra;
        places[b] = { x: Math.round(x + w / 2), y: top + GROUND_LINE };
        x += w;
      }
      x += DISTRICT_PAD;
      grounds.push({
        id: band.ground,
        district: band.district,
        sign: band.sign,
        rect: { x: Math.round(start), y: top, w: Math.round(x - start), h: groundH },
      });
      x += GROUND_GAP;
    }
  });
  const height = MARGIN * 2 + spec.rows.length * groundH + (spec.rows.length - 1) * ROW_GAP;
  // The road snakes in story order: down the left edge beside the first row, along each gap
  // between rows (left to right under even rows, right to left under odd ones), down the edge
  // where it turns, and finally down beside the last row. Each row is read in the direction
  // of the road beneath or beside it, so the drawing follows the story (arrival last).
  const gapY = (r: number) => MARGIN + (r + 1) * (groundH + ROW_GAP) - ROW_GAP / 2;
  const edge = (right: boolean) => (right ? width - MARGIN / 2 : MARGIN / 2);
  const segments: string[] = [`M${edge(false)} ${MARGIN / 2}`];
  for (let r = 0; r < spec.rows.length - 1; r++) {
    segments.push(`V${gapY(r)}`, `H${edge(r % 2 === 0)}`);
  }
  segments.push(`V${height - MARGIN / 2}`);
  return {
    id,
    width,
    height,
    labelAt: 'below',
    fontSize: spec.fontSize,
    maxChars: 12,
    signSize: spec.signSize,
    drawingScale: 1,
    grounds,
    places: places as Record<BuildingId, Placement>,
    road: segments.join(''),
  };
}

/** The split layout's stage (about 60% wide, nearly square): three rows, story order snaking. */
export const SQUARE: Arrangement = buildLandscape('square', {
  fontSize: 24,
  signSize: 22,
  slot: 226,
  wideSlot: 270,
  rows: [
    ['industrial', 'banking', 'between'],
    ['corporate', 'energy'],
    ['cement', 'ai', 'arrival'],
  ],
});

/** The tablet strip and the wide overview: two long rows (the second read right to left). */
export const WIDE: Arrangement = buildLandscape('wide', {
  fontSize: 26,
  signSize: 26,
  slot: 238,
  wideSlot: 280,
  rows: [
    ['industrial', 'banking', 'between', 'energy'],
    ['arrival', 'ai', 'cement', 'corporate'],
  ],
});

/** Portrait (narrow overview): one band per district, top to bottom in story order. */
const PORTRAIT_ORDER: readonly GroundId[] = [
  'industrial',
  'banking',
  'between',
  'energy',
  'corporate',
  'cement',
  'ai',
  'arrival',
];

const P = {
  width: 600,
  top: 12,
  header: 46,
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
  for (const id of PORTRAIT_ORDER) {
    const band = BANDS[id];
    const header = band.sign ? P.header : P.noHeader;
    // The cement band has an extra row for its "You are here" pin.
    const extra = id === 'cement' ? 64 : 0;
    const h = header + band.buildings.length * P.row + P.pad + extra;
    grounds.push({
      id: band.ground,
      district: band.district,
      sign: band.sign,
      rect: { x: 12, y, w: P.width - 24, h },
    });
    band.buildings.forEach((b, i) => {
      places[b] = { x: P.x, y: y + header + i * P.row + P.ground };
    });
    y += h + P.gap;
  }
  return {
    id: 'portrait',
    width: P.width,
    height: y - P.gap + P.top,
    labelAt: 'right',
    fontSize: 28,
    maxChars: 22,
    signSize: 26,
    drawingScale: 0.66,
    grounds,
    places: places as Record<BuildingId, Placement>,
    road: `M${P.x} ${P.top}V${y - P.gap}`,
  };
}

export const PORTRAIT: Arrangement = buildPortrait();

export const ARRANGEMENTS: Readonly<Record<ArrangementId, Arrangement>> = {
  square: SQUARE,
  wide: WIDE,
  portrait: PORTRAIT,
};

/** Label chip and link target geometry, relative to the building's anchor. */
export interface LinkGeometry {
  readonly chip: Rect;
  readonly hit: Rect;
  /** Around the drawing: the Toolbox halo. */
  readonly halo: Rect;
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
  const halo = { x: -half - 8, y: -top - 10, w: 2 * half + 16, h: top + 16 };
  if (arrangement.labelAt === 'below') {
    const chip = { x: -chipW / 2, y: 12, w: chipW, h: chipH };
    const left = Math.min(-half, chip.x) - 12;
    const right = Math.max(half, chip.x + chipW) + 12;
    const hit = { x: left, y: -top - 16, w: right - left, h: top + 16 + chip.y + chipH + 6 };
    return { chip, hit, halo, textX: 0, textY: chip.y + padY + font * 0.8, lineHeight };
  }
  const rowTop = -P.ground;
  const chip = { x: half + 20, y: rowTop + (P.row - chipH) / 2, w: chipW, h: chipH };
  const hit = { x: -half - 6, y: rowTop + 3, w: chip.x + chipW + 8 + half + 6, h: P.row - 6 };
  return {
    chip,
    hit,
    halo,
    textX: chip.x + chipW / 2,
    textY: chip.y + padY + font * 0.8,
    lineHeight,
  };
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

/** The area a chapter's viewpoint must show. */
export function viewRect(chapter: ChapterId, arrangement: Arrangement): Rect {
  const view = CHAPTER_VIEW[chapter];
  if (view === 'world') return { x: 0, y: 0, w: arrangement.width, h: arrangement.height };
  const rects = arrangement.grounds.filter((g) => view.includes(g.id)).map((g) => g.rect);
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** The buildings whose jobs are listed: the Toolbox halos for a chosen skill. */
export function buildingsForJobs(jobIds: readonly string[]): BuildingId[] {
  return BUILDINGS.filter((b) => jobIds.some((id) => b.href === `#job-${id}`)).map((b) => b.id);
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
  arrangement: Arrangement,
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

/** Width kept free at the top right of a ground for its decor. */
export const DECOR_WIDTH = 80;

/** Rough width of a sign: the label estimate plus the sign's 0.03em letter spacing. */
export function estimateSignWidth(text: string, signSize: number): number {
  return text.length * signSize * 0.63;
}

/**
 * Whether a ground shows its decorative sign and its decor (William, 2026-11-10): a sign is
 * one line at the arrangement's sign size (12 px or more wherever the whole map is shown). It
 * goes beside the decor if it fits; otherwise alone; otherwise it is left off (the district
 * name stays above its chapter). The two signs that repeat the label beside them ("AI
 * frontier", "Between worlds") are dropped first: they never take the decor's place.
 */
export function signLayout(
  ground: Ground,
  text: string | null,
  arrangement: Arrangement,
): { readonly sign: boolean; readonly decor: boolean } {
  const hasDecor = ground.id !== 'cement';
  if (!text) return { sign: false, decor: hasDecor };
  const width = estimateSignWidth(text, arrangement.signSize);
  const room = ground.rect.w - 28;
  if (width <= room - (hasDecor ? DECOR_WIDTH : 0)) return { sign: true, decor: hasDecor };
  const redundant = ground.id === 'ai' || ground.id === 'between';
  if (width <= room && !redundant) return { sign: true, decor: false };
  return { sign: false, decor: hasDecor };
}
