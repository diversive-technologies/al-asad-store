'use client';

import { useState, type ReactNode } from 'react';

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
 * §28.1's filters on a small screen.
 *
 * Below 64rem the rail has nowhere to go — at 768px a fixed 16rem column took
 * more than a third of the row and squeezed the tiles to ~115px — so the panel
 * moves into a drawer behind a button. `SlideOver` takes `side` for exactly
 * this, which is why it was built in `components/ui` rather than inside the bag.
 *
 * It opens from `inline-start`: the filters belong to the reading-start edge in
 * both directions, matching where the rail sits on a wide screen.
 */
export function FilterDrawer({ messages, activeCount, children }: FilterDrawerProps) {
  const t = messages.catalogue;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
        className="border-border rounded-card text-fg focus-visible:ring-brand-500 flex items-center gap-2 border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none lg:hidden"
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
