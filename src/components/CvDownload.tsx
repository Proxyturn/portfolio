import { cv } from '../content/cv';
import { useLanguage } from '../i18n/context';

export function CvDownload() {
  const { dict } = useLanguage();
  return (
    <a className="button" href={cv.identity.cvPath} download type="application/pdf">
      {dict.contact.downloadCv}
    </a>
  );
}
