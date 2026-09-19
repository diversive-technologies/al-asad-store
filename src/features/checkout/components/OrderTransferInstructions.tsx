import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { TransferInstructions } from '../schemas/checkout.schema';

export interface OrderTransferInstructionsProps {
  instructions: TransferInstructions;
  totalMinor: number;
  locale: Locale;
  messages: Messages;
}

/**
 * Where to send the money for an order paid by bank transfer, and what to write
 * on the transfer.
 *
 * Checkout offers the method as "transfer the total to our account", so the
 * order has to say which account — the confirmation used to show only the words
 * "Bank transfer", which left the customer nothing to pay into. Drawn from what
 * the ORDER carries, never from which method was chosen (§3.1).
 *
 * Every value is wrapped in `<bdi>`: account numbers, an IBAN and the order
 * number are Latin runs inside an Urdu page, and without isolation the bidi
 * algorithm can reorder the digits a customer is about to type into a bank app.
 */
export function OrderTransferInstructions({
  instructions,
  totalMinor,
  locale,
  messages,
}: OrderTransferInstructionsProps) {
  const t = messages.order;
  const rows = [
    { key: 'amount', label: t.transferAmount, value: formatMoneyMinor(totalMinor, locale) },
    { key: 'reference', label: t.transferReference, value: instructions.reference },
    { key: 'bank', label: t.transferBank, value: instructions.bankName },
    { key: 'title', label: t.transferAccountTitle, value: instructions.accountTitle },
    { key: 'number', label: t.transferAccountNumber, value: instructions.accountNumber },
    { key: 'iban', label: t.transferIban, value: instructions.iban },
  ];

  return (
    <div className="border-border rounded-card mt-3 border p-3">
      <h3 className="text-fg text-sm font-medium">{t.transferHeading}</h3>
      <p className="text-fg-muted mt-1 text-sm">{t.transferBody}</p>

      <dl className="mt-2 flex flex-col gap-1 text-sm">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-fg-muted">{row.label}</dt>
            <dd className="text-fg font-medium">
              <bdi>{row.value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
