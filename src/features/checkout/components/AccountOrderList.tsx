import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatDate, formatMoneyMinor, formatPlural, formatTemplate } from '@/lib/utils/format';

import { orderHistoryRowId } from '../lib/order-history';
import type { AccountOrder } from '../schemas/account-orders.schema';

export interface AccountOrderListProps {
  orders: readonly AccountOrder[];
  locale: Locale;
  messages: Messages;
}

/**
 * The rows of §28.3's order history: what was bought, when, and for how much,
 * each linking to the order's own page, which already exists and is already
 * bookmarkable — so this list points at it rather than repeating it.
 *
 * Each row carries an id by its place in the list, so "Show more" can land on the
 * first row it added rather than on the top of the page.
 */
export function AccountOrderList({ orders, locale, messages }: AccountOrderListProps) {
  const t = messages.account;

  return (
    <ul className="border-border mt-2 divide-y border-t">
      {orders.map((order, index) => (
        <li
          key={order.orderNumber}
          id={orderHistoryRowId(index + 1)}
          className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3"
        >
          <p className="text-fg text-sm font-medium">
            {/* I18N-04 — the number is Latin inside an Urdu line. */}
            <bdi>{order.orderNumber}</bdi>
          </p>
          <p className="text-fg-muted text-sm">{formatDate(order.placedAt, locale)}</p>
          {/*
           * I18N-06 — ONE parameterised message, not a name with a fragment
           * appended to it, so a translator can put the count first however
           * their language reads.
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
  );
}
