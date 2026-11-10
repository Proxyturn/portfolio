import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChapterSection } from '../../components/ChapterSection';
import { ContactSection } from '../../components/contact/ContactSection';
import { elementForHash, jumpTargetFor } from '../../components/jump';
import { SkillsExplorer } from '../../components/SkillsExplorer';
// import { Avatar } from '../../components/Avatar';
import { cv } from '../../content/cv';
import { jobsChronological, t } from '../../content/selectors';
import type { ChapterId } from '../../content/types';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';
import type { Dictionary } from '../../i18n/types';
import { ScrollTrigger } from '../../motion/gsap';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useScrollScene } from '../../motion/useScrollScene';
import type { CameraHandle } from './camera';
import { WorldsEducation, WorldsJob } from './Cards';
import { STICKY_QUERY, useMediaQuery } from './useMediaQuery';
import { WORLD_MAP_ID, WorldMap } from './WorldMap';
import { LANDSCAPE, PORTRAIT, type DistrictId } from './world';
import './fonts.css';
import './worlds.css';

type Scene = typeof import('./camera');

/** Loads the camera code only when it can run (sticky layout, motion allowed). */
function useLazyScene(enabled: boolean): Scene | null {
  const [scene, setScene] = useState<Scene | null>(null);
  useEffect(() => {
    if (!enabled || scene) return undefined;
    let active = true;
    import('./camera')
      .then((mod) => {
        if (active) setScene(mod);
      })
      .catch(() => {
        // Chunk failed to load (offline, navigation mid-load): the map stays a still, whole
        // world, which is complete and fully usable.
      });
    return () => {
      active = false;
    };
  }, [enabled, scene]);
  return enabled ? scene : null;
}

/**
 * A deep link lands before the web fonts swap in; the swap reflows the text above the target
 * (measured: about 25 px lower on a 4,000 px page), so the heading drifts off its scroll margin.
 * When the fonts are ready and nobody has scrolled since, land on the hash's target again.
 * Only after the shared load jump actually ran (focus is on the target): when the browser
 * restored a scroll position instead, that position wins, as in jump.ts.
 * (Proposed for the shared jump helper on main; kept local to the spike.)
 */
