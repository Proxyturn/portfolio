import { useState } from 'react';
import { SkillsExplorer } from '../../components/SkillsExplorer';
import { cv } from '../../content/cv';
import { jobsUsingSkill, t } from '../../content/selectors';
import type { Job, SkillId } from '../../content/types';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';
import { stopLabel } from './route';

/**
 * Mini route overview: every stop in story order, with the ones that used the chosen skill
 * highlighted. Visual only; the same result is written as text in SkillsExplorer's live region.
 */
export function MiniRoute({
  stops,
  selected,
}: {
  readonly stops: readonly Job[];
  readonly selected: SkillId | null;
}) {
  const matches = new Set(selected ? jobsUsingSkill(selected).map((job) => job.id) : []);
  return (
    <ol className="journey-miniroute" aria-hidden="true" data-selected={selected ?? undefined}>
      {stops.map((job) => (
        <li
          key={job.id}
          className="journey-miniroute__stop"
          data-stop-id={job.id}
          data-match={matches.has(job.id) ? 'true' : 'false'}
        >
          <span className="journey-miniroute__dot" />
          <span className="journey-miniroute__label">{stopLabel(job)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Toolbox as an open glovebox: luggage-tag skills, travel log, phrasebook. */
export function Toolbox({ stops }: { readonly stops: readonly Job[] }) {
  const { lang, dict } = useLanguage();
  const [selected, setSelected] = useState<SkillId | null>(null);
  return (
    <>
      <div className="journey-glovebox">
        <p className="journey-glovebox__label">{dict.journey.glovebox}</p>
        <div className="journey-glovebox__inside">
          <SkillsExplorer onChange={setSelected} />
          <MiniRoute stops={stops} selected={selected} />
        </div>
      </div>

      <div className="journey-papers">
        <div className="journey-log">
          <h3>{dict.journey.travelLog}</h3>
          <p className="journey-papers__sub">{dict.story.certifications}</p>
          <ol className="journey-log__entries">
            {cv.certifications.map((cert) => (
              <li key={cert.id}>
                <span className="journey-log__title">{t(cert.title, lang)}</span>
                {cert.hours !== undefined && (
                  <span className="journey-log__hours">
                    {format(dict.story.hours, { hours: cert.hours })}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="journey-phrasebook">
          <h3>{dict.journey.phrasebook}</h3>
          <p className="journey-papers__sub">{dict.story.spokenLanguages}</p>
          <dl className="journey-phrasebook__entries">
            {cv.spokenLanguages.map((language) => (
              <div key={language.id}>
                <dt>{t(language.name, lang)}</dt>
                <dd>{dict.story.fluency[language.fluency]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  );
}
