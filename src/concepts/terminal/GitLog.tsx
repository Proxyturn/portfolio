import { jobTitle, t } from '../../content/selectors';
import type { Education, Job } from '../../content/types';
import { useLanguage } from '../../i18n/context';
import { COMMIT_TYPE, DEGREE_TAG, EDITOR_TAB, EXTRA_COMMITS, OPS_LOG } from './code';
import { Line, Period } from './parts';

/** One `git log career` entry: subject with real dates, the CV highlights as the body. */
export function Commit({ job }: { readonly job: Job }) {
  const { lang, dict } = useLanguage();
  const type = COMMIT_TYPE[job.id];
  const ops = OPS_LOG[job.id];
  const extra = EXTRA_COMMITS[job.id] ?? [];

  return (
    <article className="term-commit" id={`job-${job.id}`} data-job={job.id} data-reveal-group="">
      <h3 className="term-row term-commit__subject">
        <Line>
          {type && (
            <>
              <code lang="en" className="term-commit__type">
                {type}
              </code>{' '}
            </>
          )}
          <span className="term-commit__title">{jobTitle(job, lang)}</span>{' '}
          <Period start={job.start} end={job.end} />
        </Line>
      </h3>
      {extra.map((subject) => (
        <p key={subject} className="term-row term-commit__subject term-commit__subject--extra">
          <Line>
            <code lang="en">{subject}</code>
          </Line>
        </p>
      ))}
      {job.role && (
        <p className="term-row term-commit__role">
          <Line>
            <span className="visually-hidden">{dict.story.role}: </span>
            {t(job.role, lang)}
          </Line>
        </p>
      )}
      {ops ? (
        <>
          {/* The log restates the CV highlights as code (English in both languages), so
              assistive tech gets the highlights themselves, in the visitor's language. */}
          <ul className="term-commit__body term-ops" lang="en" aria-hidden="true">
            {ops.map(([key, value]) => (
              <li key={`${key} ${value ?? ''}`} className="term-row">
                <Line>
                  <span className="term-ops__key">{key}</span>
                  {value && ` ${value}`}
                </Line>
              </li>
            ))}
          </ul>
          <ul className="visually-hidden">
            {job.highlights.map((highlight) => (
              <li key={highlight.en}>{t(highlight, lang)}</li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="term-commit__body">
          {job.highlights.map((highlight) => (
            <li key={highlight.en} className="term-row">
              <Line>{t(highlight, lang)}</Line>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** The degree as a tag in the log: `(tag: v1.0.0)`. */
export function TagEntry({ entry }: { readonly entry: Education }) {
  const { lang } = useLanguage();
  return (
    <article
      className="term-commit term-commit--tag"
      data-education={entry.id}
      data-reveal-group=""
    >
      <h3 className="term-row term-commit__subject">
        <Line>
          <code lang="en" className="term-tag">
            ({DEGREE_TAG})
          </code>{' '}
          <span className="term-commit__title">
            {t(entry.title, lang)} · {entry.institution}
          </span>
          {entry.graduated && (
            <>
              {' '}
              <Period start={entry.graduated} />
            </>
          )}
        </Line>
      </h3>
    </article>
  );
}

/** One pane of the split editor in Breadth, with its tab. */
export function EditorPane({ job }: { readonly job: Job }) {
  const { lang } = useLanguage();
  return (
    <article className="term-pane" id={`job-${job.id}`} data-job={job.id} data-reveal-group="">
      <p className="term-pane__tab" lang="en">
        {EDITOR_TAB[job.id] ?? job.id}
      </p>
      <div className="term-pane__code">
        <h3 className="term-row term-pane__title">
          <Line>
            <span className="term-pane__slashes" aria-hidden="true">
              {'// '}
            </span>
            {jobTitle(job, lang)} <Period start={job.start} end={job.end} />
          </Line>
        </h3>
        <ol className="term-pane__lines">
          {job.highlights.map((highlight) => (
            <li key={highlight.en} className="term-row">
              <Line>{t(highlight, lang)}</Line>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
