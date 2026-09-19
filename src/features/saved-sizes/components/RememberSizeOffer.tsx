'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { useMessages } from '@/i18n/use-messages';
import type { SizeId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import { useSavedSizeChanges } from '../hooks/use-saved-size-changes';
import { useSavedSizes } from '../hooks/use-saved-sizes';
import { replacedSize } from '../lib/replaced-size';
import { savedSizeRefusal } from '../lib/saved-size-refusal';
import { SavedSizeConfirmation } from './SavedSizeConfirmation';

/** A size as the offer names it. */
export interface OfferedSize {
  readonly id: SizeId;
  readonly label: string;
}

export interface RememberSizeOfferProps {
  /** The one size the customer's choice comes to, or `null` while there is none. */
  readonly size: OfferedSize | null;
  /** What is chosen came from the saved sizes rather than from the customer. */
  readonly isPrefilled: boolean;
  readonly locale: Locale;
}

interface Remembered {
  readonly id: SizeId;
  /** The size it took the place of, from the server's before and after. */
  readonly previous: string | null;
}

/**
 * §28.3's "stored", on the product page: an explicit offer to remember the size
 * the customer chose, never a save they did not ask for.
 *
 * It is a PRESS rather than a side effect of Add to bag, because a bag is often
 * for somebody else — a gift, a child, a parent — and a size quietly saved from
 * that purchase would then be chosen for the customer on every product after it.
 * Nothing is stored for a guest, and nothing is drawn for one.
 *
 * It is offered only when the choice comes to ONE size. A set whose pieces are
 * sized apart names several, and which size chart each belongs to is the
 * backend's to know (DATA-13): offering both could have one silently take the
 * other's place, which is exactly the surprise this exists to avoid.
 *
 * It says, in words, when what is chosen is the saved size — pre-selected or
 * picked — so a size chosen for the customer is never a surprise. It waits for
 * the saved sizes to be READ, so a size already saved is not offered again on a
 * cold load, and it offers nothing when they could not be read, because then it
 * cannot say whether the size is saved already. It draws nothing at all when it
 * has nothing to say: it sits in the buy box's gapped column, where an empty box
 * would still take a gap.
 */
export function RememberSizeOffer({ size, isPrefilled, locale }: RememberSizeOfferProps) {
  const t = useMessages().savedSizes;
  const saved = useSavedSizes({ locale });
  const changes = useSavedSizeChanges(saved.keys);
  const [remembered, setRemembered] = useState<Remembered | null>(null);

  /*
   * The confirmation belongs to the moment it answers. Once the choice moves to
   * another size it is spent — adjusted during render, as `FilterDrawer` does on a
   * path change — so coming back to that size shows the quiet note instead of
   * mounting the confirmation again and pulling focus off the radio just pressed.
   */
  if (remembered !== null && remembered.id !== size?.id) setRemembered(null);

  if (!saved.isSignedIn || !saved.isReady || saved.isUnreadable) return null;
  if (size === null) return isPrefilled ? <OfferNote text={t.prefilled} /> : null;

  if (remembered !== null && remembered.id === size.id) {
    const message = confirmationOf(size, remembered, t);
    return <SavedSizeConfirmation key={message} message={message} />;
  }

  if (saved.sizeIds.includes(size.id)) {
    return (
      <OfferNote
        text={isPrefilled ? t.prefilled : formatTemplate(t.isSaved, { size: size.label })}
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-busy={changes.isChanging}
        onClick={() => {
          const before = saved.sizes;
          void changes.run({ action: 'REMEMBER', sizeId: size.id }).then((after) => {
            if (after === null) return;
            setRemembered({ id: size.id, previous: replacedSize(before, after.sizes, size.id) });
          });
        }}
      >
        {formatTemplate(t.remember, { size: size.label })}
      </Button>
      {/* A11Y-05 / ERR-04 — a refusal is announced, not only shown, in full ink:
          the words carry it, as the store's other quiet refusals do. */}
      <p role="alert" className="text-fg text-sm empty:hidden">
        {changes.failure === null ? null : savedSizeRefusal('REMEMBER', changes.failure, t)}
      </p>
    </div>
  );
}

interface OfferNoteProps {
  readonly text: string;
}

/** A quiet line naming the saved size; `status`, because it changes as the choice does. */
function OfferNote({ text }: OfferNoteProps) {
  return (
    <p role="status" className="text-fg-muted text-sm">
      {text}
    </p>
  );
}

function confirmationOf(
  size: OfferedSize,
  remembered: Remembered,
  t: Messages['savedSizes'],
): string {
  return remembered.previous === null
    ? formatTemplate(t.remembered, { size: size.label })
    : formatTemplate(t.rememberedInstead, { size: size.label, previous: remembered.previous });
}
