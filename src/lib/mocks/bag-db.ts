import type { Locale } from '@/i18n/locales';

import { CATALOGUE } from './catalogue-db';
import { expiryFor, release, releaseCart, reserve, type ReservationKey } from './bag-reservations';
import { toProductDetail } from './product-detail-db';

/**
 * D1 — architecture §16 `CartService`, standing in for the Java module.
 *
 * The reservation transaction lives next door in `bag-reservations.ts`; this
 * file owns carts, lines and the money. The split follows §16's own note: Cart
 * "carries the composite logic" of knowing a set is a set, while Inventory
 * "reserves whatever keys it is handed and has no opinion about whether they
 * form a set". `toKeys` below is the whole of that composite logic.
 *
 * DATA-13 is why the pricing constants are HERE and not in the frontend: the
 * free-delivery threshold, the delivery charge and the promotional codes are
 * all commercial settings the operator changes in an admin panel, and a copy on
 * the other side of the wire would drift the first time they did.
 */

/** Pricing settings the operator owns. Minor units throughout (DATA-11). */
const DELIVERY_CHARGE_MINOR = 25_000;
const FREE_DELIVERY_THRESHOLD_MINOR = 1_500_000;

interface PromoCode {
  /** Either a percentage off the subtotal, or a flat amount. Never both. */
  readonly kind: 'PERCENT' | 'FLAT';
  readonly value: number;
  readonly description: Record<Locale, string>;
}

const PROMO_CODES: Record<string, PromoCode> = {
  EID10: {
    kind: 'PERCENT',
    value: 10,
    description: { en: '10% off your order', ur: 'آپ کے آرڈر پر 10٪ رعایت' },
  },
  WELCOME500: {
    kind: 'FLAT',
    value: 50_000,
    description: { en: 'Rs 500 off your first order', ur: 'پہلے آرڈر پر 500 روپے کی رعایت' },
  },
};

const REJECTION: Record<Locale, string> = {
  en: 'That code is not valid.',
  ur: 'یہ کوڈ درست نہیں ہے۔',
};

interface CartLineRecord {
  id: string;
  productId: string;
  selections: readonly { pieceId: string; sizeId: string }[];
  quantity: number;
}

const CARTS = new Map<string, CartLineRecord[]>();
const CART_CODES = new Map<string, string>();

let nextId = 0;

/** Deterministic, RFC-4122-shaped so the schemas' `z.uuid()` accepts them. */
function mockId(group: string): string {
  nextId += 1;
  return `b1c2d3e4-${group}-4c8a-8f21-${String(nextId).padStart(12, '0')}`;
}

export function createCart(): string {
  const id = mockId('0001');
  CARTS.set(id, []);
  return id;
}

export function cartExists(cartId: string): boolean {
  return CARTS.has(cartId);
}

export function discardCart(cartId: string): void {
  releaseCart(cartId);
  CARTS.delete(cartId);
  CART_CODES.delete(cartId);
}

/**
 * §16 — the one place that knows a set is a set.
 *
 * A three-piece SET becomes three keys and a SIMPLE product becomes one; both
 * are handed to the same reservation routine, which has no idea which it got.
 */
function toKeys(line: CartLineRecord): ReservationKey[] {
  return line.selections.map((selection) => ({ ...selection, quantity: line.quantity }));
}

