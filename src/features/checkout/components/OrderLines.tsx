import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor, formatNumber, formatTemplate } from '@/lib/utils/format';

import type { OrderLine } from '../schemas/checkout.schema';
import { OrderLineStitching } from './OrderLineStitching';

export interface OrderLinesProps {
  lines: readonly OrderLine[];
  locale: Locale;
  messages: Messages;
}

/**
 * What was bought — the SNAPSHOT (§6.5). Renaming a product later must not change
 * what this order says was bought, so every name here is the one it had then.
 */
export function OrderLines({ lines, locale, messages }: OrderLinesProps) {
  return (
    <>
      <h2 className="text-fg mt-8 text-sm font-medium">{messages.order.itemsHeading}</h2>
      <ul className="border-border mt-2 divide-y border-t">
        {lines.map((line, index) => (
          <li
            key={`${line.productCode}-${String(index)}`}
            className="flex items-start justify-between gap-4 py-3"
          >
            <div>
              <p className="text-fg text-sm">{line.productName}</p>
              <ul className="text-fg-muted text-xs">
                {line.pieces.map((piece) => (
                  <li key={piece.pieceCode}>
                    {piece.name} · {piece.size}
                  </li>
                ))}
              </ul>

              {line.stitching === null ? null : (
                <OrderLineStitching
                  stitching={line.stitching}
                  locale={locale}
                  messages={messages}
                />
              )}
              <p className="text-fg-muted mt-1 text-xs">
                {formatTemplate(messages.order.quantityTimes, {
                  count: formatNumber(line.quantity, locale),
                })}
              </p>
            </div>
            <p className="text-fg shrink-0 text-sm">
              {formatMoneyMinor(line.lineTotalMinor, locale)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
