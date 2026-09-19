import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatPlural } from '@/lib/utils/format';

export interface WishlistNotesProps {
  /** How many saved products came back. */
  shown: number;
  /** How many ids the list holds. */
  saved: number;
  /** How many items this browser has just handed to the account. */
  carried: number;
  locale: Locale;
  messages: Messages;
}

/**
 * The lines above the saved grid. I18N-07: every count goes through the locale's
 * plural rules.
 */
export function WishlistNotes({ shown, saved, carried, locale, messages }: WishlistNotesProps) {
  const t = messages.wishlist;

  return (
    <>
      {/*
       * A list built before signing in has just been handed to the account.
       * Said out loud, because the customer did not ask for it and would
       * otherwise find items here they only ever saved on one browser.
       */}
      {carried > 0 ? (
        <p className="text-fg-muted text-sm">
          <bdi>{formatPlural(t.carried, carried, locale)}</bdi>
        </p>
      ) : null}

      <p className="text-fg-muted text-sm">
        <bdi>{formatPlural(t.savedCount, shown, locale)}</bdi>
      </p>

      {/*
       * Fewer products came back than were asked for, which means one has been
       * withdrawn from sale since it was saved. Said plainly rather than left
       * as a list that quietly shrank — the customer chose those items and is
       * owed an explanation for a missing one.
       */}
      {shown < saved ? (
        <p className="text-fg-muted text-sm">
          <bdi>{formatPlural(t.withdrawn, saved - shown, locale)}</bdi>
        </p>
      ) : null}
    </>
  );
}
