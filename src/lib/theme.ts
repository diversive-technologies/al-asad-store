/**
 * THE theme vocabulary. A leaf module — it imports nothing project-internal, so
 * both the server resolver and the client hook can depend on it (MOD-01).
 */
export const THEMES = ['light', 'dark'] as const; // TS-10: no enum
export type Theme = (typeof THEMES)[number];

/**
 * A third state exists and is deliberately not a `Theme`: when the cookie is
 * absent the store follows the operating system, and the CSS media query in
 * `globals.css` handles it with no attribute on `<html>`. Modelling "system" as
 * a theme value would mean writing it into the DOM and then having to translate
 * it back into a real colour scheme in two places.
 */
export type ThemePreference = Theme | null;

export const THEME_COOKIE = 'theme';

/** The attribute the CSS keys off. Named once so markup and script agree. */
export const THEME_ATTRIBUTE = 'data-theme';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/** The theme a toggle should move to, given what the reader is looking at now. */
export function oppositeTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}
