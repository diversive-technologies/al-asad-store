import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { currentAccountKey } from '@/features/auth/server';
import { getLocale, getMessages } from '@/i18n';
import { formatPlural } from '@/lib/utils/format';

import { fetchSavedItems } from '../api/saved-items-server';

/**
 * §28.3 — the saved-items section of the account.
 *
 * It reads its own list rather than taking it as a prop, so the account route
 * composes without knowing what a saved item is (STRUCT-02, MOD-01), and it reads
 * it on the SERVER, so this section ships no JavaScript and the page still has no
 * client boundary of its own.
 *
 * It shows how many and links to the list rather than repeating the grid. The
 * grid is the catalogue's client card — hearts, quick add, frame carousel and all
 * — and rendering a second copy of it here would put every one of those on a page
 * whose whole point is that it has none.
 *
 * A GUEST has no list to show: the heart is offered only to a signed-in customer,
 * because §28.3 makes a saved list belong to an account.
 */
export async function AccountSavedItems() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const t = messages.account;
  const accountKey = await currentAccountKey();
  const saved = accountKey === null ? null : await fetchSavedItems(accountKey);

  return (
    <section aria-labelledby="account-saved-items" className="mt-10">
      <h2 id="account-saved-items" className="text-fg text-lg font-medium">
        {t.savedItemsHeading}
      </h2>

      {saved === null ? <p className="text-fg-muted mt-2">{t.savedItemsGuest}</p> : null}

      {/* The list is on file and could not be READ — said as such, because
          reporting a customer's own saved items as empty would be a lie. */}
      {saved !== null && !saved.ok ? (
        <p className="text-fg-muted mt-2">{t.savedItemsUnavailable}</p>
      ) : null}

      {saved !== null && saved.ok && saved.value.ids.length === 0 ? (
        <div className="mt-2 flex flex-col items-start gap-3">
          <p className="text-fg-muted">{messages.wishlist.emptyBody}</p>
          <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
            {messages.catalogue.browseAll}
          </ButtonLink>
        </div>
      ) : null}

      {saved !== null && saved.ok && saved.value.ids.length > 0 ? (
        <div className="mt-2 flex flex-col items-start gap-3">
          {/* I18N-07: the count goes through the locale's own plural rules. */}
          <p className="text-fg-muted">
            <bdi>{formatPlural(messages.wishlist.savedCount, saved.value.ids.length, locale)}</bdi>
          </p>
          <ButtonLink href={ROUTES.wishlist} variant="secondary">
            {t.openSavedItems}
          </ButtonLink>
        </div>
      ) : null}
    </section>
  );
}
