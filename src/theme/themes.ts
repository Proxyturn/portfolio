/**
 * Theme system. A theme is a set of CSS custom properties scoped under
 * `:root[data-theme="<id>"]` (see tokens.css and each concept's own CSS).
 * Shared components only read the tokens listed in `THEME_TOKENS`, so a concept changes the
 * whole look by defining them, without touching shared code.
 */
export type ThemeId = 'base' | 'journey' | 'terminal' | 'worlds';

export const THEME_TOKENS = [
  '--color-bg',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-accent',
  '--color-accent-contrast',
  '--color-border',
  '--color-focus',
  '--color-danger',
  '--color-success',
  '--font-body',
  '--font-display',
  '--font-mono',
  '--radius',
  '--space-gutter',
  '--max-width',
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

export function applyTheme(id: ThemeId, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = id;
}
