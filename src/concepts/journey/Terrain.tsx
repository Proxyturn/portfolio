/**
 * The paper and two layers of terrain contour lines behind the story. Drawn as CSS gradients
 * and inline SVG patterns: no image files, no data: URIs.
 *
 * Performance: they live in one viewport-sized sticky layer instead of spanning the whole
 * (very tall) story, so they are painted once instead of on every scroll frame. The scroll
 * scene moves each contour layer by up to one pattern tile, wrapping around (parallax).
 */
import { contour } from './route';

interface Hill {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly rings: number;
}

function hillPaths(hills: readonly Hill[]): string[] {
  return hills.flatMap((hill, h) =>
    Array.from({ length: hill.rings }, (_, ring) =>
      contour(hill.cx, hill.cy, (hill.r * (ring + 1)) / hill.rings, h + ring),
    ),
  );
}

const LAYERS = [
  {
    id: 'far',
    size: 520,
    /** Pixels of drift per pixel scrolled. */
    rate: 0.12,
    hills: [
      { cx: 140, cy: 150, r: 120, rings: 4 },
      { cx: 390, cy: 400, r: 105, rings: 3 },
    ],
  },
  {
    id: 'near',
    size: 680,
    rate: 0.25,
    hills: [
      { cx: 500, cy: 170, r: 140, rings: 5 },
      { cx: 170, cy: 500, r: 120, rings: 4 },
    ],
  },
] as const;

/**
 * Tiles drawn per layer: enough to cover a 3840 × 2160 (4K) viewport plus one tile of drift.
 * Tiles are `<use>` copies of one group rather than an SVG `<pattern>`: browsers cull
 * off-screen copies, while a pattern fill is re-rasterized on every paint (very slow in
 * software-rendered WebKit).
 */
const MAX_WIDTH = 3840;
const MAX_HEIGHT = 2160;

function tilesFor(size: number): { x: number; y: number }[] {
  const cols = Math.ceil(MAX_WIDTH / size);
  const rows = Math.ceil((MAX_HEIGHT + size) / size);
  return Array.from({ length: cols * rows }, (_, i) => ({
    x: (i % cols) * size,
    y: Math.floor(i / cols) * size,
  }));
}

export function Terrain() {
  return (
    <div className="journey-terrain" aria-hidden="true">
      <div className="journey-terrain__viewport">
        {LAYERS.map((layer) => (
          <svg
            key={layer.id}
            className={`journey-terrain__layer journey-terrain__layer--${layer.id}`}
            data-tile={layer.size}
            data-rate={layer.rate}
            focusable="false"
          >
            <defs>
              <g id={`journey-contours-${layer.id}`}>
                {hillPaths(layer.hills).map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>
            </defs>
            {tilesFor(layer.size).map(({ x, y }) => (
              <use key={`${x}-${y}`} href={`#journey-contours-${layer.id}`} x={x} y={y} />
            ))}
          </svg>
        ))}
      </div>
    </div>
  );
}
