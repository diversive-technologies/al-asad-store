import { z } from 'zod';

import { CLIENT } from '@/config/client';

/**
 * What a delivery address is, written ONCE.
 *
 * In the domain layer rather than in a feature (STRUCT-05), for the reason
 * `style-offer.ts` is: checkout collects an address every time an order is
 * placed, and the account keeps a book of them. The plan's requirement is that
 * the book holds "the same fields checkout validates today so nothing is
 * validated twice" — so the RULES live here and each schema names its own
 * fields from them. Checkout keeps `contactName` / `addressLine`; a saved
 * address says `recipientName` / `line`; neither owns the rule.
 *
 * D5 — the mobile pattern is client configuration, not a domain constant, so a
 * deployment in another market changes `CLIENT.market.mobile` and not this file.
 *
 * FORM-03 / SEC-03: these are affordances. Java validates the same fields and
 * is the authority.
 *
 * The MAXIMUMS exist for SEC-02 — the length of a free-text field is untrusted
 * input — and not to discipline anybody, so they sit well above what a person
 * writes. An address here is descriptive, landmarks and all ("opposite the
 * second turn after the roundabout, ring the upper bell"), and a bound a real
 * address could meet would fire the same one-line error that means "you left
 * this empty".
 */
export const ADDRESS_RULES = {
  /** Who receives it. Not necessarily the account holder — people send gifts. */
  name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().regex(CLIENT.market.mobile.pattern),
  /**
   * House, street and area as one line, because that is how an address is
   * written and read here. There is no postcode in this market's addresses and
   * inventing a field for one would ask for something nobody has.
   */
  line: z.string().trim().min(6).max(300),
  city: z.string().trim().min(2).max(120),
} as const;

/**
 * The four fields as a saved address names them.
 *
 * A saved address carries the RECIPIENT as well as the place, because filling
 * "deliver to my mother in Multan" has to fill the name and the number too —
 * and because §6.5 snapshots `contact_name` and `contact_mobile` onto the order
 * beside `delivery_address` and `delivery_city`, so all four travel together
 * whatever the interface calls them.
 *
 * Email is deliberately NOT here. The order does not record one (§6.5 keeps it
 * on the contact block and the mock drops it), and an email address belongs to
 * a person rather than to a place.
 */
export const addressDetailSchema = z.object({
  recipientName: ADDRESS_RULES.name,
  recipientMobile: ADDRESS_RULES.mobile,
  line: ADDRESS_RULES.line,
  city: ADDRESS_RULES.city,
});

export type AddressDetail = z.infer<typeof addressDetailSchema>;
