import 'server-only';

import { cookies } from 'next/headers';

import { isTheme, THEME_COOKIE, type ThemePreference } from './theme';

/**
 * Resolves the stored colour-scheme choice so the first paint — including the
 * hero poster and film — is correct without a client round-trip.
 *
 * Returns `null` when the reader has never chosen. That is not a failure: it
 * means "follow the operating system", which the CSS media query in
 * globals.css already handles.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies(); // NEXT-04: cookies() is async.
  const value = store.get(THEME_COOKIE)?.value;

  // SEC-02: a cookie is untrusted input and is validated, never cast.
  return isTheme(value) ? value : null;
}
