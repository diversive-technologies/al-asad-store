import type { AddressDetail } from '@/lib/domain/address';

/**
 * The four fields a form edits, without a saved address's own bookkeeping — MOD-04,
 * React-free. The book, its picker and its editor each needed it, and held a copy
 * apiece (PD-01).
 */
export function detailOf(address: AddressDetail): AddressDetail {
  return {
    recipientName: address.recipientName,
    recipientMobile: address.recipientMobile,
    line: address.line,
    city: address.city,
  };
}

/**
 * Whether the book already holds this address, field for field — so a customer is
 * never invited to save a second copy of the one they picked a minute earlier.
 */
export function holdsAddress(book: readonly AddressDetail[], address: AddressDetail): boolean {
  return book.some(
    (held) =>
      held.line === address.line &&
      held.city === address.city &&
      held.recipientName === address.recipientName &&
      held.recipientMobile === address.recipientMobile,
  );
}
