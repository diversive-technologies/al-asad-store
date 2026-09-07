import { onHandFor, stockKey } from './product-detail-db';

/**
 * D1 — architecture §7.1 and §7.3, standing in for the Java transaction.
 *
 * This is the correctness core of the whole system (§1.2), so the mock
 * implements it rather than pretending. A mock that always says "added" would
 * teach the interface that adding to a bag succeeds, and every failure path
 * §7.1 specifies — the named piece, the partial set, the last unit taken by
 * someone else — would exist only in prose.
 *
 * What is faithfully modelled: the sorted lock order, the all-or-nothing check
 * across every piece, the specific `Unavailable(piece)` answer, refreshing an
 * existing hold rather than stacking new ones, immediate release on removal,
 * and read-time expiry.
 *
 * What is NOT modelled, and does not need to be: row locks. JavaScript runs
 * this on one thread, so the `SELECT ... FOR UPDATE` of step 3 has nothing to
 * serialise against. The sort in step 2 is kept anyway — see `sortKeys`.
 */

/** §7.1 `expires_at = now() + hold_period`. A backend tunable, not a UI value. */
const HOLD_PERIOD_MS = 30 * 60 * 1000;

interface Reservation {
  cartId: string;
  lineId: string;
  pieceId: string;
  sizeId: string;
  quantity: number;
  /** Epoch milliseconds. DATA-12 formatting happens at the wire, not here. */
  expiresAt: number;
}

/**
 * The reservation table. Module-scoped so it survives across requests within a
 * dev server process, the same way `node.ts` holds the MSW singleton.
 */
const RESERVATIONS: Reservation[] = [];

/**
 * §7.2 step 4 — stock that has stopped being HELD and become OWED.
 *
 * `allocated` is the column §6.4 keeps beside `on_hand`, and the two are not the
 * same thing at all: a reservation expires on its own, an allocation belongs to
 * a placed order and only ever leaves through dispatch or cancellation. Keeping
 * them apart is what lets availability be `on_hand − allocated − live holds`.
 */
const ALLOCATED = new Map<string, number>();

/** How much of a key is committed to placed orders. */
export function allocatedQuantity(pieceId: string, sizeId: string): number {
  return ALLOCATED.get(stockKey(pieceId, sizeId)) ?? 0;
}

/** A `(piece, size)` pair to reserve against, with how many units are wanted. */
export interface ReservationKey {
  pieceId: string;
  sizeId: string;
  quantity: number;
}

/**
 * §7.1 step 2 — "SORT the keys ascending by piece_id. This is not cosmetic."
 *
 * A consistent global lock order is what makes deadlock structurally impossible
 * when two carts hold overlapping pieces in different orders. Nothing here can
 * deadlock, so this sort buys no safety in the mock — it is kept because the
 * shape of the routine is the thing being modelled, and a reader comparing this
 * against §7.1 should find every step, including the one that only matters once
 * a real database is behind it.
 */
