import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { cv } from './content/cv';
import { STORAGE_KEY } from './i18n/language';
import { LanguageProvider } from './i18n/LanguageProvider';
import type { Lang } from './content/types';

function renderApp(initial?: Lang) {
  return render(
    <LanguageProvider {...(initial ? { initial } : {})}>
      <App />
    </LanguageProvider>,
  );
}

describe('App', () => {
  it.each<Lang>(['en', 'pt'])('renders every chapter in %s', (lang) => {
    const { container } = renderApp(lang);
    const sections = container.querySelectorAll('[data-chapter]');
    expect([...sections].map((s) => s.id)).toEqual(cv.chapters.map((c) => c.id));
    expect(screen.getByRole('heading', { level: 1, name: cv.identity.name })).toBeInTheDocument();
    expect(screen.getByText(cv.hook[lang])).toBeInTheDocument();
    for (const chapter of cv.chapters.filter((c) => c.id !== 'hook')) {
      expect(
        screen.getByRole('heading', { level: 2, name: chapter.title[lang] }),
      ).toBeInTheDocument();
    }
    expect(document.documentElement.lang).toBe(lang === 'pt' ? 'pt-BR' : 'en');
  });

  it('switches language, updates <html lang> and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp('en');
    expect(screen.getByText(cv.hook.en)).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Language' });
    await user.click(within(group).getByRole('button', { name: /Português/ }));

    expect(screen.getByText(cv.hook.pt)).toBeInTheDocument();
    expect(screen.queryByText(cv.hook.en)).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(document.title).toContain('Desenvolvedor');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('pt');
    expect(
      within(screen.getByRole('group', { name: 'Idioma' })).getByRole('button', {
        name: /Português/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts from the remembered language', () => {
    window.localStorage.setItem(STORAGE_KEY, 'pt');
    renderApp();
    expect(screen.getByText(cv.hook.pt)).toBeInTheDocument();
  });

  it('has a skip link to main and a labelled chapter navigation', () => {
    renderApp('en');
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.getElementById('main')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Chapters' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(cv.chapters.map((c) => `#${c.id}`));
  });

  it('opens external links safely', () => {
    renderApp('en');
    for (const name of [/LinkedIn/, /GitHub/]) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('offers the CV as a PDF download', () => {
    renderApp('en');
    const link = screen.getByRole('link', { name: 'Download CV (PDF)' });
    expect(link).toHaveAttribute('href', cv.identity.cvPath);
    expect(link).toHaveAttribute('download');
  });
});
