'use client';

import { useSavedSizes } from '@/features/saved-sizes/contract';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';
import { User } from '@/lib/vendor/icons';

import type { QuickAdd } from '../hooks/use-quick-add';

export interface QuickAddTrayProps {
  quickAdd: QuickAdd;
  /** The language the saved sizes are read in — part of their cache key. */
  locale: Locale;
  messages: Messages;
}

/**
 * The words the tray says over the photograph — waiting, a failed read, a
 * refused add — each on a plate of the media scrim.
 *
 * A plate, because the tray's own gradient is transparent at the top, which is
 * exactly where a one-line tray puts its words: over a pale photograph that left
 * `text-white/80` at about 2.5:1 against A11Y-07's 4.5:1, and the refusal was
 * danger red at 10px, 2.5:1 on the dark end over a white photograph. `on-media`
 * on an 85% scrim plate computes to 12.5:1 even over white, and neither colour
 * moves with the theme, because both sit on photography (see `--color-on-media`).
 * 12px, the smallest step of the type scale (STY-02).
 */
const TRAY_NOTE = 'rounded-card bg-media-scrim/85 text-on-media inline-block px-1.5 py-0.5 text-xs';

/**
 * The quick-add size tray, over the foot of the photograph: the sizes the card
 * may offer, or — for a product with no size to choose (§6.1) — the add itself.
 *
 * §28.3 — a signed-in customer's saved size carries the same glyph the product
 * page's "Your size" mark does, and its button says so to a screen reader. It is
 * MARKED and never pressed for them: every button here adds to the bag, so a
 * pre-selection would be a purchase nobody made. The tray has no room for a line
 * of words — at three columns on a phone it already fills the photograph — so the
 * glyph stands in for them here. The saved sizes are read only once a tray opens,
 * and the read is the one every tray and the product page share.
 *
 * `disabled` means sold out and nothing else. An add in flight marks its size
 * `aria-busy` and leaves every button enabled — a second press is refused by the
 * hook's latch instead — because a disabled button drops the keyboard focus it
 * holds, and the whole row used to be struck through, the sold-out look, while
 * one size was being added.
 */
/** A saved size's whole accessible name, as one message led by its label (I18N-06). */
function savedSizeName(messages: Messages, size: string): string {
  return formatTemplate(messages.savedSizes.sizeSavedName, { size });
}

export function QuickAddTray({ quickAdd, locale, messages }: QuickAddTrayProps) {
  const t = messages.catalogue;
  const { offer } = quickAdd;
  const saved = useSavedSizes({ locale });

  return (
    <div className="card-size-tray">
      {quickAdd.isOfferPending ? <p className={TRAY_NOTE}>{messages.common.loading}</p> : null}
      {quickAdd.isOfferUnavailable ? <p className={TRAY_NOTE}>{t.quickAddFailed}</p> : null}

      {offer === undefined ? null : (
        <div className="flex flex-wrap justify-center gap-1.5">
          {offer.kind === 'ONE_SIZE' ? (
            <button
              type="button"
              disabled={!offer.isAvailable}
              aria-busy={quickAdd.isAdding}
              onClick={() => {
                quickAdd.add(null);
              }}
              className="card-size"
            >
              {messages.product.addToBag}
            </button>
          ) : (
            offer.sizes.map((size) => {
              const isSaved = saved.sizeIds.includes(size.id);
              return (
                <button
                  key={size.id}
                  type="button"
                  disabled={!size.isAvailable}
                  aria-busy={quickAdd.pendingSizeId === size.id}
                  aria-label={isSaved ? savedSizeName(messages, size.label) : undefined}
                  onClick={() => {
                    quickAdd.add(size.id);
                  }}
                  className="card-size gap-1"
                >
                  {isSaved ? <User className="h-3 w-3" aria-hidden /> : null}
                  <bdi>{size.label}</bdi>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* A11Y-05 / ERR-04: a refusal is announced, not only shown. */}
      <p role="alert" className="mt-1 empty:hidden">
        {quickAdd.notice === null ? null : <span className={TRAY_NOTE}>{quickAdd.notice}</span>}
      </p>
    </div>
  );
}
