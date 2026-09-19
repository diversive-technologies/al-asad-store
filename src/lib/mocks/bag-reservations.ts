import { onHandFor, stockKey } from './inventory-db';
import {
  ALLOCATED,
  ARCHIVE,
  allocatedQuantity,
  availableQuantity,
  HOLD_PERIOD_MS,
  isActive,
  RESERVATIONS,
  settle,
} from './reservation-ledger';

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
 *
 * The rows these transactions write, and the availability sum they check, live
 * in `reservation-ledger.ts` (MOD-03).
 */

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
  // the corrupt state §1.2 names as the central correctness problem. Only THIS
  // line's own holds are set aside: another line of the same cart on the same
  // key is competing for the same shelf (`reservedQuantity` has the oversell).
  for (const key of sorted) {
    const available = availableQuantity(key.pieceId, key.sizeId, { now, exceptLineId: lineId });

    if (available < key.quantity) {
      // ROLLBACK: nothing was written, and the answer names the piece (§7.1).
      return { kind: 'UNAVAILABLE', pieceId: key.pieceId, sizeId: key.sizeId };
    }
  }

  // Step 4: write the rows. Existing rows for this line are refreshed in place.
  const expiresAt = now + HOLD_PERIOD_MS;

  for (const key of sorted) {
    /*
     * D6 — only an ACTIVE row is refreshed. A settled one is history and must
     * not be resurrected: re-adding a line the customer removed is a new hold,
     * and rewriting the released row would erase the fact that they removed it.
     */
    const existing = RESERVATIONS.find(
      (row) =>
        row.lineId === lineId &&
        row.pieceId === key.pieceId &&
        row.sizeId === key.sizeId &&
        isActive(row, now),
    );

    if (existing === undefined) {
      RESERVATIONS.push({ cartId, lineId, ...key, expiresAt, status: 'ACTIVE', settledAt: null });
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
 *
 * D6: released, not deleted. The unit stops counting against stock on the very
 * next read, and the row stays on file saying who held it and when they let go.
 */
export function release(lineId: string): void {
  const now = Date.now();
  for (const row of RESERVATIONS) {
    if (row.lineId === lineId && row.status === 'ACTIVE') settle(row, 'RELEASED', now);
  }
}

/** Release everything a cart holds — used when the cart itself is discarded. */
export function releaseCart(cartId: string): void {
  const now = Date.now();
  for (const row of RESERVATIONS) {
    if (row.cartId === cartId && row.status === 'ACTIVE') settle(row, 'RELEASED', now);
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
 * §7.3's background sweep, under D6.
 *
 * "Its only purpose is to keep the table small" — and that purpose is unchanged.
 * What changes is the destination: rows that can no longer affect an
 * availability read are MOVED to cold storage rather than deleted, so the hot
 * table stays small AND the history survives.
 *
 * Nothing calls this on a read path, because correctness still never depends on
 * it having run: an expired row is excluded by `isActive` whether or not the
 * sweep has reached it.
 *
 * Returns how many rows were archived.
 */
export function sweepExpired(): number {
  const now = Date.now();

  // First, record the ones that timed out. They stopped counting the moment
  // they expired; this only writes down that it happened.
  for (const row of RESERVATIONS) {
    if (row.status === 'ACTIVE' && row.expiresAt <= now) settle(row, 'EXPIRED', now);
  }

  let archived = 0;

  for (let index = RESERVATIONS.length - 1; index >= 0; index -= 1) {
    const row = RESERVATIONS[index];
    if (row !== undefined && row.status !== 'ACTIVE') {
      ARCHIVE.push(row);
      RESERVATIONS.splice(index, 1);
      archived += 1;
    }
  }

  return archived;
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
 *
 * D6 changes step 4's second clause and nothing else: the row becomes
 * `ALLOCATED` rather than being deleted, so an order can be traced back to the
 * exact holds it consumed.
 */
export function allocate(cartId: string): boolean {
  const now = Date.now();
  const rows = RESERVATIONS.filter((row) => row.cartId === cartId && isActive(row, now)).sort(
    (left, right) => left.pieceId.localeCompare(right.pieceId),
  );

  /*
   * Allocating NOTHING succeeds, because a cart can legitimately hold nothing
   * to allocate: §34.8's made-to-measure line takes no hold at all. This used
   * to answer false, which served as "there is nothing to place" — a job that
   * was never this function's. The caller asks that question first and better,
   * by counting the lines in the summary — and §7.2 step 1 has already refused,
   * naming it, any stock line whose hold lapsed.
   */

  /*
   * The final guard, applied before anything changes — per KEY, not per row. Two
   * lines of one cart can hold the same `(piece, size)`, and checking each row on
   * its own let both pass against a shelf that could only cover one of them.
   */
  const wanted = new Map<string, { pieceId: string; sizeId: string; quantity: number }>();
  for (const row of rows) {
    const key = stockKey(row.pieceId, row.sizeId);
    const quantity = (wanted.get(key)?.quantity ?? 0) + row.quantity;
    wanted.set(key, { pieceId: row.pieceId, sizeId: row.sizeId, quantity });
  }
  for (const { pieceId, sizeId, quantity } of wanted.values()) {
    if (allocatedQuantity(pieceId, sizeId) + quantity > onHandFor(pieceId, sizeId)) return false;
  }

  for (const row of rows) {
    const key = stockKey(row.pieceId, row.sizeId);
    ALLOCATED.set(key, (ALLOCATED.get(key) ?? 0) + row.quantity);
    settle(row, 'ALLOCATED', now);
  }

  return true;
}

/*
 * The ledger's reads, re-exported so this module stays the one surface the cart,
 * checkout and their tests reserve against — the rows moved, the service did not.
 */
export {
  allocatedQuantity,
  reservationLedger,
  reservedQuantity,
  resetReservations,
  type ReservationStatus,
} from './reservation-ledger';