function sameSelections(
  left: readonly { pieceId: string; sizeId: string }[],
  right: readonly { pieceId: string; sizeId: string }[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((selection) =>
    right.some((other) => other.pieceId === selection.pieceId && other.sizeId === selection.sizeId),
  );
}

export interface BagLinePayload {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  type: 'SIMPLE' | 'SET';
  pieces: { pieceId: string; name: string; sizeId: string; sizeLabel: string }[];
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  reservationExpiresAt: string;
}

export interface BagSummaryPayload {
  lines: BagLinePayload[];
  itemCount: number;
  pricing: {
    subtotalMinor: number;
    discountMinor: number;
    deliveryMinor: number;
    totalMinor: number;
    appliedCode: { code: string; description: string } | null;
  };
  freeDelivery: { thresholdMinor: number; remainingMinor: number; isMet: boolean };
}

function toLinePayload(line: CartLineRecord, locale: Locale): BagLinePayload | null {
  const record = CATALOGUE.find((entry) => entry.id === line.productId);
  if (record === undefined) return null;

  const detail = toProductDetail(record, locale);
  const expiresAt = expiryFor(line.id);
  // A line whose hold has lapsed is no longer a line (§16: "Every line holds a
  // live reservation"), so it drops out of the summary rather than showing as
  // an item the customer no longer has.
  if (expiresAt === null) return null;

  const pieces = line.selections.flatMap((selection) => {
    const piece = detail.pieces.find((entry) => entry.id === selection.pieceId);
    const size = piece?.sizes.find((entry) => entry.id === selection.sizeId);
    if (piece === undefined || size === undefined) return [];
    return [{ pieceId: piece.id, name: piece.name, sizeId: size.id, sizeLabel: size.label }];
  });

  return {
    id: line.id,
    productId: record.id,
    slug: record.slug,
    name: detail.name,
    imageUrl: detail.media[0]?.url ?? '',
    type: record.type,
    pieces,
    quantity: line.quantity,
    unitPriceMinor: record.currentMinor,
    // Stated, not derived on the other side of the wire (DATA-13).
    lineTotalMinor: record.currentMinor * line.quantity,
    reservationExpiresAt: new Date(expiresAt).toISOString(),
  };
}

function priceCart(cartId: string, lines: BagLinePayload[], locale: Locale) {
  const subtotalMinor = lines.reduce((total, line) => total + line.lineTotalMinor, 0);

  const code = CART_CODES.get(cartId);
  const promo = code === undefined ? undefined : PROMO_CODES[code];

  const discountMinor =
    promo === undefined
      ? 0
      : promo.kind === 'PERCENT'
        ? Math.round((subtotalMinor * promo.value) / 100)
        : Math.min(promo.value, subtotalMinor);

  const payable = subtotalMinor - discountMinor;
  const isMet = payable >= FREE_DELIVERY_THRESHOLD_MINOR;

  // An empty bag is not "free delivery earned"; it has nothing to deliver.
  const deliveryMinor = lines.length === 0 || isMet ? 0 : DELIVERY_CHARGE_MINOR;

  return {
    pricing: {
      subtotalMinor,
      discountMinor,
      deliveryMinor,
      totalMinor: payable + deliveryMinor,
      appliedCode:
        code === undefined || promo === undefined
          ? null
          : { code, description: promo.description[locale] },
    },
    freeDelivery: {
      thresholdMinor: FREE_DELIVERY_THRESHOLD_MINOR,
      remainingMinor: Math.max(0, FREE_DELIVERY_THRESHOLD_MINOR - payable),
      isMet: isMet && lines.length > 0,
    },
  };
}

/** §16 `summary(cart) -> {lines[], pricing, freeDeliveryProgress}`. */
export function summaryFor(cartId: string, locale: Locale): BagSummaryPayload | null {
  const stored = CARTS.get(cartId);
  if (stored === undefined) return null;

  const lines = stored.flatMap((line) => toLinePayload(line, locale) ?? []);

  // Lines whose holds lapsed are dropped above; drop the records too, so the
  // cart does not keep re-deriving a line the customer can no longer see.
  if (lines.length !== stored.length) {
    CARTS.set(
      cartId,
      stored.filter((line) => lines.some((payload) => payload.id === line.id)),
    );
  }

  return {
    lines,
    // A set counts as one item. Whether it counts as three is the operator's
    // call, which is exactly why the number is stated rather than summed
    // client-side.
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    ...priceCart(cartId, lines, locale),
  };
}

export type CartWriteResult =
  | { kind: 'ADDED'; summary: BagSummaryPayload }
  | { kind: 'UNAVAILABLE'; pieceId: string; pieceName: string; sizeLabel: string }
  | { kind: 'NOT_FOUND' };

/** Names the piece that failed, in the customer's language (§7.1). */
function unavailable(
  productId: string,
  pieceId: string,
  sizeId: string,
  locale: Locale,
): CartWriteResult {
  const record = CATALOGUE.find((entry) => entry.id === productId);
  const detail = record === undefined ? null : toProductDetail(record, locale);
  const piece = detail?.pieces.find((entry) => entry.id === pieceId);

  return {
    kind: 'UNAVAILABLE',
    pieceId,
    pieceName: piece?.name ?? '',
    sizeLabel: piece?.sizes.find((entry) => entry.id === sizeId)?.label ?? '',
  };
}

/** §16 `addItem(cart, product_id, {piece_id -> size}, qty)`. */
export function addItem(
  cartId: string,
  productId: string,
  selections: readonly { pieceId: string; sizeId: string }[],
  quantity: number,
  locale: Locale,
): CartWriteResult {
  const stored = CARTS.get(cartId);
  const record = CATALOGUE.find((entry) => entry.id === productId);
  if (stored === undefined || record === undefined) return { kind: 'NOT_FOUND' };

  // §16 invariant: a line cannot exist without a size for EVERY piece. Only the
  // backend knows how many pieces the product has, so only the backend can
  // check it — the frontend's schema cannot.
  const detail = toProductDetail(record, locale);
  const covered = detail.pieces.every((piece) =>
    selections.some((selection) => selection.pieceId === piece.id),
  );
  if (!covered || selections.length !== detail.pieces.length) return { kind: 'NOT_FOUND' };

  const existing = stored.find(
    (line) => line.productId === productId && sameSelections(line.selections, selections),
  );

  const line: CartLineRecord = existing ?? {
    id: mockId('0002'),
    productId,
    selections: [...selections],
    quantity: 0,
  };

  const wanted = line.quantity + quantity;
  const outcome = reserve(cartId, line.id, toKeys({ ...line, quantity: wanted }));

  if (outcome.kind === 'UNAVAILABLE') {
    return unavailable(productId, outcome.pieceId, outcome.sizeId, locale);
  }

  // §16: "Reservation and cart line are created in the same transaction." The
  // line is only recorded once the hold exists.
  line.quantity = wanted;
  if (existing === undefined) stored.push(line);

  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind: 'ADDED', summary };
}

