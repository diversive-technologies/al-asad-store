import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatDate, formatMoneyMinor } from '@/lib/utils/format';

import type { Order } from '../schemas/checkout.schema';
import { OrderPlacedHero } from './OrderPlacedHero';
import { OrderSummary } from './OrderSummary';

export interface OrderConfirmationProps {
  order: Order;
  locale: Locale;
  messages: Messages;
}

/**
 * The order, once it exists.
 *
 * Note what is NOT here: any branch on the payment method. Cash on Delivery
 * waits for an SMS reply, a card is already authorised, a bank transfer needs a
 * reference — three different things to tell the customer, and all three arrive
 * as `order.nextStep`, written by the method that knows (§3.1: "Checkout must
 * not contain a conditional per method"). A fifth method needs no change here.
 *
 * A Server Component: it reads once and nothing on it moves.
 */
export function OrderConfirmation({ order, locale, messages }: OrderConfirmationProps) {
  const t = messages.order;

  return (
    <section className="page-shell max-w-3xl py-12">
      <OrderPlacedHero
        title={t.title}
        orderNumberLabel={t.numberLabel}
        orderNumber={order.orderNumber}
        placedLabel={t.placedLabel}
        placedAt={formatDate(order.placedAt, locale)}
      />

      <div className="bg-surface-muted rounded-card mt-8 p-5">
        <h2 className="text-fg text-sm font-medium">{t.nextHeading}</h2>
        {/*
         * Written by the payment method, not chosen here — which is what keeps
         * this page free of a conditional per method (§3.1).
         */}
        <p className="text-fg-muted mt-1 text-sm">{order.nextStep}</p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-fg text-sm font-medium">{t.deliveringTo}</h2>
          <p className="text-fg-muted mt-1 text-sm">{order.contactName}</p>
          <p className="text-fg-muted text-sm">{order.deliveryAddress}</p>
          <p className="text-fg-muted text-sm">{order.deliveryCity}</p>
          <p className="text-fg-muted text-sm">{order.contactMobile}</p>
          <p className="text-fg-muted mt-2 text-sm">{order.deliveryLabel}</p>
        </div>

        <div>
          <h2 className="text-fg text-sm font-medium">{t.paymentLabel}</h2>
          <p className="text-fg-muted mt-1 text-sm">{order.paymentLabel}</p>
          {!order.isGift ? null : (
            <>
              <p className="text-fg-muted mt-2 text-sm">{t.giftNote}</p>
              {order.giftMessage.length === 0 ? null : (
                <p className="text-fg-muted text-sm italic">“{order.giftMessage}”</p>
              )}
            </>
          )}
        </div>
      </div>

      <h2 className="text-fg mt-8 text-sm font-medium">{t.itemsHeading}</h2>
      <ul className="border-border mt-2 divide-y border-t">
        {order.lines.map((line) => (
          <li key={line.productCode} className="flex items-start justify-between gap-4 py-3">
            <div>
              {/* The SNAPSHOT (§6.5). Renaming the product later must not change
                  what this order says was bought. */}
              <p className="text-fg text-sm">{line.productName}</p>
              <ul className="text-fg-muted text-xs">
                {line.pieces.map((piece) => (
                  <li key={piece.pieceCode}>
                    {piece.name} · {piece.size}
                  </li>
                ))}
              </ul>
              <p className="text-fg-muted mt-1 text-xs">× {line.quantity}</p>
            </div>
            <p className="text-fg shrink-0 text-sm">
              {formatMoneyMinor(line.lineTotalMinor, locale)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 max-w-sm">
        <OrderSummary totals={order.totals} locale={locale} messages={messages} />
      </div>

      <p className="text-fg-muted mt-6 text-xs">{t.keepNumber}</p>

      <div className="mt-6 flex justify-center">
        {/* Primary: it is the only thing to DO on this page, and the muted
            variant read as a disabled control rather than an invitation. */}
        <ButtonLink href={ROUTES.catalogue.list} variant="primary" size="lg">
          {t.continueShopping}
        </ButtonLink>
      </div>
    </section>
  );
}
