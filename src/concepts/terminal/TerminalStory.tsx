import { useEffect, useRef, useState } from 'react';
import { ChapterSection } from '../../components/ChapterSection';
// import { Avatar } from '../../components/Avatar';
import { cv } from '../../content/cv';
import { formatPeriod, jobTitle, jobsChronological, t } from '../../content/selectors';
import type { ChapterId, Job } from '../../content/types';
import { useLanguage } from '../../i18n/context';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useScrollScene } from '../../motion/useScrollScene';
import { CMD, INCIDENT, RESOLVED, STACK_LINE } from './code';
import { Commit, EditorPane, TagEntry } from './GitLog';
import { Arrow, Cmd, Line, Window } from './parts';
import { TerminalContact, Toolbox } from './Toolbox';
import { useMediaQuery } from './useMediaQuery';
import './fonts.css';
import './terminal.css';

type Scene = typeof import('./scene');

/** Below this width the "Now" window is not pinned; its output simply scrolls. */
export const PIN_QUERY = '(min-width: 768px)';

/** Loads the scroll-scene code only when motion is allowed. */
function useLazyScene(enabled: boolean): Scene | null {
  const [scene, setScene] = useState<Scene | null>(null);
  useEffect(() => {
    if (!enabled || scene) return undefined;
    let active = true;
    import('./scene').then(
      (mod) => {
        if (active) setScene(mod);
      },
      () => {
        // The chunk failed to load (offline, or the page navigated away): the story stays in
        // its resting state, which is complete and fully visible.
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, scene]);
  return enabled ? scene : null;
}

/** The highlight the incident pair illustrates ("Respond rapidly to incidents…"). */
function incidentIndex(job: Job): number {
  return job.highlights.findIndex((highlight) => /incident/i.test(highlight.en));
}

/** `$ tail -f semantix.log`: the current job as a live log. */
function NowLog({ job }: { readonly job: Job }) {
  const { lang } = useLanguage();
  const incident = incidentIndex(job);
  return (
    <article
      className="term-now__entry"
      id={`job-${job.id}`}
      data-job={job.id}
      data-reveal-group=""
    >
      <h3 className="term-row term-now__title" tabIndex={-1}>
        <Line>{jobTitle(job, lang)}</Line>
      </h3>
      <p className="term-row term-now__period">
        <Line>{formatPeriod(job, lang)}</Line>
      </p>
      <ol className="term-log">
        {job.highlights.map((highlight, i) => (
          <li key={highlight.en} className="term-row term-log__line">
            <Line scrub>
              {i === incident && (
                <>
                  <code lang="en" className="term-incident">
                    {INCIDENT}
                  </code>
                  <Arrow />
                  <code lang="en" className="term-resolved">
                    {RESOLVED}
                  </code>{' '}
                </>
              )}
              <span>{t(highlight, lang)}</span>
            </Line>
          </li>
        ))}
        <li className="term-row term-log__line term-log__stack">
          <Line scrub>
            <code lang="en">{STACK_LINE}</code>
          </Line>
        </li>
      </ol>
    </article>
  );
}

/**
 * Terminal / code world. The CV is a terminal session: a boot screen, `git log career`, a
 * split editor, a pinned `tail -f` window for "Now", a deploy to the future, `man william`
 * and `./contact.sh`. Commands stay in English; descriptions follow the language.
 */
export function TerminalStory() {
  const { lang, dict } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const scene = useLazyScene(!reduced);
  const wide = useMediaQuery(PIN_QUERY);

  useScrollScene(
    root,
    (scope) => {
      scene?.runScene(scope, { pinNow: wide });
    },
    [scene, wide],
  );

  // New text has new line heights: re-measure the triggers (and keep the pin where it is).
  useEffect(() => {
    scene?.refreshScene();
  }, [scene, lang]);

  const jobs = jobsChronological();
  const jobsIn = (chapter: ChapterId) => jobs.filter((job) => job.chapter === chapter);
  const degree = cv.education.find((entry) => entry.chapter === 'origins');
  const course = cv.education.find((entry) => entry.chapter === 'next');
  const nowChapter = cv.chapters.find((chapter) => chapter.id === 'now');

  return (
    <div ref={root} className="terminal">
      <ChapterSection id="hook" hideTitle className="term-chapter term-hook">
        {/* <Avatar /> */}
        <Window className="term-window--boot">
          <Cmd command={CMD.whoami} />
          <h1 className="term-row term-out term-hook__name" tabIndex={-1}>
            <Line>{cv.identity.name}</Line>
          </h1>
          <Cmd command={CMD.role} />
          <p className="term-row term-out">
            <Line>
              {t(cv.role, lang)} · {t(cv.identity.location, lang)}
            </Line>
          </p>
          <div className="term-row term-motd">
            <Line block>
              <p className="term-motd__label">{dict.terminal.motd}</p>
              <p className="term-motd__text">{t(cv.hook, lang)}</p>
            </Line>
          </div>
          <Cmd command={CMD.readme} />
          <div className="term-row term-readme">
            <Line block>
              {cv.summary.map((paragraph) => (
                <p key={paragraph.en}>{t(paragraph, lang)}</p>
              ))}
            </Line>
          </div>
        </Window>
      </ChapterSection>

      <ChapterSection id="origins" className="term-chapter">
        <Window className="term-window--log" cursor={false}>
          <Cmd command={CMD.log} />
          <div className="term-graph">
            {jobsIn('origins').map((job) => (
              <Commit key={job.id} job={job} />
            ))}
            {degree && <TagEntry entry={degree} />}
          </div>
        </Window>
      </ChapterSection>

      <ChapterSection id="enterprise" className="term-chapter">
        <Window className="term-window--log term-window--continued" cursor={false}>
          <div className="term-graph">
            {jobsIn('enterprise').map((job) => (
              <Commit key={job.id} job={job} />
            ))}
          </div>
        </Window>
      </ChapterSection>

      <ChapterSection id="energy" className="term-chapter">
        <Window className="term-window--log term-window--continued">
          <div className="term-graph">
            {jobsIn('energy').map((job) => (
              <Commit key={job.id} job={job} />
            ))}
          </div>
        </Window>
      </ChapterSection>

      <ChapterSection id="breadth" className="term-chapter">
        <div className="term-editor">
          {jobsIn('breadth').map((job) => (
            <EditorPane key={job.id} job={job} />
          ))}
        </div>
      </ChapterSection>

      {/* The title lives inside the stage, so it stays with the window while it is pinned. */}
      <ChapterSection id="now" hideTitle className="term-chapter term-now">
        <div className="term-now__stage" data-now-stage="">
          {nowChapter && (
            <h2 id="now-title" className="term-now__heading" tabIndex={-1}>
              {t(nowChapter.title, lang)}
            </h2>
          )}
          <Window className="term-window--log">
            <Cmd command={CMD.tail} />
            {jobsIn('now').map((job) => (
              <NowLog key={job.id} job={job} />
            ))}
          </Window>
        </div>
      </ChapterSection>

      <ChapterSection id="next" className="term-chapter">
        <Window>
          <Cmd command={CMD.checkout} />
          {course && (
            <div
              className="term-branch"
              id={`edu-${course.id}`}
              data-education={course.id}
              data-reveal-group=""
            >
              <h3 className="term-row term-branch__title" tabIndex={-1}>
                <Line>
                  {t(course.title, lang)} · {course.institution}
                </Line>
              </h3>
              <ul className="term-todo">
                {(course.topics ?? []).map((topic) => (
                  <li key={topic.en} className="term-row">
                    <Line>
                      <span className="term-todo__box" aria-hidden="true">
                        [ ]
                      </span>{' '}
                      {t(topic, lang)}{' '}
                      <span className="term-todo__status">{dict.story.inProgress}</span>
                    </Line>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Cmd command={CMD.deploy} />
          <div className="term-deploy" data-reveal-group="">
            <p className="term-row term-deploy__label">
              <Line>{dict.terminal.deploying}</Line>
            </p>
            <div className="term-deploy__track" aria-hidden="true">
              <div className="term-deploy__fill" />
            </div>
          </div>
        </Window>
      </ChapterSection>

      <ChapterSection id="toolbox" className="term-chapter">
        <Window cursor={false}>
          <Toolbox />
        </Window>
      </ChapterSection>

      <ChapterSection id="contact" className="term-chapter">
        <Window cursor={false}>
          <Cmd command={CMD.contact} />
          <TerminalContact />
        </Window>
      </ChapterSection>
    </div>
  );
}
