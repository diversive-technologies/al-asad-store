'use client';

import { useState } from 'react';

import { onDemandPart, useOnDemand } from '@/hooks/use-on-demand';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { Loader2, Search } from '@/lib/vendor/icons';

import { usePanelDismissal } from '../hooks/use-panel-dismissal';

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10). The panel carries the
 * whole product card — frames, heart, quick add — and the suggestions read with
 * its contract, and this button sits in the header of EVERY route: imported
 * statically, all of it was first-load JavaScript on pages where nobody
 * searches. It is fetched when the customer reaches for the button (pointer
 * over it, focus, a touch) and mounted on the first press. A closed `<dialog>`
 * renders nothing a first paint or a crawler needs, so it is never drawn on the
 * server.
 */
const searchOverlay = onDemandPart(() => import('./SearchOverlay'));

export interface HeaderSearchProps {
  locale: Locale;
  messages: Messages;
}

/**
 * The header's search control: a button, and the panel it opens.
 *
 * It used to morph into an inline field with a dropdown listbox beneath it.
 * That shape could hold a list of words and nothing more — §28.1's search now
 * shows four real product cards with photography, price and quick add, and a
 * field-width menu has nowhere to put them. `SearchOverlay` is the panel; this
 * is the button.
 *
 * The panel is not mounted until it is first asked for, and then stays mounted,
 * so its exit animation and its state behave exactly as they did when it was
 * always there. `hasOpened` is adjusted during render, not in an effect, for the
 * reason `useBagPanel` gives.
 *
 * A card in the panel that opens its product, or a quick add that opens the bag,
 * leaves the panel from inside a card that knows nothing of it. This component
 * sees the outcome (`usePanelDismissal`), closes the panel in its own render, and
 * draws the next one fresh — a new `key` — so that search's words and
 * refinements go with it, as they do when the panel's own links leave it.
 *
 * The panel IS the dialog, so until its code has arrived there is nothing to
 * open: the button says it is busy rather than expanded, and a download that
 * fails is said aloud and asked for again by the next press (`useOnDemand`) —
 * never thrown, which from the root layout would take the whole store down.
 *
 * No colour is pinned here: over the hero the header sets `color: on-media`,
 * and anything carrying its own `text-*` stops following it.
 */
export function HeaderSearch({ locale, messages }: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [exits, setExits] = useState(0);

  if (isOpen && !hasOpened) setHasOpened(true);

  const overlay = useOnDemand(searchOverlay, hasOpened);
  const { state } = overlay;
  const isWaiting = isOpen && state.status === 'LOADING';

  usePanelDismissal(isOpen, () => {
    setIsOpen(false);
    setExits((count) => count + 1);
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (state.status === 'FAILED') overlay.retry();
          setIsOpen(true);
        }}
        onPointerEnter={searchOverlay.warm}
        onFocus={searchOverlay.warm}
        onTouchStart={searchOverlay.warm}
        // A11Y-04: an icon-only control still has to say what it is.
        aria-label={messages.search.inputLabel}
        // Expanded only once there is a panel to see; busy while it downloads.
        aria-expanded={isOpen && state.status === 'READY'}
        aria-busy={isWaiting}
        className="focus-visible:ring-brand-500 rounded-full p-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none"
      >
        {isWaiting ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Search className="h-5 w-5" aria-hidden />
        )}
      </button>

      <span role="status" className="sr-only">
        {isOpen && state.status === 'FAILED' ? messages.common.partUnavailable : null}
      </span>

      {state.status === 'READY' && hasOpened ? (
        <state.value.SearchOverlay
          key={exits}
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
          }}
          locale={locale}
          messages={messages}
        />
      ) : null}
    </>
  );
}
