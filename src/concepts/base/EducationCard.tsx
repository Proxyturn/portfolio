import { formatYearMonth, t } from '../../content/selectors';
import type { Education } from '../../content/types';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';

export function EducationCard({ entry }: { readonly entry: Education }) {
  const { lang, dict } = useLanguage();
  const status = entry.graduated
    ? format(dict.story.graduated, { date: formatYearMonth(entry.graduated, lang) })
    : dict.story.inProgress;
  return (
    <article className="job reveal" id={`edu-${entry.id}`} data-education={entry.id}>
      <header>
        <h3 tabIndex={-1}>{t(entry.title, lang)}</h3>
        <p className="job__period">
          {entry.institution} · {status}
        </p>
      </header>
      {entry.topics && (
        <ul>
          {entry.topics.map((topic) => (
            <li key={topic.en}>{t(topic, lang)}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
