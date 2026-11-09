import { useId } from 'react';
import { cv } from '../../content/cv';
import { useLanguage } from '../../i18n/context';
import { CvDownload } from '../CvDownload';
import { EmailReveal } from '../EmailReveal';
import { ExternalLink } from '../ExternalLink';
import { ContactForm } from './ContactForm';

interface Props {
  /**
   * Optional caption for the CV download area (e.g. Journey's "Take the map with you").
   * It names a group around the link; the link keeps its own "Download CV (PDF)" text.
   */
  readonly cvLabel?: string;
}

/** Call to action: form, email, LinkedIn, GitHub, CV download. Shared by every concept. */
export function ContactSection({ cvLabel }: Props = {}) {
  const { dict } = useLanguage();
  const cvLabelId = useId();
  return (
    <div className="contact">
      <div className="contact__links">
        <p>{dict.contact.intro}</p>
        <EmailReveal />
        <ExternalLink className="button button--ghost" href={cv.identity.links.linkedin}>
          {dict.contact.linkedin}
        </ExternalLink>
        <ExternalLink className="button button--ghost" href={cv.identity.links.github}>
          {dict.contact.github}
        </ExternalLink>
        {cvLabel ? (
          <div className="contact__cv" role="group" aria-labelledby={cvLabelId}>
            <p id={cvLabelId} className="contact__cv-label">
              {cvLabel}
            </p>
            <CvDownload />
          </div>
        ) : (
          <CvDownload />
        )}
      </div>
      <ContactForm />
    </div>
  );
}
