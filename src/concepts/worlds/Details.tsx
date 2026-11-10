import { useLanguage } from '../../i18n/context';
import {
  DECOR_WIDTH,
  signLayout,
  estimateTextWidth,
  type Arrangement,
  type Ground,
  type GroundId,
} from './world';

/*
 * The map's detail layer, lazy-loaded after first paint (docs/STORYBOARDS.md, "Performance"):
 * small decor per district, the power line with its pulses (an ambient piece), the "You are
 * here" pin on the cement district and the four "In progress" signs at the observatory.
 * All of it is aria-hidden and takes no pointer events. Each district's decor is a
 * `[data-detail]` group, so the scene can fade the districts that aren't active (buildings,
 * labels, signs and the pin never fade).
 */

function Tree({ x, y }: { readonly x: number; readonly y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="wb-dark" x="-2" y="-4" width="4" height="12" />
      <circle className="wb-accent" cx="0" cy="-12" r="10" />
    </g>
  );
}

function Decor({ ground }: { readonly ground: Ground }) {
  const x = ground.rect.x + ground.rect.w - DECOR_WIDTH / 2 - 8;
  const y = ground.rect.y + 34;
  switch (ground.id) {
    case 'industrial':
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect className="wb-body" x="-26" y="-10" width="22" height="18" />
          <rect className="wb-accent" x="-2" y="-10" width="22" height="18" />
          <rect className="wb-body" x="-14" y="-26" width="22" height="16" />
        </g>
      );
    case 'banking':
      return (
        <g transform={`translate(${x} ${y})`}>
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} className="wb-accent" cx="0" cy={6 - i * 7} rx="16" ry="5" />
          ))}
        </g>
      );
    case 'between':
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect className="wb-dark" x="-2" y="-24" width="4" height="32" />
          <circle className="wb-accent" cx="0" cy="-26" r="7" />
        </g>
      );
    case 'energy':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path className="wb-accent" d="M4 -24l-14 20h10l-6 16 18-22H2l8-14z" />
        </g>
      );
    case 'ai':
      return (
        <g transform={`translate(${x} ${y})`}>
          <path className="wb-line" d="M-26 4L-8 -14L10 -4L26 -20" />
          {[
            [-26, 4],
            [-8, -14],
            [10, -4],
            [26, -20],
          ].map(([cx, cy]) => (
            <circle key={`${cx}`} className="wb-accent" cx={cx} cy={cy} r="4" />
          ))}
        </g>
      );
    case 'cement':
      return null;
    default:
      return (
        <g>
          <Tree x={x - 14} y={y + 4} />
          <Tree x={x + 16} y={y} />
        </g>
      );
  }
}

/** A chip with text in the label font: the same contrast pairs as the building labels. */
function Badge({
  x,
  y,
  text,
  arrangement,
}: {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly arrangement: Arrangement;
}) {
  const font = arrangement.fontSize;
  const w = estimateTextWidth(text, font) + 20;
  const h = Math.round(font * 1.2) + 2 * Math.round(font * 0.35);
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="worlds-chip" x={-w / 2} y="0" width={w} height={h} rx="12" />
      <text
        className="worlds-label"
        x="0"
        y={Math.round(font * 0.35) + font * 0.8}
        fontSize={font}
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  );
}

function groundOf(arrangement: Arrangement, id: GroundId): Ground | undefined {
  return arrangement.grounds.find((g) => g.id === id);
}

export function Details({ arrangement }: { readonly arrangement: Arrangement }) {
  const { dict } = useLanguage();
  const { places, fontSize } = arrangement;
  const below = arrangement.labelAt === 'below';
  const chipH = Math.round(fontSize * 1.2) + 2 * Math.round(fontSize * 0.35);

  // The cement yard's pin: under its one-line "SEMANTIX" chip, or in the band's extra row.
  const yard = places.cementYard;
  const pinText = dict.worlds.youAreHere;
  const pinW = estimateTextWidth(pinText, fontSize) + 20;
  const pin = below
    ? { x: yard.x, y: yard.y + 12 + chipH + 12 }
    : { x: arrangement.width / 2 + 20, y: yard.y + 24 };
  const marker = { x: pin.x - pinW / 2 - 14, y: pin.y + chipH * 0.8 };

  // The observatory's four signs: under its chip, or to the right of it.
  const obs = places.observatory;
  const signs = below
    ? [-54, -18, 18, 54].map((dx) => ({ x: obs.x + dx, y: obs.y + 12 + 2 * chipH + 2 }))
    : [0, 1, 2, 3].map((i) => ({ x: 492 + i * 24, y: obs.y - 22 }));

  // The power line from the plant's tower to the substation's pylon (sticky arrangements).
  const plant = places.plant;
  const sub = places.substation;
  const wire =
    below && plant.y === sub.y
      ? `M${plant.x + 50} ${plant.y - 96}Q${(plant.x + sub.x) / 2} ${plant.y - 70} ${sub.x - 52} ${sub.y - 100}`
      : null;

  return (
    <g className="worlds-details" aria-hidden="true">
      {arrangement.grounds.map((ground) => (
        <g key={ground.id} className={`wd-${ground.district}`} data-detail={ground.id}>
          {signLayout(ground, ground.sign && dict.worlds.districts[ground.sign], arrangement)
            .decor && <Decor ground={ground} />}
          {ground.id === 'energy' && wire && (
            <>
              <path id="worlds-powerline" className="worlds-wire" d={wire} />
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  className="wb-accent"
                  data-ambient="pulse"
                  r="6"
                  cx="0"
                  cy="0"
                  opacity="0"
                />
              ))}
            </>
          )}
        </g>
      ))}
      <g className={`wd-${groundOf(arrangement, 'ai')?.district ?? 'ai'}`} data-signs="">
        {signs.map((sign, i) => (
          <g key={i} transform={`translate(${sign.x} ${sign.y})`}>
            <rect className="wb-dark" x="-1.5" y="10" width="3" height="16" />
            <rect className="wb-accent" x="-12" y="0" width="24" height="14" />
            <path className="wb-window" d="M-8 14l8-14h5l-8 14zM4 14l8-14v5l-5 9z" />
          </g>
        ))}
      </g>
      <g className="wd-cement" data-pin="">
        <path className="wb-accent" d={`M${marker.x} ${marker.y}l-8 -13a10 10 0 1 1 16 0z`} />
        <Badge x={pin.x} y={pin.y} text={pinText} arrangement={arrangement} />
      </g>
    </g>
  );
}

export default Details;
