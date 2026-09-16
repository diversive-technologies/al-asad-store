import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { formatList, formatTemplate } from '@/lib/utils/format';

import type { PlaceOrderResult } from '../schemas/checkout.schema';

export interface CheckoutOutcomeAlertProps {
  outcome: PlaceOrderResult;
  locale: Locale;
  messages: Messages;
}

/**
 * Why the order did not go through, in the customer's words.
 *
 * §7.2's refusals are not errors: an expired hold, a moved price and
 * measurements saved again are the transaction doing exactly what it is
 * specified to do, and each carries what the customer has to see.
 *
 * The two switches below end in `assertNever`, which is the whole reason this is
 * its own file rather than four nested ternaries in the screen. The ternaries
 * are where `PAYMENT_FAILED` once fell through to "The total has changed" — the
 * interface telling somebody the wrong reason their order failed — and a
 * `default` branch would have hidden the next one just as quietly. A new outcome
 * is now a compile error.
 */
export function CheckoutOutcomeAlert({ outcome, locale, messages }: CheckoutOutcomeAlertProps) {
  const t = messages.checkout;

  if (outcome.kind === 'PLACED') return null;

  return (
    // A11Y-05 / ERR-04: announced, and specific about what happened.
    <div role="alert" className="border-danger-500 bg-surface-muted rounded-card mt-6 border p-4">
      <h2 className="text-fg text-sm font-medium">{titleFor(outcome, t)}</h2>
      <p className="text-fg-muted mt-1 text-sm">{bodyFor(outcome, locale, t)}</p>

      {/* Both of these are fixed in the BAG, so that is where the way out goes. */}
      {outcome.kind === 'RESERVATION_EXPIRED' || outcome.kind === 'MEASUREMENTS_CHANGED' ? (
        <div className="mt-3">
          <ButtonLink href={ROUTES.bag} variant="secondary">
            {t.backToBag}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function titleFor(outcome: PlaceOrderResult, t: Messages['checkout']): string {
  switch (outcome.kind) {
    case 'PLACED':
      return '';
    case 'RESERVATION_EXPIRED':
      return t.expiredTitle;
    case 'PRICE_CHANGED':
      return t.priceChangedTitle;
    case 'MEASUREMENTS_CHANGED':
      return t.measurementsChangedTitle;
    case 'PAYMENT_FAILED':
      return t.failedTitle;
    default:
      return assertNever(outcome);
  }
}

function bodyFor(outcome: PlaceOrderResult, locale: Locale, t: Messages['checkout']): string {
  switch (outcome.kind) {
    case 'PLACED':
      return '';
    case 'RESERVATION_EXPIRED':
      // I18N-06: the locale's own list conjunction, not a hard-coded comma.
      return formatTemplate(t.expiredBody, { items: formatList(outcome.expiredItems, locale) });
    case 'PRICE_CHANGED':
      return t.priceChangedBody;
    case 'MEASUREMENTS_CHANGED':
      return formatTemplate(t.measurementsChangedBody, {
        items: formatList(outcome.restitchedItems, locale),
      });
    case 'PAYMENT_FAILED':
      // ERR-11: the backend's own reason, which is authored copy on that side.
      return outcome.reason;
    default:
      return assertNever(outcome);
  }
}
