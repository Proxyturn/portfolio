import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChapterSection } from '../../components/ChapterSection';
import { ContactSection } from '../../components/contact/ContactSection';
import { elementForHash, jumpTargetFor } from '../../components/jump';
import { SkillsExplorer } from '../../components/SkillsExplorer';
// import { Avatar } from '../../components/Avatar';
import { cv } from '../../content/cv';
import { jobsChronological, jobsUsingSkill, t } from '../../content/selectors';
import type { ChapterId, SkillId } from '../../content/types';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';
import type { Dictionary } from '../../i18n/types';
import { ScrollTrigger } from '../../motion/gsap';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useScrollScene } from '../../motion/useScrollScene';
import { WorldsEducation, WorldsJob } from './Cards';
import type { SceneHandle } from './scene';
import { SPLIT_QUERY, STRIP_QUERY, useMediaQuery, WIDE_OVERVIEW_QUERY } from './useMediaQuery';
import { Vignette } from './Vignette';
import { WORLD_MAP_ID, WorldMap } from './WorldMap';
import {
  buildingsForJobs,
  PORTRAIT,
  SQUARE,
  WIDE,
  type BuildingId,
  type DistrictId,
} from './world';
import './fonts.css';
import './worlds.css';

type Scene = typeof import('./scene');

/** Loads the scene code only when it can run (sticky layout, motion allowed). */
function useLazyScene(enabled: boolean): Scene | null {
  const [scene, setScene] = useState<Scene | null>(null);
  useEffect(() => {
    if (!enabled || scene) return undefined;
    let active = true;
    import('./scene')
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
 * When the fonts are ready and nobody has given any input since, land on the hash's target
 * again. Only when the load jump put the target at its scroll margin: when the browser restored
 * a scroll position instead, that position wins, as in jump.ts.
 * TODO(main): drop this once jump.ts re-applies the landing after the fonts load (shared change
 * in progress on main).
 */
function useReanchorAfterFonts(): void {
  useEffect(() => {
    if (!('fonts' in document)) return undefined;
    const hash = window.location.hash;
    const element = elementForHash(hash);
    const target = element ? jumpTargetFor(element) : null;
    const landed =
      !!target &&
      window.scrollY !== 0 &&
      Math.abs(
        target.getBoundingClientRect().top - parseFloat(getComputedStyle(target).scrollMarginTop),
      ) <= 2;
    let active = landed;
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

/** Each chapter's palette, the district name above its heading, and its overview vignette. */
const CHAPTER_DISTRICT: Readonly<
  Record<
    ChapterId,
    { palette: DistrictId; name: DistrictName | null; vignette: readonly BuildingId[] }
  >
> = {
  hook: { palette: 'neutral', name: null, vignette: [] },
  origins: { palette: 'industrial', name: 'industrial', vignette: ['factory', 'university'] },
  enterprise: { palette: 'banking', name: 'banking', vignette: ['bank', 'plaza'] },
  energy: { palette: 'energy', name: 'energy', vignette: ['plant', 'substation'] },
  breadth: { palette: 'corporate', name: 'corporate', vignette: ['officeLeft', 'officeRight'] },
  now: { palette: 'cement', name: 'cement', vignette: ['cementYard'] },
  next: { palette: 'ai', name: 'ai', vignette: ['observatory'] },
  toolbox: { palette: 'neutral', name: 'workshop', vignette: ['workshop'] },
  contact: { palette: 'neutral', name: 'postOffice', vignette: ['postOffice'] },
};

/**
 * Worlds version 2: a small, clickable world (docs/STORYBOARDS.md, section 3, with William's
 * answers on the spike). Reading order in every layout: the hook (name and intro), then the
 * map, then the chapters. In the split layout the map is placed in the left column by the
 * grid; elsewhere it follows the hook.
 */
export function WorldsStory() {
  const { lang, dict } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const split = useMediaQuery(SPLIT_QUERY);
  const strip = useMediaQuery(STRIP_QUERY);
  const wideOverview = useMediaQuery(WIDE_OVERVIEW_QUERY);
  const reduced = useReducedMotion();
  const arrangement = split ? SQUARE : strip || wideOverview ? WIDE : PORTRAIT;
  const cameraOn = (split || strip) && !reduced;
  const scene = useLazyScene(cameraOn);
  const handle = useRef<SceneHandle | null>(null);
  const keyboardInMap = useRef(false);
  const [skill, setSkill] = useState<SkillId | null>(null);

  const highlighted = useMemo(
    () => new Set(skill ? buildingsForJobs(jobsUsingSkill(skill).map((job) => job.id)) : []),
    [skill],
  );

  useScrollScene(
    root,
    (scope) => {
      handle.current = scene
        ? scene.startScene(scope, arrangement, () => keyboardInMap.current)
        : null;
    },
    [scene, arrangement],
  );

  // When the scene is reverted (layout change, reduced motion, unmount), clear its fade.
  useLayoutEffect(() => {
    const svg = root.current?.querySelector('[data-camera] svg');
    return () => {
      svg?.removeAttribute('data-active');
    };
  }, [scene, arrangement]);

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
        {/* TODO(main): use ChapterSection's `eyebrow` prop once it lands, so the district
            name precedes the heading in the DOM too (today: visually, with CSS order). */}
        {district.name && <p className="worlds-district">{dict.worlds.districts[district.name]}</p>}
        <Vignette buildings={district.vignette} />
        <div className="worlds-entries">{children}</div>
        <a className="worlds-back" href={`#${WORLD_MAP_ID}`}>
          {dict.worlds.backToMap}
        </a>
      </ChapterSection>
    );
  };

  return (
    <div ref={root} className="worlds">
      <div className="worlds__intro">
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
      </div>

      <div className="worlds__stage">
        <WorldMap
          arrangement={arrangement}
          highlighted={highlighted}
          onKeyboardFocus={(inside) => {
            keyboardInMap.current = inside;
            handle.current?.update();
          }}
        />
      </div>

      <div className="worlds__panels">
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
          educationIn('next').map((entry) => (
            <WorldsEducation key={entry.id} entry={entry} signs />
          )),
        )}

        {chapter(
          'toolbox',
          <>
            <SkillsExplorer onChange={setSkill} />
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
