'use client';

import { useState } from 'react';

import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import type { SizeId } from '@/lib/domain/ids';

import { useSavedSizeChanges } from '../hooks/use-saved-size-changes';
import { useSavedSizes } from '../hooks/use-saved-sizes';
import { savedSizeRefusal } from '../lib/saved-size-refusal';
import type { SavedSizes } from '../schemas/saved-size.schema';
import { SavedSizeConfirmation } from './SavedSizeConfirmation';
import { SavedSizeRow } from './SavedSizeRow';

export interface SavedSizeListProps {
  /** The list as the account section read it on the server. */
  readonly initial: SavedSizes;
  readonly locale: Locale;
}

/**
 * The account's saved sizes, each with a way to forget it.
 *
 * The list is READ on the server — the section renders with its sizes in the
 * first response, like every other account section — and handed to the query
 * cache as its first answer, so forgetting one replaces it with the backend's
 * next answer rather than a copy kept here (STATE-02). This is the one client
 * leaf the account page carries, and it exists because forgetting WRITES
 * (MOD-06); a page of its own for one button would be more to open, not less.
 */
export function SavedSizeList({ initial, locale }: SavedSizeListProps) {
  const t = useMessages().savedSizes;
  const saved = useSavedSizes({ locale, initial });
  const changes = useSavedSizeChanges(saved.keys);
  /* How many sizes this visit has forgotten — which keys the confirmation, so each
     one is mounted, focused and read afresh. */
  const [forgotten, setForgotten] = useState(0);

  const forget = (sizeId: SizeId): void => {
    void changes.run({ action: 'FORGET', sizeId }).then((after) => {
      if (after !== null) setForgotten((count) => count + 1);
    });
  };

  return (
    <div className="mt-2 flex flex-col items-start gap-3">
      <p className="text-fg-muted text-sm">{t.lead}</p>

      {saved.sizes.length === 0 ? (
        <p className="text-fg-muted">{t.empty}</p>
      ) : (
        <ul className="divide-border border-border w-full divide-y border-y">
          {saved.sizes.map((entry) => (
            <SavedSizeRow
              key={entry.sizeSet.id}
              entry={entry}
              isBusy={changes.isChanging}
              onForget={forget}
            />
          ))}
        </ul>
      )}

      {/* A11Y-05 / ERR-04 — a refusal is announced, not only shown, in full ink:
          the words carry it, as the store's other quiet refusals do. */}
      <p role="alert" className="text-fg text-sm empty:hidden">
        {changes.failure === null ? null : savedSizeRefusal('FORGET', changes.failure, t)}
      </p>
      {forgotten === 0 || changes.failure !== null ? null : (
        <SavedSizeConfirmation key={forgotten} message={t.forgotten} />
      )}
    </div>
  );
}
