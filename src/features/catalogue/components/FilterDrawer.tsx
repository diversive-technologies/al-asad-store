'use client';

import { useState, type ReactNode } from 'react';

import { usePathname } from 'next/navigation';

import { SlideOver } from '@/components/ui/dialog';
import type { Messages } from '@/i18n/messages/en';
import { SlidersHorizontal } from '@/lib/vendor/icons';

export interface FilterDrawerProps {
  messages: Messages;
  /** How many filters are currently applied, for the trigger's badge. */
  activeCount: number;
  /**
   * The filter panel, rendered on the SERVER and passed in.
   *
   * This is what keeps `FilterPanel` a Server Component shipping no JavaScript
   * even though it now lives inside a client-side dialog: a Client Component
   * may RENDER server-rendered children, it just may not import them.
   */
  children: ReactNode;
}

/**
 * §28.1's filters, at every width.
 *
 * This used to be the small-screen answer beside a permanent desktop rail, and
 * the rail is now gone by operator decision. What it bought was one tap saved;
 * what it cost was a fixed 16rem column on every listing, which is a sixth of a
 * 1536px page spent on controls that are empty most of the time — and it made
 * the grid narrower on exactly the screens with room for more products.
 *
 * Removing it also removed a duplicate. `FilterPanel` was rendered TWICE, once
 * for the rail and once for the drawer, which is why `PriceFilter` had to
 * generate its ids; there is one copy now.
 *
 * `FilterChips` still sits under the toolbar, so which filters are applied stays
 * visible and removable without opening anything — that is the part of the rail
 * worth keeping, and it costs no width.
 *
 * It opens from `inline-start`: the filters belong to the reading-start edge in
 * both directions, which is where the rail used to be.
 */
export function FilterDrawer({ messages, activeCount, children }: FilterDrawerProps) {
  const t = messages.catalogue;
  const [isOpen, setIsOpen] = useState(false);

  /*
   * A change of PAGE closes the drawer; a change of filter does not.
   *
   * Both go through the router, so the distinction has to be drawn somewhere,
   * and the pathname is where it lives: every control in the panel edits the
   * query string of the page it is already on, while leaving for a product or
   * the bag changes the path. That is exactly the behaviour wanted — filter
   * after filter without the drawer shutting, but never a drawer left hanging
   * over a page the reader has moved to.
   *
   * Adjusted during render rather than in an effect, the same way the bag
   * provider does it: an effect would paint the stale open drawer once before
   * closing it, and would trip `react-hooks/set-state-in-effect`.
   */
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
        className="border-border rounded-card text-fg hover:bg-surface-muted focus-visible:ring-brand-500 flex items-center gap-2 border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {/* I18N-05: sliders are not directional, so this glyph must not mirror. */}
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {t.filtersHeading}
        {activeCount === 0 ? null : (
          /* A11Y-06: the count is text, not a coloured dot. */
          <span className="bg-brand-600 rounded-full px-1.5 py-0.5 text-xs text-white">
            {activeCount}
          </span>
        )}
      </button>

      <SlideOver
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        title={t.filtersHeading}
        closeLabel={messages.common.close}
        side="inline-start"
      >
        {children}
      </SlideOver>
    </>
  );
}
