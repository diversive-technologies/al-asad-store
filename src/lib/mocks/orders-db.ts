import type { TransferAccount } from './checkout-config-db';

/**
 * D1 — placed ORDERS: the record §7.2 step 5 inserts and the reads §28.3 serves
 * from it. Split out of `checkout-db.ts` (MOD-03), which keeps the transaction.
 */

export interface OrderTotalsPayload {
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
  giftMinor: number;
  totalMinor: number;
}

export interface OrderPayload {
  id: string;
  orderNumber: string;
  /**
   * Whose order it is, or null for a guest — §6.5's `customer_id` is nullable
   * for exactly this reason, and §28.2 makes guest checkout Release 1 scope.
   *
   * It arrives as a HEADER the BFF attached from the session, never from the
   * body: an order that named its own customer would let any browser file an
   * order under anyone's account and read it back from their history.
   */
  accountKey: string | null;
  state: string;
  paymentState: string;
  placedAt: string;
  contactName: string;
  contactMobile: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryLabel: string;
  paymentLabel: string;
  isGift: boolean;
  giftMessage: string;
  lines: {
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    pieces: { pieceCode: string; name: string; size: string }[];
    /**
     * §6.5 as amended — the fulfilment kind, and for a garment being CUT an
     * IMMUTABLE measurement snapshot: the figures themselves, copied, never a
     * reference. A later edit to the profile cannot reach an order, and the
     * workshop is told what the customer confirmed.
     */
    stitching: {
      garmentStyle: string;
      styleLabel: string;
      profileId: string;
      chargeMinor: number;
      leadTimeDays: number;
      measurements: { pointId: string; mm: number }[];
    } | null;
  }[];
  totals: OrderTotalsPayload;
  /**
   * How to pay, for a method the customer pays by moving the money themselves —
   * or null for every other method. The REFERENCE is the order number, so the
   * transfer and the order are matched by the one identifier the customer
   * already has. Carried on the order rather than inferred from the method on
   * the page, so the interface never branches on which method was chosen (§3.1).
   */
  transferInstructions: (TransferAccount & { reference: string }) | null;
}

const ORDERS = new Map<string, OrderPayload>();
let orderSequence = 0;

/**
 * The next order's identity. The number is a SEQUENCE — an address, never a
 * secret (`order-access-db.ts` is why that matters) — and monotonic by
 * construction, which is what lets it break a same-millisecond tie below.
 */
export function nextOrderIdentity(): { id: string; orderNumber: string } {
  orderSequence += 1;
  return {
    id: `c1d2e3f4-0001-4c8a-8f21-${String(orderSequence).padStart(12, '0')}`,
    orderNumber: `AA${String(100_000 + orderSequence)}`,
  };
}

/** §7.2 step 5 — INSERT the order. An order is a historical record (§6.5). */
export function recordOrder(order: OrderPayload): void {
  ORDERS.set(order.orderNumber, order);
}

/**
 * THE rule for which order a number names, and a backend rule (DATA-13): case
 * and the spaces around it do not matter. A customer copying `aa100001` out of a
 * message, or typing it on a phone that capitalised nothing, means AA100001 — so
 * the storefront passes on whatever was typed and shows the number that comes
 * back, and nothing on that side decides whether two spellings are one order.
 */
export function canonicalOrderNumber(typed: string): string {
  return typed.trim().toUpperCase();
}

/** §28.3 tracks a guest order by number and mobile. */
export function findOrder(orderNumber: string): OrderPayload | null {
  return ORDERS.get(canonicalOrderNumber(orderNumber)) ?? null;
}

export interface AccountOrderRow {
  orderNumber: string;
  placedAt: string;
  totalMinor: number;
  /**
   * How many PRODUCTS the order holds, not how many units.
   *
   * The row reads "Plain Waistcoat Suit and 2 more", and counting units made
   * that sentence lie about the commonest case there is: one garment bought
   * three times came out as "and 2 more", which names two garments nobody
   * ordered. What the phrase counts has to be what it says.
   */
  lineCount: number;
  /** The first line's name AS IT WAS, which is what makes an order recognisable. */
  firstItem: string;
}

/** The place in the sequence an order number carries, or `null` for one that is not ours. */
function sequenceOf(orderNumber: string): number | null {
  const match = /^AA(\d{6,12})$/.exec(orderNumber);
  return match?.[1] === undefined ? null : Number.parseInt(match[1], 10);
}

/**
 * §28.3 — what one customer has bought, newest first.
 *
 * A REDUCED projection rather than the orders themselves: a list needs enough to
 * recognise an order and follow it, and shipping every snapshotted line and
 * piece to draw four lines of summary would put a customer's whole purchase
 * history on the wire to render a date and a total.
 *
 * An empty account key matches nothing. A guest's orders carry null and are
 * found by their number (§28.3), which is the only thing that addresses them.
 */
export function ordersFor(accountKey: string): AccountOrderRow[] {
  if (accountKey.length === 0) return [];

  return (
    [...ORDERS.values()]
      .filter((order) => order.accountKey === accountKey)
      /*
       * Newest first by the order NUMBER's sequence, not by `placedAt`: a
       * millisecond stamp can be shared by two orders, and a stable sort then
       * leaves them oldest first. The sequence is monotonic by construction, and
       * compared as a NUMBER, because as text AA1000000 sorts before AA999999.
       */
      .sort(
        (one, other) => (sequenceOf(other.orderNumber) ?? 0) - (sequenceOf(one.orderNumber) ?? 0),
      )
      .map((order) => ({
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        totalMinor: order.totals.totalMinor,
        lineCount: order.lines.length,
        firstItem: order.lines[0]?.productName ?? '',
      }))
  );
}

/** The most one page may carry, as Java would enforce it. */
export const ORDER_PAGE_MAX = 100;
const ORDER_PAGE_DEFAULT = 20;

export interface OrderHistoryPage {
  orders: AccountOrderRow[];
  /** The last row's number, or `null` when this page reaches the oldest order. */
  nextCursor: string | null;
}

/**
 * §28.3 — one page of the history, by KEYSET rather than by offset: the cursor is
 * the last order a page ended on, and the next page is everything older. An order
 * placed while somebody pages therefore cannot push a row onto two pages.
 *
 * `limit` absent is the default page; one that is not a whole number from 1 to
 * the maximum, or a cursor that is not an order number, is refused as `null` (a
 * 400) rather than guessed at. A well-formed cursor need not name an order of
 * this customer's: it is a POSITION, and everything older than it is the answer.
 */
export function orderHistoryPage(
  accountKey: string,
  params: URLSearchParams,
): OrderHistoryPage | null {
  const rawLimit = params.get('limit');
  if (rawLimit !== null && !/^\d{1,3}$/.test(rawLimit)) return null;
  const limit = rawLimit === null ? ORDER_PAGE_DEFAULT : Number.parseInt(rawLimit, 10);
  if (limit < 1 || limit > ORDER_PAGE_MAX) return null;

  const rawCursor = params.get('cursor');
  const cursor = rawCursor === null ? null : sequenceOf(rawCursor);
  if (rawCursor !== null && cursor === null) return null;

  const older = ordersFor(accountKey).filter(
    (row) => cursor === null || (sequenceOf(row.orderNumber) ?? 0) < cursor,
  );
  const orders = older.slice(0, limit);
  const last = orders[orders.length - 1];
  return {
    orders,
    nextCursor: older.length > limit && last !== undefined ? last.orderNumber : null,
  };
}

/** Test seam. */
export function resetOrders(): void {
  ORDERS.clear();
  orderSequence = 0;
}
