import { Drawing } from './Drawings';
import { BUILDINGS, DRAWING_HALF_WIDTH, type BuildingId } from './world';

const SLOT = 200;
const HEIGHT = 128;

/**
 * A chapter's small, static picture of its district, shown only in the overview layout (the
 * sticky layouts have the map beside or above the text). Decorative: aria-hidden, no links,
 * no ambient hooks are animated here (the scene only looks inside the map).
 */
export function Vignette({ buildings }: { readonly buildings: readonly BuildingId[] }) {
  if (buildings.length === 0) return null;
  const width = buildings.length * SLOT;
  return (
    <svg
      className="worlds-vignette"
      viewBox={`0 0 ${width} ${HEIGHT}`}
      aria-hidden="true"
      focusable="false"
      data-vignette={buildings.join(' ')}
    >
      {buildings.map((id, i) => {
        const district = BUILDINGS.find((b) => b.id === id)?.district ?? 'neutral';
        const scale = Math.min(1, (SLOT / 2 - 12) / DRAWING_HALF_WIDTH[id]);
        return (
          <g key={id} className={`wd-${district}`}>
            <rect
              className="worlds-ground"
              x={i * SLOT + 4}
              y="4"
              width={SLOT - 8}
              height={HEIGHT - 8}
              rx="14"
            />
            <g transform={`translate(${i * SLOT + SLOT / 2} ${HEIGHT - 14})`}>
              <Drawing id={id} scale={scale} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
