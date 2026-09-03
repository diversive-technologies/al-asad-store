'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';
import {
  oppositeTheme,
  THEME_ATTRIBUTE,
  THEME_COOKIE,
  type Theme,
  type ThemePreference,
} from '@/lib/theme';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export interface UseThemeResult {
  /** The scheme currently painted — never null, so callers need no fallback. */
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<UseThemeResult>({
  theme: 'light',
  toggleTheme: () => undefined,
});

export interface ThemeProviderProps {
  /**
   * Resolved on the server from the cookie. `null` means the reader has never
   * chosen, so the operating system decides — CSS already paints that case
   * through a media query, and the system query below tells React about it so
   * theme-dependent *content*, such as the hero film, matches the paint.
   */
  initialPreference: ThemePreference;
  children: ReactNode;
}

/**
 * STATE-01 — theme is app-wide, low-frequency and read by unrelated subtrees,
 * which is rung 5 (Context). It is deliberately not URL state: a reader's
 * colour scheme should not travel inside a shared link.
 *
 * STATE-03 — the painted theme is derived, never stored twice. Only the
 * explicit *choice* is state; "what the system says" is read live, so a reader
 * on "follow the system" who changes it in their OS sees the store follow along
 * without a reload.
 */
export function ThemeProvider({ initialPreference, children }: ThemeProviderProps) {
  const [chosenTheme, setChosenTheme] = useState<ThemePreference>(initialPreference);
  const prefersDark = useMediaQuery(DARK_SCHEME_QUERY);

  const theme: Theme = chosenTheme ?? (prefersDark ? 'dark' : 'light');

  const toggleTheme = useCallback(() => {
    const next = oppositeTheme(theme);

    /*
     * STATE-04: two external systems, written in the click handler rather than
     * an effect so the repaint lands in the same tick — the document element
     * that CSS keys off, and the cookie the server reads on the next request.
     *
     * Deliberately no router.refresh(): re-rendering from the server would tear
     * down the hero video element and lose its playback position.
     */
    document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${String(COOKIE_MAX_AGE_SECONDS)}; samesite=lax`;

    setChosenTheme(next);
  }, [theme]);

  // PERF-05: a stable reference, so consumers do not re-render on every parent render.
  const value = useMemo<UseThemeResult>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): UseThemeResult {
  return useContext(ThemeContext);
}
