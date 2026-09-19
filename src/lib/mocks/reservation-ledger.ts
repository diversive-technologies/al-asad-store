import { onHandFor, stockKey } from './inventory-db';

/**
 * D1 — the ROWS behind §7.1 to §7.3: every hold and every allocation, and the
 * one availability sum they feed. Split out of `bag-reservations.ts` (MOD-03),
 * which keeps the transactions that write these rows.
 *
 * ## D6 — this ledger is APPEND-ONLY. No row is ever destroyed.
 *
 * §7.1 step 4 and §7.2 step 4 both say "DELETE the reservation row", and §7.3's
 * sweep says it "deletes rows where expires_at < now()". Under D6 neither
 * happens: a reservation that is released, that expires, or that becomes an
 * allocation changes STATUS and stays, so the store keeps a complete record of
 * every unit it ever held and why the hold ended.
 *
 * **Availability must filter on status AND expiry, not on existence.** Deletion
 * used to do half that job implicitly. `reservedQuantity` counts only rows that
 * are `ACTIVE` and unexpired — forget either half and released holds keep
 * counting against stock, which does not oversell but silently UNDERSELLS:
 * sizes read sold out that are sitting on the shelf.
 */

/** §7.1 `expires_at = now() + hold_period`. A backend tunable, not a UI value. */
export const HOLD_PERIOD_MS = 30 * 60 * 1000;

/**
 * D6 — why a hold stopped counting, kept forever.
 *
 * A single `isDeleted` boolean would record that the row ended without
 * recording what ended it, and the difference is the whole point of keeping it:
 * a customer changing their mind, a hold timing out, and stock being sold are
 * three different facts about the same unit.
 */
export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'ALLOCATED';

export interface Reservation {
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
export const RESERVATIONS: Reservation[] = [];

/**
 * D6 — cold storage. Rows the sweep has moved out of the hot table.
 *
 * Nothing reads this on a request path, which is exactly the point: archived
 * rows cannot affect availability, cannot slow a read, and are still there.
 * In the Java service this is a separate table or a separate tier; here it is a
 * second array, because what matters is that the rows are MOVED rather than
 * dropped.
 */
export const ARCHIVE: Reservation[] = [];

/**
 * §7.2 step 4 — stock that has stopped being HELD and become OWED.
 *
 * `allocated` is the column §6.4 keeps beside `on_hand`, and the two are not the
 * same thing at all: a reservation expires on its own, an allocation belongs to
 * a placed order and only ever leaves through dispatch or cancellation. Keeping
 * them apart is what lets availability be `on_hand − allocated − live holds`.
 */
export const ALLOCATED = new Map<string, number>();

/** How much of a key is committed to placed orders. */
export function allocatedQuantity(pieceId: string, sizeId: string): number {
  return ALLOCATED.get(stockKey(pieceId, sizeId)) ?? 0;
}

/**
 * §7.3 read-time exclusion, D6 edition.
 *
 * BOTH halves are required. A row that has been released is no longer held even
 * though it is still on file, and a row that has timed out stops counting the
 * instant it does so, with no sweeper involved.
 */
export function isActive(reservation: Reservation, now: number): boolean {
  return reservation.status === 'ACTIVE' && reservation.expiresAt > now;
}

/** D6 — end a hold by recording how it ended, never by removing the row. */
export function settle(reservation: Reservation, status: ReservationStatus, now: number): void {
  reservation.status = status;
  reservation.settledAt = now;
}

/**
 * How many units of a key are held by ACTIVE reservations, optionally ignoring
 * one LINE's own holds.
 *
 * The exclusion matters: a customer raising a line from 2 to 3 must be checked
 * against stock minus every OTHER hold, or the line's own two units count
 * against it and the raise fails on stock it is already holding.
 *
 * It is the line and not the cart, and the difference is an oversell. A cart can
 * hold one `(piece, size)` on two lines — a set in M for every piece, and the
 * same set with only the kameez in L — and excluding the whole cart let each
 * line be checked as if the other held nothing: eight waistcoats on the shelf,
 * ten in one bag, and ten allocated at placement.
 */
export function reservedQuantity(
  pieceId: string,
  sizeId: string,
  options: { exceptLineId?: string; now?: number } = {},
): number {
  const now = options.now ?? Date.now();

  return RESERVATIONS.reduce((total, reservation) => {
    if (!isActive(reservation, now)) return total;
    if (reservation.pieceId !== pieceId || reservation.sizeId !== sizeId) return total;
    if (options.exceptLineId !== undefined && reservation.lineId === options.exceptLineId) {
      return total;
    }
    return total + reservation.quantity;
  }, 0);
}

/**
 * THE availability sum, and the only place it is written (PD-01):
 *
 * ```
 * available := on_hand − allocated − SUM(qty WHERE status='ACTIVE' AND expires_at > now())
 * ```
 *
 * The §7.1 transaction asks it (ignoring the asking line's own holds) and every
 * availability read asks it (ignoring nobody), so what a card, a product page
 * and the bag each say about a size is one answer rather than three. A unit sold
 * this morning is as unavailable as one in somebody's bag right now.
 */
export function availableQuantity(
  pieceId: string,
  sizeId: string,
  options: { exceptLineId?: string; now?: number } = {},
): number {
  return (
    onHandFor(pieceId, sizeId) -
    allocatedQuantity(pieceId, sizeId) -
    reservedQuantity(pieceId, sizeId, options)
  );
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