function useReanchorAfterFonts(): void {
  useEffect(() => {
    if (!('fonts' in document)) return undefined;
    const hash = window.location.hash;
    const element = elementForHash(hash);
    const target = element ? jumpTargetFor(element) : null;
    let active = !!target && target.contains(document.activeElement);
    // Any input means the visitor has taken over; scroll anchoring may still move scrollY.
    const INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const stop = () => {
      active = false;
    };
    for (const type of INPUT) window.addEventListener(type, stop, { passive: true, once: true });
    void document.fonts.ready.then(() => {
      if (!active || window.location.hash !== hash) return;
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return () => {
      active = false;
      for (const type of INPUT) window.removeEventListener(type, stop);
    };
  }, []);
}

type DistrictName = keyof Dictionary['worlds']['districts'];

/** Each chapter's palette and the district name shown above its heading. */
const CHAPTER_DISTRICT: Readonly<
  Record<ChapterId, { palette: DistrictId; name: DistrictName | null }>
> = {
  hook: { palette: 'neutral', name: null },
  origins: { palette: 'industrial', name: 'industrial' },
  enterprise: { palette: 'banking', name: 'banking' },
  energy: { palette: 'energy', name: 'energy' },
  breadth: { palette: 'corporate', name: 'corporate' },
  now: { palette: 'cement', name: 'cement' },
  next: { palette: 'ai', name: 'ai' },
  toolbox: { palette: 'neutral', name: 'workshop' },
  contact: { palette: 'neutral', name: 'postOffice' },
};

/**
 * Worlds version 2: a small, clickable world (docs/STORYBOARDS.md, section 3). SPIKE: real
 * structure and data, placeholder art, no ambient touches, halos or vignettes yet.
 */
export function WorldsStory() {
  const { lang, dict } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const sticky = useMediaQuery(STICKY_QUERY);
  const reduced = useReducedMotion();
  const cameraOn = sticky && !reduced;
  const scene = useLazyScene(cameraOn);
  const camera = useRef<CameraHandle | null>(null);
  const keyboardInMap = useRef(false);

  useScrollScene(
    root,
    (scope) => {
      camera.current = scene ? scene.startCamera(scope, () => keyboardInMap.current) : null;
    },
    [scene],
  );

  useReanchorAfterFonts();

  // Text reflows when the language changes: re-measure the chapter positions.
  useEffect(() => {
    if (scene) ScrollTrigger.refresh();
  }, [lang, scene]);

  const chronological = jobsChronological();
  const jobsIn = (chapter: ChapterId) => chronological.filter((job) => job.chapter === chapter);
  const educationIn = (chapter: ChapterId) =>
    cv.education.filter((entry) => entry.chapter === chapter);

  const chapter = (id: Exclude<ChapterId, 'hook'>, children: ReactNode) => {
    const district = CHAPTER_DISTRICT[id];
    return (
      <ChapterSection id={id} className={`worlds-chapter wd-${district.palette}`}>
        {district.name && <p className="worlds-district">{dict.worlds.districts[district.name]}</p>}
        <div className="worlds-entries">{children}</div>
        <a className="worlds-back" href={`#${WORLD_MAP_ID}`}>
          {dict.worlds.backToMap}
        </a>
      </ChapterSection>
    );
  };

  return (
    <div ref={root} className="worlds">
      <div className="worlds__stage">
        <WorldMap
          arrangement={sticky ? LANDSCAPE : PORTRAIT}
          onKeyboardFocus={(inside) => {
            keyboardInMap.current = inside;
            camera.current?.update();
          }}
        />
      </div>

      <div className="worlds__panels">
        <ChapterSection id="hook" hideTitle className="worlds-chapter worlds-hook wd-neutral">
          {/* <Avatar /> */}
          <p className="worlds-district">{dict.worlds.title}</p>
          <h1 tabIndex={-1}>{cv.identity.name}</h1>
          <p className="worlds-hook__role">
            {t(cv.role, lang)} · {t(cv.identity.location, lang)}
          </p>
          <p className="worlds-hook__line">{t(cv.hook, lang)}</p>
          {cv.summary.map((paragraph) => (
            <p key={paragraph.en} className="worlds-hook__summary">
              {t(paragraph, lang)}
            </p>
          ))}
          <p className="worlds-hook__hint">{dict.worlds.hint}</p>
          <a className="button worlds-hook__start" href="#origins">
            {dict.worlds.startExploring}
          </a>
        </ChapterSection>

        {chapter(
          'origins',
          <>
            {jobsIn('origins').map((job) => (
              <WorldsJob key={job.id} job={job} />
            ))}
            {educationIn('origins').map((entry) => (
              <WorldsEducation key={entry.id} entry={entry} />
            ))}
          </>,
        )}

        {chapter(
          'enterprise',
          jobsIn('enterprise').map((job) =>
            job.sector ? (
              <WorldsJob key={job.id} job={job} />
            ) : (
              // ATOS Jan–Jun 2023: the CV names no client or sector, so it keeps the neutral
              // "Between worlds" panel (answer 4), even inside the banking chapter.
              <WorldsJob
                key={job.id}
                job={job}
                className="worlds-card--own wd-between"
                eyebrow={dict.worlds.districts.betweenWorlds}
              />
            ),
          ),
        )}

        {chapter(
          'energy',
          jobsIn('energy').map((job) => <WorldsJob key={job.id} job={job} />),
        )}
        {chapter(
          'breadth',
          jobsIn('breadth').map((job) => <WorldsJob key={job.id} job={job} />),
        )}
        {chapter(
          'now',
          jobsIn('now').map((job) => <WorldsJob key={job.id} job={job} />),
        )}
        {chapter(
          'next',
          educationIn('next').map((entry) => <WorldsEducation key={entry.id} entry={entry} />),
        )}

        {chapter(
          'toolbox',
          <>
            <SkillsExplorer />
            <div className="worlds-card">
              <h3>{dict.story.certifications}</h3>
              <ul>
                {cv.certifications.map((cert) => (
                  <li key={cert.id}>
                    {t(cert.title, lang)}
                    {cert.hours !== undefined &&
                      ` (${format(dict.story.hours, { hours: cert.hours })})`}
                  </li>
                ))}
              </ul>
            </div>
            <div className="worlds-card">
              <h3>{dict.story.spokenLanguages}</h3>
              <ul>
                {cv.spokenLanguages.map((language) => (
                  <li key={language.id}>
                    {t(language.name, lang)}: {dict.story.fluency[language.fluency]}
                  </li>
                ))}
              </ul>
            </div>
          </>,
        )}

        {chapter('contact', <ContactSection />)}
      </div>
    </div>
  );
}
