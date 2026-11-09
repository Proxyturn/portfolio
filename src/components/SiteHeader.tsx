import { ChapterNav } from './ChapterNav';
import { LanguageToggle } from './LanguageToggle';
import { ScrollProgress } from './ScrollProgress';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <ChapterNav />
        <LanguageToggle />
      </div>
      <ScrollProgress />
    </header>
  );
}
