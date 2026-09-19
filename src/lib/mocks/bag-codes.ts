import type { Locale } from '@/i18n/locales';

import { codeRejection, isKnownCode } from './bag-pricing';
import { summaryFor, type BagSummaryPayload } from './bag-projection';
import { activeCart, liftCodes, recordCode } from './cart-store';

/**
 * D1 — §16's promotional-code operations, split out of `bag-db.ts` (MOD-03).
 * Whether a code is valid and what it takes off is Pricing's answer
 * (`bag-pricing.ts`); this file records that a code was tried or lifted.
 */

export type CodeResult =
  { kind: 'APPLIED'; summary: BagSummaryPayload } | { kind: 'REJECTED'; reason: string };

/** The bag after a code change, or Pricing's refusal. */
function priced(cartId: string, locale: Locale): CodeResult {
  const summary = summaryFor(cartId, locale);
  return summary === null
    ? { kind: 'REJECTED', reason: codeRejection(locale) }
    : { kind: 'APPLIED', summary };
}

/** §16 `applyCode(cart, code)`. Validity is Pricing's answer, never the UI's. */
export function applyCode(cartId: string, code: string, locale: Locale): CodeResult {
  const normalised = code.trim().toUpperCase();

  if (activeCart(cartId) === null || !isKnownCode(normalised)) {
    return { kind: 'REJECTED', reason: codeRejection(locale) };
  }

  // D6 — the code before it is lifted, not overwritten.
  recordCode(cartId, normalised);
  return priced(cartId, locale);
}

/** Lifting a code. D6: recorded as lifted, never erased. */
export function removeCode(cartId: string, locale: Locale): CodeResult {
  liftCodes(cartId);
  return priced(cartId, locale);
}
