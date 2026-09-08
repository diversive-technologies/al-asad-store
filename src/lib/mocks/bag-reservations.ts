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
 *
 * ## D6 — this ledger is APPEND-ONLY. No row is ever destroyed.
 *
 * §7.1 step 4 and §7.2 step 4 both say "DELETE the reservation row", and §7.3's
 * sweep says it "deletes rows where expires_at < now()". Under D6 neither
 * happens: a reservation that is released, that expires, or that becomes an
 * allocation changes STATUS and stays, so the store keeps a complete record of
 * every unit it ever held and why the hold ended.
 *
 * Two consequences follow, and both are load-bearing.
 *
 * **Availability must filter on status AND expiry, not on existence.** Deletion
 * used to do half that job implicitly. `reservedQuantity` now counts only rows
 * that are `ACTIVE` and unexpired — forget either half and released holds keep
 * counting against stock, which does not oversell but silently UNDERSELLS:
 * sizes read sold out that are sitting on the shelf.
 *
 * **The sweep archives instead of deleting.** §7.3 says its "only purpose is to
 * keep the table small", and that purpose survives D6 — what changes is where
 * the rows go. Anything no longer `ACTIVE` moves to cold storage, so the hot
 * table holds only what an availability read actually has to sum, and nothing
 * is lost.
 */

/** §7.1 `expires_at = now() + hold_period`. A backend tunable, not a UI value. */
const HOLD_PERIOD_MS = 30 * 60 * 1000;

/**
 * D6 — why a hold stopped counting, kept forever.
 *
 * A single `isDeleted` boolean would record that the row ended without
 * recording what ended it, and the difference is the whole point of keeping it:
 * a customer changing their mind, a hold timing out, and stock being sold are
 * three different facts about the same unit.
 */
export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'ALLOCATED';

interface Reservation {
  cartId: string;
  lineId: string;
  pieceId: string;
  sizeId: string;
  quantity: number;
  /** Epoch milliseconds. DATA-12 formatting happens at the wire, not here. */
  expiresAt: number;
  status: ReservationStatus;
  /** When the status last changed. The provenance D6 exists to keep. */
  settledAt: number | null;
}

/**
 * The HOT reservation table — rows that can still affect an availability read.
 * Module-scoped so it survives across requests within a dev server process, the
 * same way `node.ts` holds the MSW singleton.
 */
const RESERVATIONS: Reservation[] = [];

/**
 * D6 — cold storage. Rows the sweep has moved out of the hot table.
 *
 * Nothing reads this on a request path, which is exactly the point: archived
 * rows cannot affect availability, cannot slow a read, and are still there.
 * In the Java service this is a separate table or a separate tier; here it is a
 * second array, because what matters is that the rows are MOVED rather than
 * dropped.
 */
const ARCHIVE: Reservation[] = [];

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

/**
 * §7.3 read-time exclusion, D6 edition.
 *
 * BOTH halves are required. A row that has been released is no longer held even
 * though it is still on file, and a row that has timed out stops counting the
 * instant it does so, with no sweeper involved.
 */
function isActive(reservation: Reservation, now: number): boolean {
  return reservation.status === 'ACTIVE' && reservation.expiresAt > now;
}

/** D6 — end a hold by recording how it ended, never by removing the row. */
function settle(reservation: Reservation, status: ReservationStatus, now: number): void {
  reservation.status = status;
  reservation.settledAt = now;
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

  if (rows.length === 0) return false;

  // The final guard, applied before anything changes.
  for (const row of rows) {
    const next = allocatedQuantity(row.pieceId, row.sizeId) + row.quantity;
    if (next > onHandFor(row.pieceId, row.sizeId)) return false;
  }

  for (const row of rows) {
    const key = stockKey(row.pieceId, row.sizeId);
    ALLOCATED.set(key, (ALLOCATED.get(key) ?? 0) + row.quantity);
    settle(row, 'ALLOCATED', now);
  }

  return true;
}

/**
 * D6 — the ledger for one cart, hot rows and archived rows together.
 *
 * This is what the policy is FOR: every hold the cart ever took, including the
 * ones it gave back, with the reason each ended. Read by the tests that pin the
 * guarantee; an operator-facing report is Java's (§26).
 */
export function reservationLedger(cartId: string): readonly {
  lineId: string;
  pieceId: string;
  sizeId: string;
  quantity: number;
  status: ReservationStatus;
}[] {
  return [...ARCHIVE, ...RESERVATIONS]
    .filter((row) => row.cartId === cartId)
    .map(({ lineId, pieceId, sizeId, quantity, status }) => ({
      lineId,
      pieceId,
      sizeId,
      quantity,
      status,
    }));
}

/** Test seam: the stock ledger is derived, but these accumulate. */
export function resetReservations(): void {
  RESERVATIONS.length = 0;
  ARCHIVE.length = 0;
  ALLOCATED.clear();
}

export { stockKey };
