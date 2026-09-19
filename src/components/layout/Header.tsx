import type { ReactNode } from 'react';

import Link from 'next/link';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { Ruler } from '@/lib/vendor/icons';

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
 *
 * §34 — "Stitched to size" is the one call to action the bar carries. It is not
 * navigation: the argument above is against three links to one listing, and this
 * is the only way into a different feature.
 *
 * GOLD, not jade, and that is what lets it sit in this bar. Jade is what takes
 * money — Add to bag, Place order — and gold is the studio's own mark, the accent
 * every measurement ring is drawn in. Neither `accent-400` nor `on-accent` is
 * redefined for dark, so one declaration is legible over the hero film, over the
 * solid bar, and in both themes.
 *
 * A plain `<Link>` rather than `ButtonLink`: the neighbours are a 36px geometry
 * set of bare glyphs, not buttons, and matching that set is the fix for a control
 * that did not sit in the row. `sr-only` is absolutely positioned, so below `sm`
 * the label is not a flex item and the control is exactly 36x36 — while the name
 * survives in the accessibility tree (A11Y-04).
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
          {/* §34's call to action — see the note above on why it is gold and a plain link. */}
          <Link
            href={ROUTES.stitched}
            className="bg-accent-400 text-on-accent rounded-pill hover:bg-accent-500 me-1 flex h-9 w-9 shrink-0 items-center justify-center gap-2 text-sm font-medium transition-colors sm:w-auto sm:ps-3 sm:pe-3.5"
          >
            {/* I18N-05: a ruler is not directional, so it must NOT mirror. */}
            <Ruler aria-hidden className="size-5 sm:size-4" />
            <span className="sr-only sm:not-sr-only">{messages.nav.stitchedCta}</span>
          </Link>

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
