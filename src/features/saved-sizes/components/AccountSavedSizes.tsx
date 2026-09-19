import { currentAccountKey } from '@/features/auth/server';
import { getLocale, getMessages } from '@/i18n';
import { logApiError } from '@/lib/utils/log';

import { fetchSavedSizes } from '../api/saved-sizes-server';
import { SavedSizeList } from './SavedSizeList';

/**
 * §28.3 — the saved-sizes section of the account.
 *
 * It reads its own list rather than taking it as a prop, so the account route
 * composes without knowing what a saved size is (STRUCT-02, MOD-01), and it reads
 * it on the SERVER, so the sizes are in the first response. Only the list with
 * its Forget buttons is a client leaf, and only when there is a list to show.
 *
 * A GUEST has none: §2.1 gives saved sizes to the Customer, and nothing is
 * stored for a Visitor.
 */
export async function AccountSavedSizes() {
  const [locale, messages, accountKey] = await Promise.all([
    getLocale(),
    getMessages(),
    currentAccountKey(),
  ]);
  const t = messages.savedSizes;
  const read = accountKey === null ? null : await fetchSavedSizes(accountKey, locale);

  // ERR-10 — logged once, here, where the failure becomes a sentence.
  if (read !== null && !read.ok) logApiError('account:saved-sizes', read.error);

  return (
    <section aria-labelledby="account-saved-sizes" className="mt-10">
      <h2 id="account-saved-sizes" className="text-fg text-lg font-medium">
        {t.heading}
      </h2>

      {read === null ? <p className="text-fg-muted mt-2">{t.guest}</p> : null}

      {/* On file and could not be READ — said as such, because reporting a
          customer's own sizes as none would be a lie. */}
      {read !== null && !read.ok ? <p className="text-fg-muted mt-2">{t.unavailable}</p> : null}

      {read !== null && read.ok ? <SavedSizeList initial={read.value} locale={locale} /> : null}
    </section>
  );
}
