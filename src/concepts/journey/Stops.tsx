import { cv } from '../../content/cv';
import { formatPeriod, formatYearMonth, jobTitle, t } from '../../content/selectors';
import type { Education, Job, Localized } from '../../content/types';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';
import type { Side } from './route';

interface AnchorProps {
  readonly id: string;
  readonly chapter: Job['chapter'] | 'next';
  readonly fork?: 'a' | 'b' | undefined;
  readonly here?: boolean;
  readonly variant?: 'pin' | 'here' | 'sign' | 'destination';
}

/**
 * The point where the road touches a stop. It is zero-size and never animated (the road is
 * measured from it); the pin drawn on it is what drops in.
 */
function RoadAnchor({ id, chapter, fork, here = false, variant = 'pin' }: AnchorProps) {
  return (
    <span
      className={`journey-anchor journey-anchor--${variant}`}
      data-road-point={id}
      data-road-chapter={chapter}
      data-road-fork={fork}
      data-here={here ? '' : undefined}
      aria-hidden="true"
    >
      {here && <span className="journey-pin__pulse" />}
      <span className="journey-pin reveal">
        {variant === 'sign' ? (
          <svg viewBox="0 0 20 20" focusable="false">
            <circle cx="10" cy="10" r="6" />
          </svg>
        ) : (
          <svg viewBox="0 0 28 36" focusable="false">
            <path d="M14 35C14 35 2 21.5 2 13.5A12 12 0 0 1 26 13.5C26 21.5 14 35 14 35Z" />
            <circle cx="14" cy="13.5" r="4.5" />
          </svg>
        )}
      </span>
    </span>
  );
}

function skillNames(job: Job, lang: 'en' | 'pt'): string[] {
  return job.skills
    .map((id) => cv.skills.find((skill) => skill.id === id))
    .filter((skill) => skill !== undefined)
    .map((skill) => t(skill.name, lang));
}

interface JobStopProps {
  readonly job: Job;
  readonly side: Side;
  readonly fork?: 'a' | 'b';
  readonly here?: boolean;
}

/** A job as a map pin with a signpost card: company · project, dates, role, highlights. */
export function JobStop({ job, side, fork, here = false }: JobStopProps) {
  const { lang, dict } = useLanguage();
  const skills = skillNames(job, lang);
  return (
    <article
      className={`journey-stop${here ? ' journey-stop--here' : ''}`}
      id={`job-${job.id}`}
      data-job={job.id}
      data-stop=""
      data-side={side}
    >
      <RoadAnchor
        id={job.id}
        chapter={job.chapter}
        fork={fork}
        here={here}
        variant={here ? 'here' : 'pin'}
      />
      <div className="journey-card reveal">
        <header className="journey-signpost">
          {here && <p className="journey-here">{dict.journey.youAreHere}</p>}
          <h3>{jobTitle(job, lang)}</h3>
          <p className="journey-signpost__meta">{formatPeriod(job, lang)}</p>
          {job.role && (
            <p className="journey-signpost__meta">
              <span className="visually-hidden">{dict.story.role}: </span>
              {t(job.role, lang)}
            </p>
          )}
        </header>
        <ul className="journey-card__highlights">
          {job.highlights.map((highlight) => (
            <li key={highlight.en}>{t(highlight, lang)}</li>
          ))}
        </ul>
        {skills.length > 0 &&
          (here ? (
            <ul className="journey-tags" aria-label={dict.story.skillsUsed}>
              {skills.map((name) => (
                <li key={name} className="journey-tag">
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="journey-card__skills">
              <span className="visually-hidden">{dict.story.skillsUsed}: </span>
              {skills.join(' · ')}
            </p>
          ))}
      </div>
    </article>
  );
}

/** The Computer Science degree: a landmark flag beside the road, not a stop on it. */
export function Landmark({ entry, side }: { readonly entry: Education; readonly side: Side }) {
  const { lang, dict } = useLanguage();
  const status = entry.graduated
    ? format(dict.story.graduated, { date: formatYearMonth(entry.graduated, lang) })
    : dict.story.inProgress;
  return (
    <article
      className="journey-stop journey-landmark"
      data-education={entry.id}
      data-stop=""
      data-side={side}
    >
      <span className="journey-flag" aria-hidden="true">
        <span className="journey-pin reveal">
          <svg viewBox="0 0 28 40" focusable="false">
            <path className="journey-flag__pole" d="M5 2V39" />
            <path className="journey-flag__cloth" d="M6 3H25L20 10L25 17H6Z" />
          </svg>
        </span>
      </span>
      <div className="journey-card reveal">
        <p className="journey-kicker">{dict.story.education}</p>
        <h3>{t(entry.title, lang)}</h3>
        <p className="journey-signpost__meta">
          {entry.institution} · {status}
        </p>
      </div>
    </article>
  );
}

/** A signpost on the dotted road ahead: one AI topic, "In progress". */
export function Signpost({
  topic,
  index,
  side,
}: {
  readonly topic: Localized;
  readonly index: number;
  readonly side: Side;
}) {
  const { lang, dict } = useLanguage();
  return (
    <li className="journey-stop journey-sign" data-stop="" data-side={side}>
      <RoadAnchor id={`topic-${index}`} chapter="next" variant="sign" />
      <div className="journey-card journey-card--sign reveal">
        <p className="journey-sign__title">{t(topic, lang)}</p>
        <p className="journey-progress">{dict.story.inProgress}</p>
      </div>
    </li>
  );
}

/** The end of the road: the postgraduate course, under a dotted horizon. */
export function Destination({ entry }: { readonly entry: Education }) {
  const { lang, dict } = useLanguage();
  return (
    <article
      className="journey-stop journey-destination"
      data-education={entry.id}
      data-stop=""
      data-side="center"
    >
      <span className="journey-horizon" aria-hidden="true" />
      <RoadAnchor id={entry.id} chapter="next" variant="destination" />
      <div className="journey-card journey-card--destination reveal">
        <p className="journey-kicker">{dict.journey.destination}</p>
        <h3>{t(entry.title, lang)}</h3>
        <p className="journey-signpost__meta">
          {entry.institution} · <span className="journey-progress">{dict.story.inProgress}</span>
        </p>
      </div>
    </article>
  );
}
