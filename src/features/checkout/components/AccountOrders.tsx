import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { currentAccountKey } from '@/features/auth/server';
import { getLocale, getMessages } from '@/i18n';
import { logApiError } from '@/lib/utils/log';

import { fetchAccountOrders } from '../api/checkout-server';
import {
  nextOrderHistoryLink,
  ORDER_HISTORY_SECTION_ID,
  orderHistoryPage,
  parseOrderHistoryView,
  type OrderHistoryParams,
} from '../lib/order-history';
import { AccountOrderList } from './AccountOrderList';
import { AccountOrdersPaging } from './AccountOrdersPaging';

export interface AccountOrdersProps {
  /** The account page's own address, which says how much of the history is shown. */
  searchParams: OrderHistoryParams;
}

/**
 * §28.3 — what this customer has bought.
 *
 * It reads its own list rather than taking it as a prop, so the account route
 * composes without knowing what an order is (STRUCT-02, MOD-01), and it reads it
 * on the SERVER, so this section ships no JavaScript — "Show more" included,
 * which is a link to the same page showing more (PERF-03).
 *
 * A LIST, not tracking: each row says what was bought, when, and for how much.
 * A GUEST sees none of it, and is told why rather than shown an empty list: a
 * guest order carries no customer (§6.5) and is found by its number (§28.3).
 */
export async function AccountOrders({ searchParams }: AccountOrdersProps) {
  const [locale, messages, accountKey] = await Promise.all([
    getLocale(),
    getMessages(),
    currentAccountKey(),
  ]);
  const t = messages.account;
  const view = parseOrderHistoryView(searchParams);
  const history =
    accountKey === null ? null : await fetchAccountOrders(accountKey, orderHistoryPage(view));

  /* ERR-10 — logged ONCE, at the boundary that handles it. */
  if (history !== null && !history.ok) logApiError('account:orders', history.error);
  const page = history !== null && history.ok ? history.value : null;

  return (
    <section aria-labelledby={ORDER_HISTORY_SECTION_ID} className="mt-10">
      <h2 id={ORDER_HISTORY_SECTION_ID} className="text-fg text-lg font-medium">
        {t.ordersHeading}
      </h2>

      {history === null ? <p className="text-fg-muted mt-2">{t.ordersGuestBody}</p> : null}

      {/* On file and could not be READ — said as such, because reporting a
          customer's own orders as none would be a lie about their record. */}
      {history !== null && !history.ok ? (
        <p className="text-fg-muted mt-2">{t.ordersUnavailable}</p>
      ) : null}

      {page !== null && page.orders.length === 0 && view.after === null ? (
        <div className="mt-2 flex flex-col items-start gap-3">
          <p className="text-fg-muted">{t.ordersEmpty}</p>
          <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
            {messages.catalogue.browseAll}
          </ButtonLink>
        </div>
      ) : null}

      {page !== null && page.orders.length === 0 && view.after !== null ? (
        <p className="text-fg-muted mt-2">{t.ordersNoneOlder}</p>
      ) : null}

      {page === null || page.orders.length === 0 ? null : (
        <AccountOrderList orders={page.orders} locale={locale} messages={messages} />
      )}

      {page === null ? null : (
        <AccountOrdersPaging
          next={nextOrderHistoryLink(view, page.nextCursor)}
          isPastNewest={view.after !== null}
          messages={messages}
        />
      )}
    </section>
  );
}
