import Link from 'next/link';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/format';
import { Check } from '@/lib/vendor/icons';

export interface FilterToggleLinkProps {
  href: string;
  label: string;
  /** The facet count, or `null` when the index is degraded and none came back. */
  count: number | null;
  isSelected: boolean;
  locale: Locale;
  messages: Messages;
}

/**
 * PD-01 — one filter row, used by every facet value AND by the in-stock toggle.
 *
 * Toggling a filter is navigation, so this is a link and not a checkbox: the
 * catalogue's whole state lives in the URL (STATE-01 rung 4), which keeps the
 * panel free of JavaScript and every filter combination crawlable for §30.5.
 *
 * The tick is `aria-hidden` decoration. A11Y-06 forbids colour and shape as the
 * only carrier of state, so the real state is visually-hidden text naming the
 * ACTION the link performs — which is also what a link's accessible name should
 * describe.
 */
export function FilterToggleLink({
  href,
  label,
  count,
  isSelected,
  locale,
  messages,
}: FilterToggleLinkProps) {
  const t = messages.catalogue;

  return (
    <Link
      href={href}
      // STY-10 / A11Y-03: focus is visible and does not depend on hover.
      className="rounded-card hover:bg-surface-muted focus-visible:ring-brand-500 flex items-center gap-2 px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-sm border',
          isSelected ? 'bg-brand-600 border-brand-600' : 'border-border',
        )}
        aria-hidden
      >
        {isSelected ? <Check className="text-on-brand size-3" /> : null}
      </span>

      <span className="text-fg flex-1 truncate">{label}</span>

      <span className="sr-only">{isSelected ? t.filterRemove : t.filterAdd}</span>

      {/* CMP-11: an explicit null check, never `{count && …}` on a number. */}
      {count === null ? null : (
        <span className="text-fg-muted shrink-0 text-xs">
          {/* I18N-08: even a bare count goes through the locale formatter. */}
          <bdi>{formatNumber(count, locale)}</bdi>
        </span>
      )}
    </Link>
  );
}
