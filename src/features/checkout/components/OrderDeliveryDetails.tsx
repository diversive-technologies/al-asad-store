import { SaveAddressOffer } from '@/features/addresses/contract';
import type { Messages } from '@/i18n/messages/en';

import type { Order } from '../schemas/checkout.schema';

export interface OrderDeliveryDetailsProps {
  order: Order;
  messages: Messages;
}

/** Where the order is going, as it was snapshotted at placement (§6.5). */
export function OrderDeliveryDetails({ order, messages }: OrderDeliveryDetailsProps) {
  const t = messages.order;

  return (
    <div>
      <h2 className="text-fg text-sm font-medium">{t.deliveringTo}</h2>
      <p className="text-fg-muted mt-1 text-sm">{order.contactName}</p>
      <p className="text-fg-muted text-sm">{order.deliveryAddress}</p>
      <p className="text-fg-muted text-sm">{order.deliveryCity}</p>
      {/* I18N-04 — isolated, or "0300 1234567" reorders to "1234567 0300" in Urdu. */}
      <p className="text-fg-muted text-sm">
        <bdi>{order.contactMobile}</bdi>
      </p>
      <p className="text-fg-muted mt-2 text-sm">{order.deliveryLabel}</p>

      {/*
       * §28.3 — offered AFTER the order, never during it: §7.2 has no address
       * step and its own rule keeps non-critical work outside the commit.
       *
       * The rename is §6.5's: an order snapshots `delivery_address` and
       * `delivery_city` beside its contact block, and a saved address calls the
       * same four fields by its own names.
       */}
      <SaveAddressOffer
        messages={messages}
        address={{
          recipientName: order.contactName,
          recipientMobile: order.contactMobile,
          line: order.deliveryAddress,
          city: order.deliveryCity,
        }}
      />
    </div>
  );
}
