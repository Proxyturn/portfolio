import { useRef } from 'react';
import { ChapterSection } from '../../components/ChapterSection';
import { ContactSection } from '../../components/contact/ContactSection';
import { SkillsExplorer } from '../../components/SkillsExplorer';
// import { Avatar } from '../../components/Avatar';
import { cv } from '../../content/cv';
import { jobsChronological, t } from '../../content/selectors';
import type { ChapterId } from '../../content/types';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';
import { gsap } from '../../motion/gsap';
import { useScrollScene } from '../../motion/useScrollScene';
import { EducationCard } from './EducationCard';
import { JobCard } from './JobCard';
import './base.css';

const JOB_CHAPTERS: readonly ChapterId[] = ['origins', 'enterprise', 'energy', 'breadth', 'now'];

/**
 * Neutral, readable rendering of every story beat. It is the reference layout on main and the
 * fallback the three concepts are compared against. Concepts replace it on their branches.
 */
export function BaseStory() {
  const { lang, dict } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const chronological = jobsChronological();

  useScrollScene(root, (scope) => {
    for (const el of scope.querySelectorAll<HTMLElement>('.reveal')) {
      gsap.from(el, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    }
  });

  return (
    <div ref={root} className="base-story">
      <ChapterSection id="hook" hideTitle className="base-chapter base-hook">
        {/* <Avatar /> */}
        <h1 tabIndex={-1}>{cv.identity.name}</h1>
        <p className="base-hook__role">
          {t(cv.role, lang)} · {t(cv.identity.location, lang)}
        </p>
        <p className="base-hook__line">{t(cv.hook, lang)}</p>
        {cv.summary.map((paragraph) => (
          <p key={paragraph.en} className="base-hook__summary">
            {t(paragraph, lang)}
          </p>
        ))}
      </ChapterSection>

      {JOB_CHAPTERS.map((chapter) => (
        <ChapterSection key={chapter} id={chapter} className="base-chapter">
          <div className="base-grid">
            {chronological
              .filter((job) => job.chapter === chapter)
              .map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            {cv.education
              .filter((entry) => entry.chapter === chapter)
              .map((entry) => (
                <EducationCard key={entry.id} entry={entry} />
              ))}
          </div>
        </ChapterSection>
      ))}

      <ChapterSection id="next" className="base-chapter">
        <div className="base-grid">
          {cv.education
            .filter((entry) => entry.chapter === 'next')
            .map((entry) => (
              <EducationCard key={entry.id} entry={entry} />
            ))}
        </div>
      </ChapterSection>

      <ChapterSection id="toolbox" className="base-chapter">
        <SkillsExplorer />
        <div className="base-grid">
          <div className="job reveal">
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
          <div className="job reveal">
            <h3>{dict.story.spokenLanguages}</h3>
            <ul>
              {cv.spokenLanguages.map((language) => (
                <li key={language.id}>
                  {t(language.name, lang)}: {dict.story.fluency[language.fluency]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ChapterSection>

      <ChapterSection id="contact" className="base-chapter">
        <ContactSection />
      </ChapterSection>
    </div>
  );
}
