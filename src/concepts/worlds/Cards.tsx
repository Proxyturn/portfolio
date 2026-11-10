import type { ReactNode } from 'react';
import { cv } from '../../content/cv';
import { formatPeriod, formatYearMonth, jobTitle, t } from '../../content/selectors';
import type { Education, Job } from '../../content/types';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';

/**
 * Minimal Worlds entries. They keep the jump contract (`id` + `data-job` / `data-education`
 * and a `tabIndex={-1}` heading). `eyebrow` is visible text above the heading, used by the
 * neutral "Between worlds" panel; `className` lets a card carry its own district palette.
 */
export function WorldsJob({
  job,
  eyebrow,
  className = '',
}: {
  readonly job: Job;
  readonly eyebrow?: ReactNode;
  readonly className?: string;
}) {
  const { lang, dict } = useLanguage();
  const skills = job.skills
    .map((id) => cv.skills.find((skill) => skill.id === id))
    .filter((skill) => skill !== undefined)
    .map((skill) => t(skill.name, lang));
  return (
    <article className={`worlds-card ${className}`} id={`job-${job.id}`} data-job={job.id}>
      {eyebrow && <p className="worlds-card__eyebrow">{eyebrow}</p>}
      <h3 tabIndex={-1}>{jobTitle(job, lang)}</h3>
      <p className="worlds-card__meta">{formatPeriod(job, lang)}</p>
      {job.role && (
        <p className="worlds-card__meta">
          <span className="visually-hidden">{dict.story.role}: </span>
          {t(job.role, lang)}
        </p>
      )}
      <ul>
        {job.highlights.map((highlight) => (
          <li key={highlight.en}>{t(highlight, lang)}</li>
        ))}
      </ul>
      {skills.length > 0 && (
        <p className="worlds-card__skills">
          <span className="visually-hidden">{dict.story.skillsUsed}: </span>
          {skills.join(' · ')}
        </p>
      )}
    </article>
  );
}

export function WorldsEducation({ entry }: { readonly entry: Education }) {
  const { lang, dict } = useLanguage();
  const status = entry.graduated
    ? format(dict.story.graduated, { date: formatYearMonth(entry.graduated, lang) })
    : dict.story.inProgress;
  return (
    <article className="worlds-card" id={`edu-${entry.id}`} data-education={entry.id}>
      <h3 tabIndex={-1}>{t(entry.title, lang)}</h3>
      <p className="worlds-card__meta">
        {entry.institution} · {status}
      </p>
      {entry.topics && (
        <ul>
          {entry.topics.map((topic) => (
            <li key={topic.en}>{t(topic, lang)}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
