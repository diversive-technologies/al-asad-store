import type { Locale } from '@/i18n/locales';

import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { statusForQuantity } from './inventory-db';
import { ONE_SIZE } from './product-content-db';
import { toProductDetail } from './product-detail-db';
import { availableQuantity } from './reservation-ledger';

/**
 * D1 — the availability overlays of architecture §8.2, standing in for
 * Inventory's live reads. Every one of them is answered from ONE derivation of
 * ONE ledger:
 *
 * ```
 * available := on_hand − allocated − SUM(qty WHERE status='ACTIVE' AND expires_at > now())
 * ```
 *
 * The product page's per-size overlay, the card overlay, the "In stock only"
 * filter, its count and the best sellers all come from `assess` below. They used
 * to be two sources: the product page subtracted live holds from the ledger,
 * while the cards, the filter and the best sellers read a fixed flag on the
 * catalogue record — so taking the last unit made a product read sold out on its
 * page and in stock on its card, for ever, with nothing throwing. §15 says stock
 * is never read from the index; the overlay is applied after results return,
 * and here that is literally the same function.
 *
 * DATA-13 twice over. A STATUS per size and per product crosses the wire, never
 * a count, so "low stock" stays a threshold the operator owns. And the
 * product-level verdict is stated here rather than left for the interface to
 * derive: §16 makes a SET unbuyable when ONE piece is gone, and that is the
 * backend's rule to apply.
 */

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT';

/** The per-size wire shape, kept separate because it is a separate read. */
export interface ProductDetailAvailabilityPayload {
  productId: string;
  status: StockStatus;
  pieces: {
    pieceId: string;
    status: StockStatus;
    sizes: { sizeId: string; status: StockStatus }[];
  }[];
}

/** The card overlay's wire shape — one status per product. */
export interface CardAvailabilityPayload {
  productId: string;
  status: StockStatus;
  unavailablePieceNames: string[];
}

/**
 * At or below this many sizes still to be had across EVERY piece, a product as a
 * whole reads LOW_STOCK. A commercial threshold the operator owns (DATA-13).
 *
 * Counted across every piece because that is what a card can sell: the card's
 * quick add offers one size applied to every piece, so "only two sizes left" is
 * the sentence a tile can honestly stand behind.
 */
const FEW_SIZES_LEFT = 2;

type PieceAvailability = ProductDetailAvailabilityPayload['pieces'][number];

interface Assessment {
  readonly payload: ProductDetailAvailabilityPayload;
  /** Names of the pieces that are gone, in the asked locale — what a SET card reports. */
  readonly gonePieceNames: readonly string[];
}

/** Sizes every piece can still be had in. A piece with no size set does not limit it. */
function sizesLeftAcrossPieces(pieces: readonly PieceAvailability[]): number | null {
  const sized = pieces.filter((piece) => piece.sizes.length > 0);
  const [first] = sized;
  if (first === undefined) return null;

  return first.sizes.filter((size) =>
    sized.every((piece) =>
      piece.sizes.some((other) => other.sizeId === size.sizeId && other.status !== 'SOLD_OUT'),
    ),
  ).length;
}

/** The backend's verdict across the whole product (§16), stated rather than derived by a reader. */
function productStatus(pieces: readonly PieceAvailability[]): StockStatus {
  if (pieces.some((piece) => piece.status === 'SOLD_OUT')) return 'SOLD_OUT';

  const sizesLeft = sizesLeftAcrossPieces(pieces);
  return sizesLeft !== null && sizesLeft <= FEW_SIZES_LEFT ? 'LOW_STOCK' : 'IN_STOCK';
}

/**
 * THE assessment every overlay reads, at `(piece_id, size)` granularity.
 *
 * Deliberately uneven: some sizes are gone while the product is still buyable,
 * because §28.2 requires sold-out sizes to be SHOWN as sold out with Notify Me
 * rather than quietly omitted, and that state has to be reachable in the running
 * store rather than only in a test.
 *
 * A piece with no size set — a length sold whole — reports no sizes, and its one
 * stock figure is keyed on its one size (`ONE_SIZE`), so a length somebody holds
 * reads sold out exactly as a size does. Metreage itself is not in the ledger —
 * the same gap §34.8's cut line records.
 */
function assess(record: CatalogueRecord, locale: Locale, now: number): Assessment {
  const detail = toProductDetail(record, locale);

  const pieces = detail.pieces.map((piece): PieceAvailability => {
    const sizes = piece.sizes.map((size) => ({
      sizeId: size.id,
      status: statusForQuantity(availableQuantity(piece.id, size.id, { now })),
    }));
    const isGone =
      piece.sizes.length === 0
        ? statusForQuantity(availableQuantity(piece.id, ONE_SIZE.id, { now })) === 'SOLD_OUT'
        : sizes.every((size) => size.status === 'SOLD_OUT');

    return { pieceId: piece.id, status: isGone ? 'SOLD_OUT' : 'IN_STOCK', sizes };
  });

  const gonePieceNames = detail.pieces
    .filter((piece) => pieces.some((p) => p.pieceId === piece.id && p.status === 'SOLD_OUT'))
    .map((piece) => piece.name);

  return {
    payload: { productId: record.id, status: productStatus(pieces), pieces },
    gonePieceNames,
  };
}

/** The product page's live overlay (§8.2), or `null` for a product the store does not hold. */
export function productAvailabilityFor(
  productId: string,
  locale: Locale,
): ProductDetailAvailabilityPayload | null {
  const record = CATALOGUE.find((entry) => entry.id === productId.trim());
  return record === undefined ? null : assess(record, locale, Date.now()).payload;
}

/**
 * The card overlay (§8.2) for the ids asked about, or for every product when
 * none are named.
 *
 * It answers only for products it holds. An id it does not know is ABSENT rather
 * than invented, which is what keeps the interface's "availability unknown" path
 * honest (DATA-13a, §30.2). It used to also withhold every eleventh product on
 * purpose, to make that state reachable; that made a sold-out product's card say
 * nothing while its page said sold out, so every product it holds is answered
 * now, and "unknown" is reached the way it really is — when the read fails.
 */
export function cardAvailabilityFor(
  productIds: readonly string[] | null,
  locale: Locale,
): CardAvailabilityPayload[] {
  const wanted = productIds === null ? null : new Set(productIds);
  const now = Date.now();

  return CATALOGUE.filter((record) => wanted === null || wanted.has(record.id)).map((record) => {
    const { payload, gonePieceNames } = assess(record, locale, now);

    return {
      productId: record.id,
      status: payload.status,
      /* A SET says WHICH piece is gone (DATA-13a); a SIMPLE product has one piece to name. */
      unavailablePieceNames:
        record.type === 'SET' && payload.status === 'SOLD_OUT' ? [...gonePieceNames] : [],
    };
  });
}

/**
 * The products that can be bought right now — what "In stock only", its count
 * and the best sellers read. One snapshot per query, so every facet of one
 * search is counted against the same moment.
 */
export function buyableProductIds(): ReadonlySet<string> {
  const now = Date.now();

  return new Set(
    CATALOGUE.filter((record) => assess(record, 'en', now).payload.status !== 'SOLD_OUT').map(
      (record) => record.id,
    ),
  );
}
