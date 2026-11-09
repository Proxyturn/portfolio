import { useLayoutEffect } from 'react';
import { Footer } from './components/Footer';
import { SiteHeader } from './components/SiteHeader';
import { MAIN_ID, SkipLink } from './components/SkipLink';
import { useHeaderHeight, useJumpNavigation } from './components/useJumpNavigation';
import { activeConcept } from './concepts/active';
import { applyTheme } from './theme/themes';

export function App() {
  const { Story, theme } = activeConcept;

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useHeaderHeight();
  useJumpNavigation();

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
