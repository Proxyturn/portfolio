import { cv } from '../../content/cv';
import { useLanguage } from '../../i18n/context';
import { CvDownload } from '../CvDownload';
import { EmailReveal } from '../EmailReveal';
import { ExternalLink } from '../ExternalLink';
import { ContactForm } from './ContactForm';

/** Call to action: form, email, LinkedIn, GitHub, CV download. Shared by every concept. */
export function ContactSection() {
  const { dict } = useLanguage();
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
        <CvDownload />
      </div>
      <ContactForm />
    </div>
  );
}
