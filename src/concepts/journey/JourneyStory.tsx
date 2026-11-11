import { useEffect, useRef, useState } from 'react';
import { ChapterSection } from '../../components/ChapterSection';
import { ContactSection } from '../../components/contact/ContactSection';
// import { Avatar } from '../../components/Avatar';
import { cv } from '../../content/cv';
import { t } from '../../content/selectors';
import type { Job } from '../../content/types';
import { useLanguage } from '../../i18n/context';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useScrollScene } from '../../motion/useScrollScene';
import { Road } from './Road';
import { routeStops, sideOf, type JobChapter } from './route';
import { Destination, JobStop, Landmark, Signpost } from './Stops';
import { Terrain } from './Terrain';
import { Toolbox } from './Toolbox';
import { useRoadGeometry } from './useRoadGeometry';
import './fonts.css';
import './journey.css';

type Scene = typeof import('./scene');

/** Loads the scroll-scene code (GSAP MotionPath and the timelines) only when motion is allowed. */
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
        // Chunk failed to load (offline, or the page navigated away mid-load): the story stays
        // in its resting state, which is complete and fully visible.
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, scene]);
  return enabled ? scene : null;
}

/**
 * Journey / road trip. The CV is a road on an old printed map: each job is a pin, the road
 * draws itself as you scroll, and a traveler drives it up to "You are here".
 */
export function JourneyStory() {
  const { lang, dict } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const scene = useLazyScene(!reduced);
  const geometry = useRoadGeometry(root, lang);

  const stops = routeStops();
  const degree = cv.education.find((entry) => entry.chapter === 'origins');
  const course = cv.education.find((entry) => entry.chapter === 'next');

  useScrollScene(
    root,
    (scope) => {
      scene?.revealStops(scope);
    },
    [scene],
  );
  useScrollScene(
    root,
    (scope) => {
      if (geometry) scene?.driveRoad(scope, geometry);
    },
    [scene, geometry],
  );

  const stopsIn = (chapter: JobChapter) => stops.filter((job) => job.chapter === chapter);
  const indexOf = (job: Job) => stops.indexOf(job);
  const breadth = stopsIn('breadth');
  const isFork = breadth.length === 2;
  const lastIndex = stops.length - 1;

  const renderStops = (chapter: JobChapter) =>
    stopsIn(chapter).map((job) => (
      <JobStop key={job.id} job={job} side={sideOf(indexOf(job))} here={chapter === 'now'} />
    ));

  return (
    <div ref={root} className="journey">
      <Terrain />
      <Road geometry={geometry} />

      <div className="journey-inner">
        <ChapterSection id="hook" hideTitle className="journey-chapter journey-hook">
          <div className="journey-cover">
            {/* <Avatar /> */}
            <h1 className="journey-cover__title" tabIndex={-1}>
              {cv.identity.name}
            </h1>
            <p className="journey-cover__legend">
              {t(cv.role, lang)} · {t(cv.identity.location, lang)}
            </p>
            <p className="journey-cover__subtitle">{t(cv.hook, lang)}</p>
            <div className="journey-cover__legendbox">
              {cv.summary.map((paragraph) => (
                <p key={paragraph.en}>{t(paragraph, lang)}</p>
              ))}
            </div>
            <a className="journey-cover__cue" href="#origins">
              {dict.journey.startTrip}
              <span className="journey-cover__arrow" aria-hidden="true">
                ↓
              </span>
            </a>
          </div>
        </ChapterSection>

        <ChapterSection id="origins" className="journey-chapter">
          <div className="journey-route">
            <div className="journey-row">
              {renderStops('origins')}
              {degree && <Landmark entry={degree} side="right" />}
            </div>
          </div>
        </ChapterSection>

        <ChapterSection id="enterprise" className="journey-chapter journey-chapter--highway">
          <div className="journey-route">{renderStops('enterprise')}</div>
        </ChapterSection>

        <ChapterSection id="energy" className="journey-chapter journey-chapter--energy">
          <div className="journey-route">{renderStops('energy')}</div>
        </ChapterSection>

        <ChapterSection id="breadth" className="journey-chapter">
          <div className="journey-route">
            {isFork ? (
              <div className="journey-row journey-row--fork">
                {breadth.map((job, i) => (
                  <JobStop
                    key={job.id}
                    job={job}
                    side={i === 0 ? 'left' : 'right'}
                    fork={i === 0 ? 'a' : 'b'}
                  />
                ))}
              </div>
            ) : (
              renderStops('breadth')
            )}
          </div>
        </ChapterSection>

        <ChapterSection id="now" className="journey-chapter">
          <div className="journey-route">{renderStops('now')}</div>
        </ChapterSection>

        <ChapterSection id="next" className="journey-chapter journey-chapter--next">
          <div className="journey-route">
            <ol className="journey-signs">
              {(course?.topics ?? []).map((topic, i) => (
                <Signpost key={topic.en} topic={topic} index={i} side={sideOf(lastIndex + 1 + i)} />
              ))}
            </ol>
            {course && <Destination entry={course} />}
          </div>
        </ChapterSection>

        <ChapterSection id="toolbox" className="journey-chapter">
          <Toolbox stops={stops} />
        </ChapterSection>

        <ChapterSection id="contact" className="journey-chapter">
          <div className="journey-postcard">
            <div className="journey-postcard__card">
              <p className="journey-postcard__title">{dict.journey.sendPostcard}</p>
              <ContactSection cvLabel={dict.journey.takeTheMap} />
            </div>
          </div>
        </ChapterSection>
      </div>
    </div>
  );
}
