import { useId, useState } from 'react';
import { cv } from '../content/cv';
import { formatPeriod, jobTitle, jobsUsingSkill, t } from '../content/selectors';
import type { SkillGroup, SkillId } from '../content/types';
import { useLanguage } from '../i18n/context';

const GROUPS: readonly SkillGroup[] = ['languages', 'frameworks', 'concepts'];

/**
 * Filterable skills view: choosing a skill lists the jobs whose CV entry names it.
 * Concepts restyle it through the `.skills*` classes and theme tokens.
 */
export function SkillsExplorer() {
  const { lang, dict } = useLanguage();
  const [selected, setSelected] = useState<SkillId | null>(null);
  const resultId = useId();
  const jobs = selected ? jobsUsingSkill(selected) : [];
  const selectedSkill = cv.skills.find((skill) => skill.id === selected);

  return (
    <div className="skills">
      {GROUPS.map((group) => (
        <div key={group} className="skills__group">
          <h3>{dict.story.skillGroups[group]}</h3>
          <ul className="skills__list">
            {cv.skills
              .filter((skill) => skill.group === group)
              .map((skill) => (
                <li key={skill.id}>
                  <button
                    type="button"
                    className="skills__chip"
                    aria-pressed={selected === skill.id}
                    aria-controls={resultId}
                    onClick={() => {
                      setSelected((current) => (current === skill.id ? null : skill.id));
                    }}
                  >
                    {t(skill.name, lang)}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}

      <div id={resultId} className="skills__result" aria-live="polite">
        {!selectedSkill ? (
          <p>{dict.story.skillPrompt}</p>
        ) : jobs.length === 0 ? (
          <p>
            <strong>{t(selectedSkill.name, lang)}</strong>: {dict.story.skillNoJob}
          </p>
        ) : (
          <>
            <p>
              <strong>{t(selectedSkill.name, lang)}</strong> · {dict.story.skillUsedIn}:
            </p>
            <ul>
              {jobs.map((job) => (
                <li key={job.id}>
                  <a href={`#job-${job.id}`}>{jobTitle(job, lang)}</a> ({formatPeriod(job, lang)})
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
