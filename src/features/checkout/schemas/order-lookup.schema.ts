import { z } from 'zod';

import { ADDRESS_RULES } from '@/lib/domain/address';
import { orderAccessTokenSchema } from '@/lib/domain/ids';

import { orderSchema } from './checkout.schema';

/**
 * SSOT-09 — §28.3's guest lookup "by number and mobile".
 *
 * An order number is an address, not a secret: they run in sequence. So a page
 * that cannot show who is asking — no account that placed the order, no token
 * issued to this browser — asks for the mobile number the order was placed with,
 * and the BACKEND compares it. The browser never holds the order's mobile to
 * compare against, and a wrong mobile gets exactly the answer an unknown number
 * gets.
 */

/**
 * What the lookup form sends. The mobile's SHAPE is checked here as an
 * affordance (FORM-03), by the rule checkout collected it with, so a typo is
 * caught before a round trip; whether it MATCHES is the backend's answer alone.
 */
export const orderLookupRequestSchema = z.object({
  mobile: ADDRESS_RULES.mobile,
});

export type OrderLookupRequest = z.infer<typeof orderLookupRequestSchema>;

/**
 * The backend's answer to a matching lookup: the order, and a fresh token so the
 * browser that proved it can come back without proving it again. The BFF keeps
 * the token and passes on only the order.
 */
export const orderLookupReplySchema = z.object({
  order: orderSchema,
  accessToken: orderAccessTokenSchema,
});

export type OrderLookupReply = z.infer<typeof orderLookupReplySchema>;
