import { useLayoutEffect } from 'react';
import { Footer } from './components/Footer';
import { SiteHeader } from './components/SiteHeader';
import { MAIN_ID, SkipLink } from './components/SkipLink';
import { activeConcept } from './concepts/active';
import { applyTheme } from './theme/themes';

export function App() {
  const { Story, theme } = activeConcept;

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id={MAIN_ID} tabIndex={-1}>
        <Story />
      </main>
      <Footer />
    </>
  );
}
