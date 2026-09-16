import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { currentAccountKey } from '@/features/auth/server';
import { logApiError } from '@/lib/utils/log';
import { getLocale, getMessages } from '@/i18n';
import { formatDate, formatMoneyMinor, formatPlural, formatTemplate } from '@/lib/utils/format';

import { fetchAccountOrders } from '../api/checkout-server';

/**
 * §28.3 — what this customer has bought.
 *
 * It reads its own list rather than taking it as a prop, so the account route
 * composes without knowing what an order is (STRUCT-02, MOD-01), and it reads it
 * on the SERVER, so this section ships no JavaScript.
 *
 * A LIST, not tracking. Order tracking is out of the MVP by operator decision —
 * there is no flow behind a status and copy describing one would be a promise
 * nothing can keep — so each row says what was bought, when, and for how much,
 * and links to the order's own page.
 *
 * A GUEST sees none of it, and is told why rather than shown an empty list: a
 * guest order carries no customer (§6.5) and is found by its number, which is
 * the only thing that addresses it (§28.3).
 */
export async function AccountOrders() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const t = messages.account;
  const accountKey = await currentAccountKey();
  const history = accountKey === null ? null : await fetchAccountOrders(accountKey);

  /* ERR-10 — logged ONCE, at the boundary that handles it. The `Result` stops
     here, so a history nobody could read would otherwise be a sentence on a page
     and nothing in the log to say why. */
  if (history !== null && !history.ok) logApiError('account:orders', history.error);

  return (
    <section aria-labelledby="account-orders" className="mt-10">
      <h2 id="account-orders" className="text-fg text-lg font-medium">
        {t.ordersHeading}
      </h2>

      {history === null ? <p className="text-fg-muted mt-2">{t.ordersGuestBody}</p> : null}

      {/* On file and could not be READ — said as such, because reporting a
          customer's own orders as none would be a lie about their record. */}
      {history !== null && !history.ok ? (
        <p className="text-fg-muted mt-2">{t.ordersUnavailable}</p>
      ) : null}

      {history !== null && history.ok && history.value.orders.length === 0 ? (
        <div className="mt-2 flex flex-col items-start gap-3">
          <p className="text-fg-muted">{t.ordersEmpty}</p>
          <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
            {messages.catalogue.browseAll}
          </ButtonLink>
        </div>
      ) : null}

      {history !== null && history.ok && history.value.orders.length > 0 ? (
        <ul className="border-border mt-2 divide-y border-t">
          {history.value.orders.map((order) => (
            <li
              key={order.orderNumber}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3"
            >
              <p className="text-fg text-sm font-medium">
                {/* I18N-04 — the number is Latin inside an Urdu line. */}
                <bdi>{order.orderNumber}</bdi>
              </p>
              <p className="text-fg-muted text-sm">{formatDate(order.placedAt, locale)}</p>
              {/*
               * I18N-06 — ONE parameterised message, not a name with a fragment
               * appended to it. The first version emitted the product, then a
               * literal space, then "and 2 more", which fixes the word order in
               * TSX: a translator could never put the count first, however
               * their language reads, because the name was already on the page
               * before the message was looked up.
               */}
              <p className="text-fg-muted grow text-sm">
                <bdi>
                  {order.lineCount > 1
                    ? formatTemplate(formatPlural(t.ordersMoreItems, order.lineCount - 1, locale), {
                        item: order.firstItem,
                      })
                    : order.firstItem}
                </bdi>
              </p>
              <p className="text-fg text-sm">{formatMoneyMinor(order.totalMinor, locale)}</p>
              {/* The order's own page already exists and is already bookmarkable
                  (§28.3), so this list points at it rather than repeating it. */}
              <ButtonLink
                href={ROUTES.orderConfirmation(order.orderNumber)}
                variant="secondary"
                size="sm"
              >
                {t.ordersView}
              </ButtonLink>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
