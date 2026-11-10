import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FocusEvent } from 'react';
import { useLanguage } from '../../i18n/context';
import { Drawing } from './Drawings';
import {
  BUILDINGS,
  buildingLabel,
  estimateTextWidth,
  labelLines,
  linkGeometry,
  signLayout,
  type Arrangement,
  type BuildingId,
} from './world';

export const WORLD_MAP_ID = 'world-map';
const TITLE_ID = 'world-map-title';

/** Decor, power line, pin and signs: loaded after first paint. */
const Details = lazy(() => import('./Details'));

interface Props {
  readonly arrangement: Arrangement;
  /** Buildings whose job uses the skill chosen in the Toolbox: they get a halo. */
  readonly highlighted?: ReadonlySet<BuildingId>;
  /** Told when keyboard focus enters (true) or leaves (false) the map. */
  readonly onKeyboardFocus?: (inside: boolean) => void;
}

function matchesFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/** Widest rendered line of an SVG <text>, or null where the browser can't measure (jsdom). */
function measureText(text: SVGTextElement | null): number | null {
  if (!text || typeof text.getBBox !== 'function') return null;
  try {
    const width = text.getBBox().width;
    return width > 0 ? width : null;
  } catch {
    return null;
  }
}

/**
 * The clickable world: one inline SVG inside a labelled <nav>. Each building is an SVG link
 * whose text is its always-visible label on a solid chip, so the accessible name is exactly
 * the visible label. Positions sit on the outer <g transform> of each list item; the hover and
 * focus lift is a CSS transform on an inner group (they never share an element). No `style`
 * attributes anywhere (CSP `style-src 'self'`).
 */
export function WorldMap({ arrangement, highlighted, onKeyboardFocus }: Props) {
  const { lang, dict } = useLanguage();
  const texts = useRef<(SVGTextElement | null)[]>([]);
  const [measured, setMeasured] = useState<{ key: string; widths: (number | null)[] } | null>(null);
  const key = `${lang}|${arrangement.id}`;

  const labels = BUILDINGS.map((building) => buildingLabel(building, lang, dict));

  const measure = useCallback(() => {
    setMeasured({ key, widths: texts.current.map(measureText) });
  }, [key]);

  // Chips fit their text. The first paint uses estimated widths; the real ones are measured
  // once the web font is in, in a frame of their own: measuring during the first commit forced
  // a full synchronous layout inside the page's longest task (Lighthouse TBT, measured).
  useEffect(() => {
    let active = true;
    let frame = 0;
    const later = () => {
      frame = requestAnimationFrame(() => {
        if (active) measure();
      });
    };
    // jsdom has no FontFaceSet.
    if ('fonts' in document) void document.fonts.ready.then(later);
    else measure();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [measure]);

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    if (event.target.closest('a') && matchesFocusVisible(event.target)) onKeyboardFocus?.(true);
  };
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) onKeyboardFocus?.(false);
  };

  const { width, height } = arrangement;

  return (
    <nav
      id={WORLD_MAP_ID}
      data-jump-target=""
      aria-labelledby={TITLE_ID}
      className={`worlds-map worlds-map--${arrangement.id}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <h2 id={TITLE_ID} className="visually-hidden" tabIndex={-1}>
        {dict.worlds.worldMap}
      </h2>
      <div className="worlds-map__viewport" data-camera-stage="">
        <div className="worlds-map__camera" data-camera="">
          <svg
            className="worlds-map__svg"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            data-arrangement={arrangement.id}
          >
            <g className="worlds-scenery" aria-hidden="true">
              <rect className="worlds-land" x="0" y="0" width={width} height={height} />
              <path className="worlds-road" d={arrangement.road} />
              {arrangement.grounds.map((ground) => (
                <g key={ground.id} className={`wd-${ground.district}`} data-ground={ground.id}>
                  <rect
                    className="worlds-ground"
                    x={ground.rect.x}
                    y={ground.rect.y}
                    width={ground.rect.w}
                    height={ground.rect.h}
                    rx="18"
                  />
                  {ground.sign &&
                    signLayout(ground, dict.worlds.districts[ground.sign], arrangement).sign && (
                      <text
                        className="worlds-sign"
                        x={ground.rect.x + 14}
                        y={ground.rect.y + arrangement.signSize + 8}
                        fontSize={arrangement.signSize}
                      >
                        {dict.worlds.districts[ground.sign]}
                      </text>
                    )}
                </g>
              ))}
            </g>
            <Suspense fallback={null}>
              <Details arrangement={arrangement} />
            </Suspense>
            <g role="list" className="worlds-buildings">
              {BUILDINGS.map((building, i) => {
                const label = labels[i] ?? '';
                const spot = arrangement.places[building.id];
                const lines = labelLines(label, arrangement.maxChars);
                const fresh = measured?.key === key ? measured.widths[i] : null;
                const textWidth =
                  fresh ??
                  Math.max(...lines.map((line) => estimateTextWidth(line, arrangement.fontSize)));
                const geo = linkGeometry(arrangement, building.id, lines.length, textWidth);
                return (
                  <g
                    key={building.id}
                    role="listitem"
                    className={`worlds-building wd-${building.district}`}
                    transform={`translate(${spot.x} ${spot.y})`}
                    data-building={building.id}
                    data-halo={highlighted?.has(building.id) ? '' : undefined}
                  >
                    <a href={building.href} className="worlds-link">
                      <rect
                        className="worlds-hit"
                        x={geo.hit.x}
                        y={geo.hit.y}
                        width={geo.hit.w}
                        height={geo.hit.h}
                        rx="14"
                      />
                      <rect
                        className="worlds-ring"
                        x={geo.hit.x + 3}
                        y={geo.hit.y + 3}
                        width={geo.hit.w - 6}
                        height={geo.hit.h - 6}
                        rx="12"
                      />
                      <ellipse
                        className="worlds-halo"
                        cx={geo.halo.x + geo.halo.w / 2}
                        cy={geo.halo.y + geo.halo.h / 2}
                        rx={geo.halo.w / 2}
                        ry={geo.halo.h / 2}
                      />
                      <g className="worlds-lift">
                        <Drawing id={building.id} scale={arrangement.drawingScale} />
                      </g>
                      <rect
                        className="worlds-chip"
                        x={geo.chip.x}
                        y={geo.chip.y}
                        width={geo.chip.w}
                        height={geo.chip.h}
                        rx={Math.min(12, geo.chip.h / 2)}
                      />
                      <text
                        ref={(el) => {
                          texts.current[i] = el;
                        }}
                        className="worlds-label"
                        x={geo.textX}
                        y={geo.textY}
                        fontSize={arrangement.fontSize}
                        textAnchor="middle"
                      >
                        {lines.map((line, n) => (
                          <tspan key={line} x={geo.textX} dy={n === 0 ? 0 : geo.lineHeight}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </a>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </nav>
  );
}
