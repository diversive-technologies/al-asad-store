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
 *
 * ## D6 — nothing here is ever destroyed
 *
 * A line the customer removes, a code they lift and a cart that becomes an
 * order all stay on file with a status. `summaryFor` returns the ACTIVE
 * projection over that history, so what the customer sees is unchanged while
 * the store keeps a complete record of what was in the bag and what left it.
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

/**
 * D6 — why a line left the bag.
 *
 * `CUSTOMER` and `EXPIRED` are different facts and the difference is worth
 * keeping: one is someone changing their mind, the other is the store taking
 * the item back because a hold ran out. §26's reporting can tell them apart.
 */
type LineRemovalReason = 'CUSTOMER' | 'EXPIRED';

interface CartLineRecord {
  id: string;
  productId: string;
  selections: readonly { pieceId: string; sizeId: string }[];
  quantity: number;
  /** D6 — null while the line is in the bag; set once, never unset. */
  removedAt: number | null;
  removalReason: LineRemovalReason | null;
}

/**
 * D6 — a cart is never deleted. Placing its order CONVERTS it, which is better
 * provenance than discarding it: an order can be traced back to the bag that
 * produced it, including the lines that were removed before checkout.
 */
type CartStatus = 'ACTIVE' | 'CONVERTED';

interface CartRecord {
  lines: CartLineRecord[];
  status: CartStatus;
  /** The order this cart became, once it became one. */
  orderNumber: string | null;
}

/** D6 — every code ever applied, in order. The last un-lifted one is in force. */
interface CodeEvent {
  code: string;
  appliedAt: number;
  liftedAt: number | null;
}

const CARTS = new Map<string, CartRecord>();
const CART_CODES = new Map<string, CodeEvent[]>();

let nextId = 0;

/** Deterministic, RFC-4122-shaped so the schemas' `z.uuid()` accepts them. */
function mockId(group: string): string {
  nextId += 1;
  return `b1c2d3e4-${group}-4c8a-8f21-${String(nextId).padStart(12, '0')}`;
}

export function createCart(): string {
  const id = mockId('0001');
  CARTS.set(id, { lines: [], status: 'ACTIVE', orderNumber: null });
  return id;
}

export function cartExists(cartId: string): boolean {
  return CARTS.get(cartId)?.status === 'ACTIVE';
}

/**
 * §7.2 — the cart becomes the order. D6: marked, not deleted.
 *
 * Its holds are released rather than dropped, and the cart stops answering as a
 * bag: `summaryFor` returns null for a converted cart, which the handler turns
 * into the same 404 a missing cart gives, so the customer's bag reads empty
 * exactly as it did before this policy.
 */
export function convertCart(cartId: string, orderNumber: string): void {
  const cart = CARTS.get(cartId);
  if (cart === undefined) return;

  releaseCart(cartId);
  cart.status = 'CONVERTED';
  cart.orderNumber = orderNumber;
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

/** The lines still in the bag. D6: a projection, not the whole record. */
function activeLines(cart: CartRecord): CartLineRecord[] {
  return cart.lines.filter((line) => line.removedAt === null);
}

/** The code currently in force, if any. D6: the last un-lifted event. */
function activeCode(cartId: string): string | undefined {
  const events = CART_CODES.get(cartId) ?? [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event !== undefined && event.liftedAt === null) return event.code;
  }
  return undefined;
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

  const code = activeCode(cartId);
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
  const cart = CARTS.get(cartId);
  // D6: a converted cart still exists, but it is no longer anybody's bag.
  if (cart === undefined || cart.status !== 'ACTIVE') return null;

  const lines: BagLinePayload[] = [];

  for (const line of activeLines(cart)) {
    const payload = toLinePayload(line, locale);

    if (payload === null) {
      /*
       * D6 — the hold lapsed, so the line leaves the bag. It is MARKED rather
       * than spliced, and the reason is recorded: this is the one removal the
       * customer did not ask for, and telling it apart from one they did is
       * exactly what the policy is for.
       */
      line.removedAt = Date.now();
      line.removalReason = 'EXPIRED';
      continue;
    }

    lines.push(payload);
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
  const cart = CARTS.get(cartId);
  const record = CATALOGUE.find((entry) => entry.id === productId);
  if (cart === undefined || cart.status !== 'ACTIVE' || record === undefined) {
    return { kind: 'NOT_FOUND' };
  }

  // §16 invariant: a line cannot exist without a size for EVERY piece. Only the
  // backend knows how many pieces the product has, so only the backend can
  // check it — the frontend's schema cannot.
  const detail = toProductDetail(record, locale);
  const covered = detail.pieces.every((piece) =>
    selections.some((selection) => selection.pieceId === piece.id),
  );
  if (!covered || selections.length !== detail.pieces.length) return { kind: 'NOT_FOUND' };

  /*
   * D6 — only an ACTIVE line is merged into. Re-adding something the customer
   * removed starts a NEW line, so the removal stays in the record rather than
   * being undone.
   */
  const existing = activeLines(cart).find(
    (line) => line.productId === productId && sameSelections(line.selections, selections),
  );

  const line: CartLineRecord = existing ?? {
    id: mockId('0002'),
    productId,
    selections: [...selections],
    quantity: 0,
    removedAt: null,
    removalReason: null,
  };

  const wanted = line.quantity + quantity;
  const outcome = reserve(cartId, line.id, toKeys({ ...line, quantity: wanted }));

  if (outcome.kind === 'UNAVAILABLE') {
    return unavailable(productId, outcome.pieceId, outcome.sizeId, locale);
  }

  // §16: "Reservation and cart line are created in the same transaction." The
  // line is only recorded once the hold exists.
  line.quantity = wanted;
  if (existing === undefined) cart.lines.push(line);

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
  const cart = CARTS.get(cartId);
  if (cart === undefined || cart.status !== 'ACTIVE') return { kind: 'NOT_FOUND' };

  const line = activeLines(cart).find((entry) => entry.id === lineId);
  if (line === undefined) return { kind: 'NOT_FOUND' };

  const outcome = reserve(cartId, line.id, toKeys({ ...line, quantity }));
  if (outcome.kind === 'UNAVAILABLE') {
    return unavailable(line.productId, outcome.pieceId, outcome.sizeId, locale);
  }

  line.quantity = quantity;

  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind: 'ADDED', summary };
}

