import type { ReactElement } from 'react';
import type { BuildingId } from './world';

/*
 * The buildings: flat geometric shapes drawn on the anchor (0, 0) = middle of the ground line,
 * 100 units tall and within DRAWING_HALF_WIDTH (the footprint the layout and its tests use).
 * No filters, no gradients, no `style` attributes. Colours come from the district classes in
 * worlds.css: `wb-body` (surface with a muted outline), `wb-accent`, `wb-dark` (muted),
 * `wb-window` (the ground colour), `wb-line` (muted strokes).
 *
 * Ambient hooks (animated by scene.ts, sticky layouts only, never under reduced motion):
 * - `data-ambient="gear"`: the factory gear turns.
 * - `data-ambient="truck"` + `data-ambient-path="truck"`: the truck drives into the cargo yard.
 */

function Gear() {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <g transform="translate(-48 -30)">
      <g data-ambient="gear">
        {teeth.map((angle) => (
          <rect
            key={angle}
            className="wb-accent"
            x="-4"
            y="-22"
            width="8"
            height="10"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle className="wb-accent" r="15" />
        <circle className="wb-window" r="6" />
      </g>
    </g>
  );
}

const DRAWINGS: Readonly<Record<BuildingId, ReactElement>> = {
  factory: (
    <>
      <rect className="wb-body" x="-86" y="-62" width="112" height="62" />
      <path className="wb-body" d="M-86 -62l28-22v22l28-22v22l28-22v22l28-22v22z" />
      <rect className="wb-body" x="34" y="-100" width="16" height="100" />
      <rect className="wb-accent" x="34" y="-92" width="16" height="6" />
      <rect className="wb-body" x="54" y="-40" width="32" height="40" />
      <path className="wb-window" d="M-10 -46h26v14h-26zM-10 -24h26v14h-26zM60 -32h20v10h-20z" />
      <Gear />
    </>
  ),
  university: (
    <>
      <rect className="wb-body" x="-80" y="-10" width="160" height="10" />
      <rect className="wb-body" x="-72" y="-18" width="144" height="8" />
      <rect className="wb-body" x="-64" y="-70" width="128" height="52" />
      <path className="wb-line" d="M-46 -64v40M-22 -64v40M2 -64v40M26 -64v40M50 -64v40" />
      <path className="wb-accent" d="M-74 -70L0 -96L74 -70Z" />
      <circle className="wb-window" cx="0" cy="-80" r="6" />
      <path className="wb-line" d="M60 -96v-4" />
    </>
  ),
  bank: (
    <>
      <rect className="wb-body" x="-70" y="-74" width="140" height="74" />
      <path className="wb-accent" d="M-76 -74L0 -100L76 -74Z" />
      <rect className="wb-dark" x="-70" y="-10" width="140" height="10" />
      <circle className="wb-accent" cx="0" cy="-38" r="24" />
      <circle className="wb-window" cx="0" cy="-38" r="16" />
      <path className="wb-line" d="M0 -52v28M-14 -38h28" />
      <path className="wb-line" d="M-54 -64v48M54 -64v48" />
    </>
  ),
  plaza: (
    <>
      <ellipse className="wb-body" cx="0" cy="-6" rx="70" ry="10" />
      <rect className="wb-dark" x="-4" y="-100" width="8" height="94" />
      <path className="wb-accent" d="M4 -94h40l12 11-12 11H4z" />
      <path className="wb-accent" d="M-4 -64h-40l-12 11 12 11h40z" />
      <rect className="wb-body" x="22" y="-22" width="40" height="8" />
      <path className="wb-line" d="M28 -14v8M56 -14v8" />
    </>
  ),
  plant: (
    <>
      <rect className="wb-body" x="-84" y="-52" width="88" height="52" />
      <path className="wb-window" d="M-74 -40h18v12h-18zM-48 -40h18v12h-18zM-22 -40h18v12h-18z" />
      <path className="wb-body" d="M16 0Q34 -50 24 -100H74Q64 -50 84 0Z" />
      <path className="wb-accent" d="M26 -84h46v8h-46zM24 -24h52v8h-52z" />
    </>
  ),
  substation: (
    <>
      <path className="wb-line" d="M-74 0L-52 -100L-30 0M-68 -30h32M-62 -60h20M-74 -76h44" />
      <rect className="wb-body" x="-14" y="-46" width="38" height="46" />
      <rect className="wb-body" x="34" y="-46" width="38" height="46" />
      <path className="wb-accent" d="M12 -40l-10 18h9l-6 16 16-22h-9l6-12z" />
      <path className="wb-line" d="M-6 -46v-10M16 -46v-10M42 -46v-10M64 -46v-10" />
    </>
  ),
  officeLeft: (
    <>
      <rect className="wb-body" x="-44" y="-100" width="88" height="100" />
      <path
        className="wb-accent"
        d="M-32 -88h20v12h-20zM-6 -88h20v12h-20zM20 -88h12v12h-12zM-32 -64h20v12h-20zM-6 -64h20v12h-20zM20 -64h12v12h-12zM-32 -40h20v12h-20zM-6 -40h20v12h-20zM20 -40h12v12h-12z"
      />
      <rect className="wb-dark" x="-10" y="-16" width="20" height="16" />
    </>
  ),
  officeRight: (
    <>
      <rect className="wb-body" x="-60" y="-80" width="120" height="80" />
      <path className="wb-accent" d="M-48 -68h96v8h-96zM-48 -48h96v8h-96zM-48 -28h96v8h-96z" />
      <path className="wb-line" d="M40 -80v-20M34 -94h12" />
      <rect className="wb-dark" x="-10" y="-14" width="20" height="14" />
    </>
  ),
  cementYard: (
    <>
      <rect className="wb-body" x="-112" y="-84" width="26" height="84" />
      <ellipse className="wb-body" cx="-99" cy="-84" rx="13" ry="5" />
      <rect className="wb-body" x="-82" y="-84" width="26" height="84" />
      <ellipse className="wb-body" cx="-69" cy="-84" rx="13" ry="5" />
      <path className="wb-line" d="M-56 -76L-20 -100V-60" />
      <rect className="wb-body" x="-34" y="-60" width="44" height="60" />
      <rect className="wb-accent" x="20" y="-74" width="44" height="22" />
      <rect className="wb-body" x="64" y="-74" width="48" height="22" />
      <rect className="wb-body" x="20" y="-52" width="44" height="22" />
      <rect className="wb-accent" x="64" y="-52" width="48" height="22" />
      <path data-ambient-path="truck" className="wb-hidden" d="M-150 0L0 0" />
      <g data-ambient="truck">
        <rect className="wb-accent" x="16" y="-26" width="58" height="18" />
        <rect className="wb-dark" x="76" y="-24" width="20" height="16" />
        <rect className="wb-window" x="82" y="-22" width="10" height="6" />
        <circle className="wb-dark" cx="30" cy="-6" r="6" />
        <circle className="wb-dark" cx="62" cy="-6" r="6" />
        <circle className="wb-dark" cx="88" cy="-6" r="6" />
      </g>
    </>
  ),
  observatory: (
    <>
      <path className="wb-line" d="M-70 0V-100M-56 0V-100M-70 -100H-56M-70 -66H-56M-70 -32H-56" />
      <rect className="wb-body" x="-44" y="-44" width="104" height="44" />
      <path className="wb-body" d="M-36 -44a44 44 0 0 1 88 0z" />
      <rect className="wb-accent" x="2" y="-86" width="12" height="40" />
      <path className="wb-line" d="M8 -70L46 -96" />
      <circle className="wb-accent" cx="60" cy="-92" r="3" />
    </>
  ),
  workshop: (
    <>
      <path className="wb-accent" d="M-72 -60L0 -98L72 -60Z" />
      <rect className="wb-body" x="-66" y="-60" width="132" height="60" />
      <rect className="wb-dark" x="-26" y="-44" width="52" height="44" />
      <path className="wb-line" d="M-26 -30h52M-26 -16h52" />
      <circle className="wb-accent" cx="-48" cy="-36" r="9" />
      <rect className="wb-accent" x="-51" y="-28" width="6" height="18" />
    </>
  ),
  postOffice: (
    <>
      <path className="wb-accent" d="M-72 -66L0 -100L72 -66Z" />
      <rect className="wb-body" x="-66" y="-66" width="132" height="66" />
      <rect className="wb-window" x="-28" y="-54" width="56" height="34" />
      <path className="wb-line" d="M-28 -54l28 20 28-20" />
      <rect className="wb-dark" x="-10" y="-16" width="20" height="16" />
      <rect className="wb-accent" x="46" y="-30" width="14" height="22" />
    </>
  ),
};

export function Drawing({ id, scale }: { readonly id: BuildingId; readonly scale: number }) {
  return (
    <g
      className="worlds-drawing"
      aria-hidden="true"
      transform={scale === 1 ? undefined : `scale(${scale})`}
    >
      {DRAWINGS[id]}
    </g>
  );
}
