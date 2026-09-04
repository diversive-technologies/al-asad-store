import type { ReactNode } from 'react';

import Link from 'next/link';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { ShoppingBag } from '@/lib/vendor/icons';

import { StickyHeaderShell } from './StickyHeaderShell';

export interface HeaderProps {
  messages: Messages;
  /**
   * MOD-01: `components/` may not import from `features/`, and both the locale
   * switcher and the search field are features. They arrive as slots composed in
   * `app/layout.tsx`, which sits above both layers and may import either
   * (CMP-08).
   */
  localeSwitcher: ReactNode;
  search: ReactNode;
}

/**
 * The application shell header.
 *
 * There is deliberately no primary navigation here. Catalogue, Unstitched and
 * Stitched all resolved to the same route carrying different filter state, and
 * the homepage already offers both — the category grid for garment type, and a
 * dedicated catalogue section for the whole listing. Three links to one page is
 * three chances to disagree about which is canonical (section 30.5), and the
 * space they occupied is what lets the search field expand.
 *
 * Nothing in here sets a text colour. The bar owns its own `color` and
 * everything inside inherits it, which is what lets these server-rendered links
 * flip from white-over-film to the page foreground as the reader scrolls,
 * without a single one of them being a Client Component.
 *
 * The bag link carries no item count yet: the cart is M4, and a count invented
 * here would be a second source of truth for something the backend owns
 * (DATA-13). The markup leaves room for it rather than faking it.
 */
export function Header({ messages, localeSwitcher, search }: HeaderProps) {
  const t = messages.nav;

  return (
    <StickyHeaderShell>
      <div className="page-shell h-header flex items-center gap-2">
        <Link
          href={ROUTES.home}
          className="shrink-0 text-lg font-semibold tracking-wide transition-opacity hover:opacity-70"
        >
          {messages.site.name}
        </Link>

        {/*
         * The flexible middle. The search field measures itself against this
         * column, so "as wide as it can be" is whatever the wordmark and the
         * actions leave behind — it can never push them off a narrow screen.
         */}
        <div className="flex min-w-0 flex-1 justify-end">{search}</div>

        <div className="flex shrink-0 items-center gap-1">
          {localeSwitcher}

          <ThemeToggle />

          {/* A11Y-04: icon-only controls carry an accessible name. */}
          <Link
            href={ROUTES.bag}
            aria-label={t.bag}
            className="rounded-card p-2 transition-opacity hover:opacity-70"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
          </Link>

          <Link
            href={ROUTES.signIn}
            className="rounded-card px-3 py-2 text-sm transition-opacity hover:opacity-70"
          >
            {t.signIn}
          </Link>
        </div>
      </div>
    </StickyHeaderShell>
  );
}
