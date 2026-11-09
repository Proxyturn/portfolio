import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cv } from '../../content/cv';
import { renderWithLang } from '../../test/render';
import { ContactSection } from './ContactSection';

describe('ContactSection', () => {
  it('renders the CV link on its own by default', () => {
    renderWithLang(<ContactSection />);
    expect(screen.getByRole('link', { name: 'Download CV (PDF)' })).toHaveAttribute(
      'href',
      cv.identity.cvPath,
    );
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('can caption the CV area, keeping the link name as its visible text', () => {
    renderWithLang(<ContactSection cvLabel="Take the map with you" />);
    const group = screen.getByRole('group', { name: 'Take the map with you' });
    expect(within(group).getByRole('link', { name: 'Download CV (PDF)' })).toHaveAttribute(
      'download',
    );
  });
});