/** §16 `updateQuantity(cart, line, qty)`. */
export function updateQuantity(
  cartId: string,
  lineId: string,
  quantity: number,
  locale: Locale,
): CartWriteResult {
  const stored = CARTS.get(cartId);
  const line = stored?.find((entry) => entry.id === lineId);
  if (stored === undefined || line === undefined) return { kind: 'NOT_FOUND' };

  const outcome = reserve(cartId, line.id, toKeys({ ...line, quantity }));
  if (outcome.kind === 'UNAVAILABLE') {
    return unavailable(line.productId, outcome.pieceId, outcome.sizeId, locale);
  }

  line.quantity = quantity;

  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind: 'ADDED', summary };
}

/** §16 `removeItem(cart, line)` — releases the hold immediately. */
export function removeLine(cartId: string, lineId: string, locale: Locale): CartWriteResult {
  const stored = CARTS.get(cartId);
  if (stored === undefined) return { kind: 'NOT_FOUND' };

  release(lineId);
  CARTS.set(
    cartId,
    stored.filter((line) => line.id !== lineId),
  );

  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind: 'ADDED', summary };
}

export type CodeResult =
  { kind: 'APPLIED'; summary: BagSummaryPayload } | { kind: 'REJECTED'; reason: string };

/** §16 `applyCode(cart, code)`. Validity is Pricing's answer, never the UI's. */
export function applyCode(cartId: string, code: string, locale: Locale): CodeResult {
  const normalised = code.trim().toUpperCase();

  if (!CARTS.has(cartId) || PROMO_CODES[normalised] === undefined) {
    return { kind: 'REJECTED', reason: REJECTION[locale] };
  }

  CART_CODES.set(cartId, normalised);
  const summary = summaryFor(cartId, locale);
  return summary === null
    ? { kind: 'REJECTED', reason: REJECTION[locale] }
    : { kind: 'APPLIED', summary };
}

export function removeCode(cartId: string, locale: Locale): CodeResult {
  CART_CODES.delete(cartId);
  const summary = summaryFor(cartId, locale);
  return summary === null
    ? { kind: 'REJECTED', reason: REJECTION[locale] }
    : { kind: 'APPLIED', summary };
}

/** Test seam. */
export function resetCarts(): void {
  CARTS.clear();
  CART_CODES.clear();
  nextId = 0;
}
