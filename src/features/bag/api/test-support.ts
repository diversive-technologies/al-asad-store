import type { z } from 'zod';

import { API_HEADERS } from '@/lib/api/headers';
import {
  cartIdSchema,
  cartLineIdSchema,
  pieceIdSchema,
  productIdSchema,
  sizeIdSchema,
} from '@/lib/domain/ids';

import { bagSummarySchema, type bagLineSchema, type BagSummary } from '../schemas/bag.schema';

/**
 * Test support — for the tests that run the bag's server calls against per-test
 * handlers at the HTTP layer (TEST-04): the smallest bag the §16 contract
 * admits, the ids a cart and its line are addressed by, and a record of what
 * reached the backend. Imported by tests only; nothing in the bag may import it.
 *
 * The bag is written in the WIRE shape and parsed through `bagSummarySchema`
 * (SSOT-09), so an answer built from it is one the real client accepts, and a
 * field the contract gains is added here once rather than in every test that
 * answers with a bag (PD-01). The words are placeholders, never a product the
 * store sells (SEC-10).
 */

type BagLineWire = z.input<typeof bagLineSchema>;
type BagSummaryWire = z.input<typeof bagSummarySchema>;

/** The cart this browser's cookie names: a UUID, as the contract requires, and plainly not a real one. */
export const CART_ID = cartIdSchema.parse('00000000-0000-4000-8000-00000000ca01');

/** The one line in it. */
export const LINE_ID = cartLineIdSchema.parse('00000000-0000-4000-8000-00000000c1e1');

/** §7.3 — when the line's hold lapses. */
const HELD_UNTIL = '2026-09-28T10:15:00.000Z';

/** A one-piece garment picked off the shelf in one size, with a live hold. */
export const STOCK_LINE = {
  id: LINE_ID,
  productId: productIdSchema.parse('00000000-0000-4000-8000-00000000f001'),
  slug: 'fixture-kurta',
  name: 'Fixture kurta',
  imageUrl: '/placeholders/fixture-kurta.avif',
  type: 'SIMPLE',
  pieces: [
    {
      pieceId: pieceIdSchema.parse('00000000-0000-4000-8000-00000000e001'),
      name: 'Kurta',
      sizeId: sizeIdSchema.parse('00000000-0000-4000-8000-00000000d002'),
      sizeLabel: 'M',
    },
  ],
  quantity: 1,
  unitPriceMinor: 349_900,
  lineTotalMinor: 349_900,
  reservationExpiresAt: HELD_UNTIL,
  stitching: null,
  movableToWishlist: true,
} satisfies BagLineWire;

/** The bag holding that one line — what an add answers with once it has reserved. */
export const BAG_WITH_LINE: BagSummary = bagSummarySchema.parse({
  lines: [STOCK_LINE],
  heldUntil: HELD_UNTIL,
  itemCount: 1,
  pricing: {
    subtotalMinor: 349_900,
    discountMinor: 0,
    deliveryMinor: 25_000,
    totalMinor: 374_900,
    appliedCode: null,
  },
  freeDelivery: { thresholdMinor: 500_000, remainingMinor: 150_100, isMet: false },
} satisfies BagSummaryWire);

/**
 * One request as the backend received it — enough to say what the storefront
 * SENT as well as what it made of the answer. The house pattern of
 * `lib/api/client.test.ts`, cut to what a bag call carries.
 */
export interface Sent {
  readonly method: string;
  readonly path: string;
  readonly locale: string | null;
  /** The account the saved items travel under (`API_HEADERS.accountKey`). */
  readonly account: string | null;
  /** The JSON body, or `null` for none. */
  readonly body: unknown;
}

/** A resolver that records the request into `sink`, then answers with `respond()`. */
export function recordInto<TResponse extends Response>(sink: Sent[], respond: () => TResponse) {
  return async ({ request }: { request: Request }): Promise<TResponse> => {
    const url = new URL(request.url);
    const text = await request.clone().text();
    sink.push({
      method: request.method,
      path: url.pathname,
      locale: url.searchParams.get('locale'),
      account: request.headers.get(API_HEADERS.accountKey),
      body: text.length === 0 ? null : JSON.parse(text),
    });
    return respond();
  };
}

/** Each request as `METHOD /path`, in the order the backend received them. */
export function trail(sink: readonly Sent[]): string[] {
  return sink.map(({ method, path }) => `${method} ${path}`);
}
