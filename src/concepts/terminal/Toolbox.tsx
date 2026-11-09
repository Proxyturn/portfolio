import { ContactForm } from '../../components/contact/ContactForm';
import { CvDownload } from '../../components/CvDownload';
import { EmailReveal } from '../../components/EmailReveal';
import { ExternalLink } from '../../components/ExternalLink';
import { SkillsExplorer } from '../../components/SkillsExplorer';
import { cv } from '../../content/cv';
import { t } from '../../content/selectors';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';
import { CMD, LINK_CMD } from './code';
import { Cmd, Line } from './parts';

/** `$ man william`: grep chips (the shared SkillsExplorer), `ls certs/` and `locale`. */
export function Toolbox() {
  const { lang, dict } = useLanguage();
  return (
    <>
      <Cmd command={CMD.man} />
      <div className="term-man">
        <SkillsExplorer />
      </div>
      <div className="term-toolbox">
        <div data-reveal-group="">
          <Cmd heading command={CMD.certs} comment={dict.story.certifications} />
          <ul className="term-ls">
            {cv.certifications.map((cert) => (
              <li key={cert.id} className="term-row" data-cert={cert.id}>
                <Line>
                  {t(cert.title, lang)}
                  {cert.hours !== undefined && (
                    <span className="term-ls__hours">
                      {' '}
                      {format(dict.story.hours, { hours: cert.hours })}
                    </span>
                  )}
                </Line>
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal-group="">
          <Cmd heading command={CMD.locale} comment={dict.story.spokenLanguages} />
          <ul className="term-locale">
            {cv.spokenLanguages.map((language) => (
              <li key={language.id} className="term-row">
                <Line>
                  <span className="term-locale__name">{t(language.name, lang)}:</span>{' '}
                  {dict.story.fluency[language.fluency]}
                </Line>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/**
 * `$ ./contact.sh`: the shared contact pieces, prompt-styled. Every link shows its command and
 * a plain label, so the accessible name contains the visible text. The CV download and the
 * email reveal get their command from terminal.css (their text is fixed in the shared
 * components); LinkedIn and GitHub are composed here.
 */
export function TerminalContact() {
  const { dict } = useLanguage();
  return (
    <div className="contact term-contact">
      <div className="contact__links">
        <p>{dict.contact.intro}</p>
        <ExternalLink className="button button--ghost term-link" href={cv.identity.links.linkedin}>
          <span className="term-link__cmd">
            <code lang="en">{LINK_CMD.linkedin}</code> ·{' '}
          </span>
          {dict.terminal.openLinkedIn}
        </ExternalLink>
        <ExternalLink className="button button--ghost term-link" href={cv.identity.links.github}>
          <span className="term-link__cmd">
            <code lang="en">{LINK_CMD.github}</code> ·{' '}
          </span>
          {dict.terminal.openGitHub}
        </ExternalLink>
        <div className="term-contact__cv">
          <CvDownload />
        </div>
        <div className="term-contact__email">
          <EmailReveal />
        </div>
      </div>
      <ContactForm />
    </div>
  );
}
