import type { ReactNode } from 'react';

import Link from 'next/link';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { Search, ShoppingBag } from '@/lib/vendor/icons';

import { PrimaryNav } from './PrimaryNav';

export interface HeaderProps {
  messages: Messages;
  /**
   * MOD-01: `components/` may not import from `features/`, and the locale
   * switcher is a feature. It arrives as a slot composed in `app/layout.tsx`,
   * which sits above both layers and may import either (CMP-08).
   */
  localeSwitcher: ReactNode;
}

/**
 * The application shell header.
 *
 * The bag link carries no item count yet: the cart is M4, and a count invented
 * here would be a second source of truth for something the backend owns
 * (DATA-13). The markup leaves room for it rather than faking it.
 */
export function Header({ messages, localeSwitcher }: HeaderProps) {
  const t = messages.nav;

  return (
    <header className="border-border bg-surface border-b">
      <div className="px-gutter mx-auto flex max-w-6xl items-center justify-between gap-4 py-3">
        <Link href={ROUTES.home} className="text-fg text-lg font-semibold tracking-wide">
          {messages.site.name}
        </Link>

        {/* STY-08: mobile-first — the nav appears from the medium breakpoint up. */}
        <PrimaryNav messages={messages} className="hidden md:block" />

        <div className="flex items-center gap-1">
          {localeSwitcher}

          <ThemeToggle />

          {/* A11Y-04: icon-only controls carry an accessible name. */}
          <Link
            href={ROUTES.search}
            aria-label={t.search}
            className="rounded-card text-fg hover:bg-surface-muted p-2"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>

          <Link
            href={ROUTES.bag}
            aria-label={t.bag}
            className="rounded-card text-fg hover:bg-surface-muted p-2"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
          </Link>

          <Link
            href={ROUTES.signIn}
            className="rounded-card text-fg hover:bg-surface-muted px-3 py-2 text-sm"
          >
            {t.signIn}
          </Link>
        </div>
      </div>

      {/* The nav still needs to be reachable below the medium breakpoint. */}
      <PrimaryNav messages={messages} className="px-gutter mx-auto max-w-6xl pb-3 md:hidden" />
    </header>
  );
}
