import type { Ref } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatDate, formatTemplate } from '@/lib/utils/format';

import type { Order } from '../schemas/checkout.schema';
import { OrderDeliveryDetails } from './OrderDeliveryDetails';
import { OrderLines } from './OrderLines';
import { OrderPaymentDetails } from './OrderPaymentDetails';
import { OrderPlacedHero } from './OrderPlacedHero';
import { OrderSummary } from './OrderSummary';

export interface OrderConfirmationProps {
  order: Order;
  locale: Locale;
  messages: Messages;
  /** Handed to the page heading, for a page that moves focus there. */
  headingRef?: Ref<HTMLHeadingElement> | undefined;
}

/**
 * The order, once it exists.
 *
 * There is no "what happens next" section, and that is deliberate rather than
 * missing: this MVP has no confirmation step and no order tracking, so anything
 * written there would be a promise nothing behind it can keep. What the page
 * does say is what is already true — the order exists, here is its number, here
 * is what was bought, and, for a transfer, where the money goes.
 *
 * It is rendered by `OrderScreen`, which reads the order in the browser, so it
 * is part of that client subtree. Nothing here holds state of its own: the mark
 * at the top animates in CSS and the one control is a leaf of its own.
 */
export function OrderConfirmation({ order, locale, messages, headingRef }: OrderConfirmationProps) {
  const t = messages.order;

  return (
    <section className="page-shell max-w-3xl py-12">
      <OrderPlacedHero
        title={t.title}
        orderNumberLabel={t.numberLabel}
        orderNumber={order.orderNumber}
        placedLine={formatTemplate(t.placedOn, { date: formatDate(order.placedAt, locale) })}
        headingRef={headingRef}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <OrderDeliveryDetails order={order} messages={messages} />
        <OrderPaymentDetails order={order} locale={locale} messages={messages} />
      </div>

      <OrderLines lines={order.lines} locale={locale} messages={messages} />

      <div className="mt-6 max-w-sm">
        <OrderSummary totals={order.totals} locale={locale} messages={messages} />
      </div>

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
