import { cv } from '../../content/cv';
import { formatPeriod, jobTitle, t } from '../../content/selectors';
import type { Job } from '../../content/types';
import { useLanguage } from '../../i18n/context';

export function JobCard({ job }: { readonly job: Job }) {
  const { lang, dict } = useLanguage();
  const skillNames = job.skills
    .map((id) => cv.skills.find((skill) => skill.id === id))
    .filter((skill) => skill !== undefined)
    .map((skill) => t(skill.name, lang));

  return (
    <article className="job reveal" id={`job-${job.id}`} data-job={job.id}>
      <header>
        <h3>{jobTitle(job, lang)}</h3>
        <p className="job__period">{formatPeriod(job, lang)}</p>
        {job.role && (
          <p className="job__role">
            <span className="visually-hidden">{dict.story.role}: </span>
            {t(job.role, lang)}
          </p>
        )}
      </header>
      <ul>
        {job.highlights.map((highlight) => (
          <li key={highlight.en}>{t(highlight, lang)}</li>
        ))}
      </ul>
      {skillNames.length > 0 && (
        <p className="job__skills">
          <span className="visually-hidden">{dict.story.skillsUsed}: </span>
          {skillNames.join(' · ')}
        </p>
      )}
    </article>
  );
}