function sortKeys(keys: readonly ReservationKey[]): ReservationKey[] {
  return [...keys].sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

/** §7.3 read-time exclusion: an expired row stops counting the instant it expires. */
function isActive(reservation: Reservation, now: number): boolean {
  return reservation.expiresAt > now;
}

/**
 * How many units of a key are held by ACTIVE reservations, optionally ignoring
 * one cart's own holds.
 *
 * The exclusion matters: a customer raising their own quantity from 2 to 3 must
 * be checked against stock minus *other people's* holds, or their own two units
 * count against them and the raise fails on stock they are already holding.
 */
export function reservedQuantity(
  pieceId: string,
  sizeId: string,
  options: { exceptCartId?: string; now?: number } = {},
): number {
  const now = options.now ?? Date.now();

  return RESERVATIONS.reduce((total, reservation) => {
    if (!isActive(reservation, now)) return total;
    if (reservation.pieceId !== pieceId || reservation.sizeId !== sizeId) return total;
    if (options.exceptCartId !== undefined && reservation.cartId === options.exceptCartId) {
      return total;
    }
    return total + reservation.quantity;
  }, 0);
}

/**
 * What every availability read subtracts from `on_hand` (§7.3).
 *
 * Live holds AND allocations: a unit sold this morning is as unavailable as one
 * in somebody's bag right now, and an overlay that counted only reservations
 * would happily re-sell it.
 */
export function reservedLookup(exceptCartId?: string): (p: string, s: string) => number {
  const now = Date.now();
  return (pieceId, sizeId) =>
    allocatedQuantity(pieceId, sizeId) +
    reservedQuantity(pieceId, sizeId, {
      now,
      ...(exceptCartId === undefined ? {} : { exceptCartId }),
    });
}

export type ReserveOutcome =
  | { kind: 'RESERVED'; expiresAt: number }
  | { kind: 'UNAVAILABLE'; pieceId: string; sizeId: string };

/**
 * §7.1 — reserve every key for a line, atomically.
 *
 * "One transaction serves both product types. For a SIMPLE product the loop
 * below runs once; for a three-piece SET it runs three times. There is no
 * separate simple path" — so there is one function here, not two, and the
 * caller never branches on `product_type` to decide how to reserve.
 *
 * `quantity` on each key is the TOTAL the line should end up holding, not a
 * delta, which is what makes this serve `addItem` and `updateQuantity` alike:
 * "Extending an existing hold refreshes `expires_at` on the existing rows
 * rather than inserting new ones, so a customer editing their bag does not
 * accumulate reservations against themselves."
 */
export function reserve(
  cartId: string,
  lineId: string,
  keys: readonly ReservationKey[],
): ReserveOutcome {
  const now = Date.now();

  // Step 1 and 2: resolve the keys, then sort them ascending by piece.
  const sorted = sortKeys(keys);

  // Step 3: check EVERY key before writing any row. A partially reserved set is
  // the corrupt state §1.2 names as the central correctness problem.
  for (const key of sorted) {
    const available =
      onHandFor(key.pieceId, key.sizeId) -
      allocatedQuantity(key.pieceId, key.sizeId) -
      reservedQuantity(key.pieceId, key.sizeId, { now, exceptCartId: cartId });

    if (available < key.quantity) {
      // ROLLBACK: nothing was written, and the answer names the piece (§7.1).
      return { kind: 'UNAVAILABLE', pieceId: key.pieceId, sizeId: key.sizeId };
    }
  }

  // Step 4: write the rows. Existing rows for this line are refreshed in place.
  const expiresAt = now + HOLD_PERIOD_MS;

  for (const key of sorted) {
    const existing = RESERVATIONS.find(
      (row) => row.lineId === lineId && row.pieceId === key.pieceId && row.sizeId === key.sizeId,
    );

    if (existing === undefined) {
      RESERVATIONS.push({ cartId, lineId, ...key, expiresAt });
    } else {
      existing.quantity = key.quantity;
      existing.expiresAt = expiresAt;
    }
  }

  return { kind: 'RESERVED', expiresAt };
}

/**
 * §16 — "Reducing quantity or removing a line releases the corresponding
 * reservation immediately." Not at expiry, and not when a sweeper next runs.
 */
export function release(lineId: string): void {
  for (let index = RESERVATIONS.length - 1; index >= 0; index -= 1) {
    if (RESERVATIONS[index]?.lineId === lineId) RESERVATIONS.splice(index, 1);
  }
}

/** Release everything a cart holds — used when the cart itself is discarded. */
export function releaseCart(cartId: string): void {
  for (let index = RESERVATIONS.length - 1; index >= 0; index -= 1) {
    if (RESERVATIONS[index]?.cartId === cartId) RESERVATIONS.splice(index, 1);
  }
}

/** When a line's hold lapses, or `null` if it holds nothing active. */
export function expiryFor(lineId: string): number | null {
  const now = Date.now();
  const rows = RESERVATIONS.filter((row) => row.lineId === lineId && isActive(row, now));
  if (rows[0] === undefined) return null;

  // Every row of one line is written in the same step, so they share an expiry;
  // the earliest is taken regardless, because that is when the line stops holding.
  return rows.reduce((earliest, row) => Math.min(earliest, row.expiresAt), rows[0].expiresAt);
}

/**
 * §7.3's background sweep. "Its only purpose is to keep the table small" — and
 * that is why nothing calls it on a read path: correctness never depends on it
 * having run. It exists so the mock does not grow without bound in a long dev
 * session, and so the shape of §7.3's second mechanism is present.
 */
export function sweepExpired(): number {
  const now = Date.now();
  let removed = 0;

  for (let index = RESERVATIONS.length - 1; index >= 0; index -= 1) {
    const row = RESERVATIONS[index];
    if (row !== undefined && !isActive(row, now)) {
      RESERVATIONS.splice(index, 1);
      removed += 1;
    }
  }

  return removed;
}

/**
 * §7.2 steps 3 and 4 — turn every one of a cart's holds into an allocation.
 *
 * ```
 * 3. SORT piece keys ascending. FOR EACH, SELECT ... FOR UPDATE.
 * 4. FOR EACH: allocated += quantity ; DELETE the reservation row.
 *    The CHECK constraint allocated <= on_hand is the final guard.
 * ```
 *
 * That constraint is checked across EVERY key before a single one is written,
 * for the same reason §7.1 does: a half-allocated order is the same corrupt
 * state as a half-reserved set. `false` means nothing was written.
 */
export function allocate(cartId: string): boolean {
  const now = Date.now();
  const rows = RESERVATIONS.filter((row) => row.cartId === cartId && isActive(row, now)).sort(
    (left, right) => left.pieceId.localeCompare(right.pieceId),
  );

  if (rows.length === 0) return false;

  // The final guard, applied before anything changes.
  for (const row of rows) {
    const next = allocatedQuantity(row.pieceId, row.sizeId) + row.quantity;
    if (next > onHandFor(row.pieceId, row.sizeId)) return false;
  }

  for (const row of rows) {
    const key = stockKey(row.pieceId, row.sizeId);
    ALLOCATED.set(key, (ALLOCATED.get(key) ?? 0) + row.quantity);
  }

  releaseCart(cartId);
  return true;
}

/** Test seam: the stock ledger is derived, but these accumulate. */
export function resetReservations(): void {
  RESERVATIONS.length = 0;
  ALLOCATED.clear();
}

export { stockKey };
