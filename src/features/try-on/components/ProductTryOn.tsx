import type { ApiError } from '@/lib/api/errors';
import type { ProductId } from '@/lib/domain/ids';
import type { Result } from '@/lib/result';
import { logApiError } from '@/lib/utils/log';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { TryOnOffer } from '../schemas/try-on.schema';
import { TryOnLauncher } from './TryOnLauncher';

export interface ProductTryOnProps {
  offer: Result<TryOnOffer, ApiError>;
  productId: ProductId;
  productName: string;
  locale: Locale;
  messages: Messages;
}

/**
 * The try-on entry on the product page — a Server Component, so deciding what to
 * pass down costs the browser nothing.
 *
 * It takes the offer as a RESULT rather than fetching it, so the route can read
 * it alongside the product in one `Promise.all` (PERF-02) while the handling of
 * a failed read stays here (STRUCT-02).
 *
 * ## The entry is always drawn
 *
 * An earlier version hid it whenever the backend reported no provider, on the
 * reasoning that a control which cannot work should not be offered. That is
 * defensible for an ordinary feature and wrong for this one: the try-on is a
 * headline capability of the store, and a version of the page that silently has
 * no trace of it cannot be shown, demonstrated or reviewed. So the button is
 * always there, and the dialog is honest about the state behind it — it says
 * plainly, before a photograph is chosen, when no provider is connected.
 *
 * §30.2 and ADR 12 are untouched by that: nothing here is on the purchase path,
 * an unreachable module still costs only this feature, and the page renders and
 * Add to Bag works whatever the offer said.
 *
 * A failed read yields a NULL offer rather than a substituted one. The offer
 * carries the upload limits, and inventing a fallback ceiling would be a second
 * copy of a backend rule that drifts the first time the operator retunes the
 * real one (DATA-13). The panel simply does not pre-check; the module enforces.
 */
export function ProductTryOn({
  offer,
  productId,
  productName,
  locale,
  messages,
}: ProductTryOnProps) {
  if (!offer.ok) logApiError('product:try-on', offer.error); // ERR-10

  return (
    <TryOnLauncher
      productId={productId}
      productName={productName}
      offer={offer.ok ? offer.value : null}
      locale={locale}
      messages={messages}
    />
  );
}
