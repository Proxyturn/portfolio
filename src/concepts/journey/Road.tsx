import type { RoadGeometry } from './geometry';

export const ROAD_MASK_ID = 'journey-road-mask';
export const ROUTE_ID = 'journey-route';

/**
 * The road layer behind the story: one SVG the size of the whole story. Its resting state is
 * the finished map (fully drawn road, dotted blue road ahead, traveler at "You are here"); the
 * scroll scene only animates it from there. Purely decorative, so hidden from assistive tech.
 */
export function Road({ geometry }: { readonly geometry: RoadGeometry | null }) {
  const width = geometry?.width ?? 0;
  const height = geometry?.height ?? 0;
  return (
    <svg
      className="journey-road"
      data-road=""
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
      preserveAspectRatio="none"
    >
      <defs>
        <mask
          id={ROAD_MASK_ID}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={width}
          height={height}
        >
          {/* Scaled with a transform by the scroll scene; full size at rest. */}
          <rect className="journey-road__reveal" x="0" y="0" width={width} height={height} />
        </mask>
      </defs>
      {geometry && (
        <>
          <g mask={`url(#${ROAD_MASK_ID})`}>
            <PowerLines poles={geometry.poles} />
            {geometry.segments.map((segment) => (
              <path
                key={segment.chapter}
                className={`journey-road__seg journey-road__seg--${segment.chapter}`}
                d={segment.d}
              />
            ))}
            {geometry.segments
              .filter((segment) => segment.chapter === 'enterprise')
              .map((segment) => (
                <path key="lanes" className="journey-road__lanes" d={segment.d} />
              ))}
            {geometry.fork && (
              <path className="journey-road__seg journey-road__fork" d={geometry.fork} />
            )}
            {geometry.ahead && (
              <>
                <path className="journey-road__ahead journey-road__ahead--day" d={geometry.ahead} />
                <path
                  className="journey-road__ahead journey-road__ahead--horizon"
                  d={geometry.ahead}
                />
              </>
            )}
          </g>
          <path id={ROUTE_ID} className="journey-road__route" d={geometry.route} />
          {geometry.here && (
            <g
              className="journey-traveler"
              transform={`translate(${geometry.here.x} ${geometry.here.y})`}
            >
              <circle className="journey-traveler__halo" r="9" />
              <circle className="journey-traveler__dot" r="4.5" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}

/** Map symbol for a power line: a wire with pylons, which the road crosses under. */
function PowerLines({ poles }: { readonly poles: RoadGeometry['poles'] }) {
  const first = poles[0];
  const last = poles[poles.length - 1];
  if (!first || !last) return null;
  return (
    <g className="journey-road__power">
      <path className="journey-road__wire" d={`M${first.x - 5} ${first.y}V${last.y}`} />
      <path className="journey-road__wire" d={`M${first.x + 5} ${first.y}V${last.y}`} />
      {poles.map((pole) => (
        <g key={`${pole.x}-${pole.y}`} transform={`translate(${pole.x} ${pole.y})`}>
          <path className="journey-road__pylon" d="M-9 0H9M-6 -5L0 5L6 -5" />
        </g>
      ))}
    </g>
  );
}
