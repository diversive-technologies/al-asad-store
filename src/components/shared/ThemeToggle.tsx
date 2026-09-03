'use client';

import { useTheme } from '@/hooks/use-theme';
import { useMessages } from '@/i18n/use-messages';
import { Moon, Sun } from '@/lib/vendor/icons';

/**
 * A11Y-04 — an icon-only control carries an accessible name, and the name says
 * what the control will DO rather than what is currently showing.
 *
 * The icon shown is the scheme being offered, not the one in force: a sun means
 * "switch to light".
 */
export function ThemeToggle() {
  const t = useMessages();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const label = isDark ? t.theme.switchToLight : t.theme.switchToDark;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="text-fg hover:bg-surface-muted rounded-card p-2"
    >
      {/* I18N-05: neither glyph is directional, so neither mirrors in Urdu. */}
      {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
