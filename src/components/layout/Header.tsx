import type { ReactNode } from 'react';

import Link from 'next/link';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

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
  /** The bag button and its item count, from `features/bag`. */
  bagTrigger: ReactNode;
  /** Sign-in link or the signed-in name plus sign out, per the session. */
  accountMenu: ReactNode;
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
 * The bag control arrives as a slot for the same reason the search field does:
 * it needs the cart's server state and its open/close context, both of which
 * live in `features/bag`, and `components/` may not import from `features/`.
 */
export function Header({ messages, localeSwitcher, search, bagTrigger, accountMenu }: HeaderProps) {
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

          {/* D5: some clients ship a single brand treatment. The tokens still
              define both schemes; this removes the control, not the capability. */}
          {CLIENT.features.themeToggle ? <ThemeToggle /> : null}

          {bagTrigger}

          {/* MOD-01: `components/` may not import from `features/`, so the
              account control arrives as a slot from the root layout. */}
          {accountMenu}
        </div>
      </div>
    </StickyHeaderShell>
  );
}
