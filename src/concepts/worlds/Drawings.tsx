import type { ReactElement } from 'react';
import type { BuildingId } from './world';

/*
 * Placeholder art for the spike: flat shapes, no filters, drawn on the anchor (0, 0) = middle
 * of the ground line, about 110 units tall. Colours come from the district classes in
 * worlds.css (`wb-body`, `wb-accent`, `wb-line`, `wb-dark`). Final illustrations replace these
 * in the full build.
 */
const DRAWINGS: Readonly<Record<BuildingId, ReactElement>> = {
  factory: (
    <>
      <rect className="wb-body" x="-70" y="-70" width="120" height="70" />
      <path className="wb-body" d="M-70 -70l30-26v26l30-26v26l30-26v26" />
      <rect className="wb-body" x="26" y="-110" width="18" height="40" />
      <circle className="wb-accent" cx="-18" cy="-34" r="16" />
      <circle className="wb-dark" cx="-18" cy="-34" r="6" />
    </>
  ),
  university: (
    <>
      <path className="wb-accent" d="M-62 -78L0 -110L62 -78Z" />
      <rect className="wb-body" x="-56" y="-78" width="112" height="78" />
      <path className="wb-line" d="M-36 -66v58M-12 -66v58M12 -66v58M36 -66v58" />
    </>
  ),
  bank: (
    <>
      <path className="wb-accent" d="M-60 -76L0 -108L60 -76Z" />
      <rect className="wb-body" x="-54" y="-76" width="108" height="76" />
      <circle className="wb-accent" cx="0" cy="-38" r="22" />
      <circle className="wb-dark" cx="0" cy="-38" r="9" />
    </>
  ),
  plaza: (
    <>
      <ellipse className="wb-body" cx="0" cy="-6" rx="50" ry="10" />
      <rect className="wb-dark" x="-4" y="-104" width="8" height="98" />
      <path className="wb-accent" d="M4 -98h36l10 10-10 10H4z" />
      <path className="wb-accent" d="M-4 -70h-36l-10 10 10 10h36z" />
    </>
  ),
  plant: (
    <>
      <rect className="wb-body" x="-66" y="-54" width="76" height="54" />
      <path className="wb-body" d="M18 0L26 -96h28l8 96z" />
      <path className="wb-accent" d="M-56 -30h20v10h-20zM-26 -30h20v10h-20z" />
    </>
  ),
  substation: (
    <>
      <path className="wb-line" d="M-50 0L-30 -104L-10 0M-44 -30h28M-38 -60h16" />
      <rect className="wb-body" x="0" y="-48" width="60" height="48" />
      <path className="wb-accent" d="M30 -42l-10 18h10l-6 16 16-22h-10l6-12z" />
    </>
  ),
  officeLeft: (
    <>
      <rect className="wb-body" x="-40" y="-110" width="80" height="110" />
      <path
        className="wb-accent"
        d="M-28 -96h18v14h-18zM10 -96h18v14h-18zM-28 -66h18v14h-18zM10 -66h18v14h-18zM-28 -36h18v14h-18zM10 -36h18v14h-18z"
      />
    </>
  ),
  officeRight: (
    <>
      <rect className="wb-body" x="-40" y="-92" width="80" height="92" />
      <path className="wb-accent" d="M-28 -80h56v10h-56zM-28 -58h56v10h-56zM-28 -36h56v10h-56z" />
    </>
  ),
  cementYard: (
    <>
      <rect className="wb-body" x="-126" y="-100" width="30" height="100" />
      <rect className="wb-body" x="-90" y="-100" width="30" height="100" />
      <path className="wb-line" d="M-56 -88h40v88" />
      <rect className="wb-accent" x="-4" y="-40" width="56" height="26" />
      <rect className="wb-body" x="56" y="-40" width="70" height="26" />
      <rect className="wb-accent" x="20" y="-70" width="56" height="26" />
      <circle className="wb-dark" cx="8" cy="-6" r="6" />
      <circle className="wb-dark" cx="44" cy="-6" r="6" />
    </>
  ),
  observatory: (
    <>
      <rect className="wb-body" x="-46" y="-50" width="92" height="50" />
      <path className="wb-body" d="M-40 -50a40 40 0 0 1 80 0z" />
      <rect className="wb-accent" x="-6" y="-92" width="12" height="20" />
      <path className="wb-line" d="M-56 0V-104M56 0V-104M-56 -104H56M-56 -60L56 -104" />
    </>
  ),
  workshop: (
    <>
      <path className="wb-accent" d="M-56 -60L0 -100L56 -60Z" />
      <rect className="wb-body" x="-50" y="-60" width="100" height="60" />
      <rect className="wb-dark" x="-18" y="-38" width="36" height="38" />
    </>
  ),
  postOffice: (
    <>
      <path className="wb-accent" d="M-56 -66L0 -100L56 -66Z" />
      <rect className="wb-body" x="-50" y="-66" width="100" height="66" />
      <rect className="wb-body" x="-24" y="-50" width="48" height="30" />
      <path className="wb-line" d="M-24 -50l24 18 24-18" />
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
