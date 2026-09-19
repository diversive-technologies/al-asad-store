import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import type { Order } from '../schemas/checkout.schema';
import { OrderTransferInstructions } from './OrderTransferInstructions';

export interface OrderPaymentDetailsProps {
  order: Order;
  locale: Locale;
  messages: Messages;
}

/** How the order is paid for — and, for a transfer, where to pay — and whether it is a gift. */
export function OrderPaymentDetails({ order, locale, messages }: OrderPaymentDetailsProps) {
  const t = messages.order;

  return (
    <div>
      <h2 className="text-fg text-sm font-medium">{t.paymentLabel}</h2>
      <p className="text-fg-muted mt-1 text-sm">{order.paymentLabel}</p>

      {order.transferInstructions === null ? null : (
        <OrderTransferInstructions
          instructions={order.transferInstructions}
          totalMinor={order.totals.totalMinor}
          locale={locale}
          messages={messages}
        />
      )}

      {!order.isGift ? null : (
        <>
          <p className="text-fg-muted mt-2 text-sm">{t.giftNote}</p>
          {order.giftMessage.length === 0 ? null : (
            <p className="text-fg-muted text-sm italic">
              {formatTemplate(t.giftMessageQuoted, { message: order.giftMessage })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
