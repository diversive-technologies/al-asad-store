import type { Messages } from '@/i18n/messages/en';

import type { AddressBookError } from '../api/addresses-browser';

/**
 * Why a change to the book was refused, in the customer's language.
 *
 * MOD-04 — pure, and in one place because two surfaces report the same
 * refusals: the managed book and the offer after an order. A second copy of
 * this mapping would be a second place for a new kind to be forgotten (PD-01).
 *
 * The parameter is the UNION rather than `string`, which is the load-bearing
 * part: adding a kind to `AddressBookError` fails the build here instead of
 * quietly falling through to "please try again in a moment" — the mistake
 * `SIGNED_OUT` made, where a session that had ENDED was reported as a passing
 * network problem and the customer was told to retry something that could never
 * work until they signed in again.
 */
export function addressRefusal(kind: AddressBookError['kind'], t: Messages['account']): string {
  switch (kind) {
    case 'FULL':
      return t.addressesFull;
    case 'GONE':
      return t.addressGone;
    case 'SIGNED_OUT':
      return t.addressesSignedOut;
    case 'UNREACHABLE':
      return t.addressesUnavailable;
  }
}