/**
 * §16 `removeItem(cart, line)` — releases the hold immediately.
 *
 * D6: the line is marked removed, not spliced out. The hold is released on the
 * same call, so stock frees up exactly as before; what changes is that the bag
 * still knows the line was there.
 */
export function removeLine(cartId: string, lineId: string, locale: Locale): CartWriteResult {
  const cart = CARTS.get(cartId);
  if (cart === undefined || cart.status !== 'ACTIVE') return { kind: 'NOT_FOUND' };

  const line = activeLines(cart).find((entry) => entry.id === lineId);
  if (line !== undefined) {
    release(lineId);
    line.removedAt = Date.now();
    line.removalReason = 'CUSTOMER';
  }

  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind: 'ADDED', summary };
}

export type CodeResult =
  | { kind: 'APPLIED'; summary: BagSummaryPayload }
  | { kind: 'REJECTED'; reason: string };

/** §16 `applyCode(cart, code)`. Validity is Pricing's answer, never the UI's. */
export function applyCode(cartId: string, code: string, locale: Locale): CodeResult {
  const normalised = code.trim().toUpperCase();
  const cart = CARTS.get(cartId);

  if (cart === undefined || cart.status !== 'ACTIVE' || PROMO_CODES[normalised] === undefined) {
    return { kind: 'REJECTED', reason: REJECTION[locale] };
  }

  const now = Date.now();
  const events = CART_CODES.get(cartId) ?? [];

  /*
   * D6 — applying a second code lifts the first rather than overwriting it, so
   * the bag's record shows both and the order in which they were tried.
   */
  for (const event of events) {
    if (event.liftedAt === null) event.liftedAt = now;
  }

  events.push({ code: normalised, appliedAt: now, liftedAt: null });
  CART_CODES.set(cartId, events);

  const summary = summaryFor(cartId, locale);
  return summary === null
    ? { kind: 'REJECTED', reason: REJECTION[locale] }
    : { kind: 'APPLIED', summary };
}

/** Lifting a code. D6: recorded as lifted, never erased. */
export function removeCode(cartId: string, locale: Locale): CodeResult {
  const now = Date.now();
  for (const event of CART_CODES.get(cartId) ?? []) {
    if (event.liftedAt === null) event.liftedAt = now;
  }

  const summary = summaryFor(cartId, locale);
  return summary === null
    ? { kind: 'REJECTED', reason: REJECTION[locale] }
    : { kind: 'APPLIED', summary };
}

/**
 * D6 — the full history of a cart, including what left it.
 *
 * The projection `summaryFor` returns is what the customer sees; this is what
 * the store keeps. Read by the tests that pin the guarantee.
 */
export function cartHistory(cartId: string): {
  status: CartStatus;
  orderNumber: string | null;
  lines: readonly {
    id: string;
    productId: string;
    quantity: number;
    removalReason: LineRemovalReason | null;
  }[];
  codes: readonly { code: string; liftedAt: number | null }[];
} | null {
  const cart = CARTS.get(cartId);
  if (cart === undefined) return null;

  return {
    status: cart.status,
    orderNumber: cart.orderNumber,
    lines: cart.lines.map(({ id, productId, quantity, removalReason }) => ({
      id,
      productId,
      quantity,
      removalReason,
    })),
    codes: (CART_CODES.get(cartId) ?? []).map(({ code, liftedAt }) => ({ code, liftedAt })),
  };
}

/** Test seam. */
export function resetCarts(): void {
  CARTS.clear();
  CART_CODES.clear();
  nextId = 0;
}
