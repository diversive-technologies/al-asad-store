import type { Locale } from '@/i18n/locales';

import { priceCart, type CartPricingPayload } from './bag-pricing';
import { expiryFor } from './bag-reservations';
import {
  activeCart,
  activeCode,
  activeLines,
  isMovableToWishlist,
  type CartLineRecord,
} from './cart-store';
import { CATALOGUE, productNameFor, type CatalogueRecord } from './catalogue-db';
import { styleLabelFor } from './measurement-sets-db';
import { sizeLabelOf } from './product-content-db';
import { toProductDetail } from './product-detail-db';
import { isCurrentProfile, profileById } from './profiles-db';

/**
 * D1 — §16's `summary`: the bag AS THE CUSTOMER SEES IT, projected over the cart
 * records in `cart-store.ts`. Split out of `bag-db.ts` (MOD-03).
 *
 * Every money figure is stated here, the line total included, so nothing on the
 * other side of the wire derives one (DATA-13).
 */

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
  /** Null for a made-to-measure line: it holds nothing, so nothing lapses. */
  reservationExpiresAt: string | null;
  stitching: {
    garmentStyle: string;
    styleLabel: string;
    profileId: string;
    savedAt: string;
    figureCount: number;
    measurementsChanged: boolean;
    chargeMinor: number;
    leadTimeDays: number;
  } | null;
  /** §16 — stated, so the interface never decides which lines may move. */
  movableToWishlist: boolean;
}

export interface BagSummaryPayload {
  lines: BagLinePayload[];
  /** When the FIRST hold in the bag lapses, or null when nothing in it is held. */
  heldUntil: string | null;
  itemCount: number;
  pricing: CartPricingPayload['pricing'];
  freeDelivery: CartPricingPayload['freeDelivery'];
}

function toLinePayload(line: CartLineRecord, locale: Locale): BagLinePayload | null {
  const record = CATALOGUE.find((entry) => entry.id === line.productId);
  if (record === undefined) return null;

  const detail = toProductDetail(record, locale);

  /*
   * §34.8 — a garment being CUT. It holds nothing, so there is no expiry to
   * check and no size to show: it is not competing for a row on a shelf, and
   * §16's "every line holds a live reservation" is the invariant this one line
   * kind departs from, deliberately and in one place.
   */
  if (line.stitchingProfileId !== null) return toStitchedPayload(line, record, detail, locale);

  const expiresAt = expiryFor(line.id);
  // A line whose hold has lapsed is no longer a line (§16: "Every line holds a
  // live reservation"), so it drops out of the summary rather than showing as
  // an item the customer no longer has. Dropping it is all a READ does: the
  // lapse is recorded when something acts on it (`bag-db.ts`).
  if (expiresAt === null) return null;

  const pieces = line.selections.flatMap((selection) => {
    const piece = detail.pieces.find((entry) => entry.id === selection.pieceId);
    const label = piece === undefined ? null : sizeLabelOf(piece, selection.sizeId, locale);
    if (piece === undefined || label === null) return [];
    return [{ pieceId: piece.id, name: piece.name, sizeId: selection.sizeId, sizeLabel: label }];
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
    stitching: null,
    movableToWishlist: isMovableToWishlist(line),
  };
}

/**
 * A line that is being cut rather than picked.
 *
 * The charge is a LINE COMPONENT (§34.8): the garment keeps its own unit price
 * and the stitching is its own figure, so the line total is the two of them
 * together, per garment. A customer buying two identical kameez is charged for
 * cutting two.
 *
 * A profile the store cannot find drops the line, the way a lapsed hold does.
 * It is only reachable after a restart — profiles live in memory too — and a
 * line that cannot say what it is cut from is not a line anybody can check.
 */
function toStitchedPayload(
  line: CartLineRecord,
  record: CatalogueRecord,
  detail: ReturnType<typeof toProductDetail>,
  locale: Locale,
): BagLinePayload | null {
  const profile = stitchingProfileOf(line);
  if (profile === null) return null;

  /*
   * Priced from the PRODUCT's own offer, never the profile's style.
   *
   * They are two declarations of the same thing and only one of them is the
   * backend's answer to "what is this garment cut as": \`STITCHING_STYLE\` on the
   * product. Taking the charge and the lead time off the profile let a kameez
   * profile price a waistcoat at the kameez's rate — and the add path now
   * refuses the mismatch outright, so this is the second lock on one door.
   */
  const offer = detail.stitching;
  if (offer === null || offer.garmentStyle !== profile.garmentStyle) return null;

  const styleLabel = styleLabelFor(profile.garmentStyle, locale);
  if (styleLabel === null) return null;

  return {
    id: line.id,
    productId: record.id,
    slug: record.slug,
    name: detail.name,
    imageUrl: detail.media[0]?.url ?? '',
    type: record.type,
    pieces: [],
    quantity: line.quantity,
    unitPriceMinor: record.currentMinor,
    lineTotalMinor: (record.currentMinor + offer.stitchingChargeMinor) * line.quantity,
    reservationExpiresAt: null,
    stitching: {
      garmentStyle: profile.garmentStyle,
      styleLabel,
      profileId: profile.id,
      savedAt: profile.createdAt,
      figureCount: profile.values.length,
      measurementsChanged: !isCurrentProfile(profile.id),
      chargeMinor: offer.stitchingChargeMinor,
      leadTimeDays: offer.leadTimeDays,
    },
    movableToWishlist: isMovableToWishlist(line),
  };
}

/** The profile a cut line names, read as its own owner — never by id alone. */
function stitchingProfileOf(line: CartLineRecord) {
  if (line.stitchingProfileId === null || line.stitchingOwner === null) return null;
  return profileById(line.stitchingProfileId, line.stitchingOwner);
}

/**
 * The figures a cut line will be cut to, for the order's snapshot (§34.7).
 *
 * It lives here because the owner the profile is read as lives here, and neither
 * belongs on the wire. Checkout asks the bag rather than the profile store, so
 * there is one place that knows whose measurements a line names.
 */
export function stitchingFiguresFor(
  cartId: string,
  lineId: string,
): { pointId: string; mm: number }[] {
  const cart = activeCart(cartId);
  if (cart === null) return [];

  const line = activeLines(cart).find((entry) => entry.id === lineId);
  const profile = line === undefined ? null : stitchingProfileOf(line);
  return (profile?.values ?? []).map((value) => ({
    pointId: value.pointId,
    mm: value.valueMm,
  }));
}

/**
 * §16 `summary(cart) -> {lines[], pricing, freeDeliveryProgress}`.
 *
 * A PURE read. It used to mark a lapsed line EXPIRED as it went, which meant any
 * read between a hold lapsing and the customer paying — the checkout page asking
 * for a fresh quote, the bag panel opening — took the line out of the cart
 * before §7.2 step 1 could see it. Placement then found nothing to name and said
 * "the total has changed" or "we could not place your order" instead of which
 * items were no longer held. A lapsed line is left out of the projection here
 * and recorded by whatever acts on it: placement names it, a re-add replaces it.
 */
export function summaryFor(cartId: string, locale: Locale): BagSummaryPayload | null {
  // D6: a converted cart still exists, but it is no longer anybody's bag.
  const cart = activeCart(cartId);
  if (cart === null) return null;

  const lines = activeLines(cart).flatMap((line) => {
    const payload = toLinePayload(line, locale);
    return payload === null ? [] : [payload];
  });

  return {
    lines,
    heldUntil: earliestHold(lines),
    // A set counts as one item. Whether it counts as three is the operator's
    // call, which is exactly why the number is stated rather than summed
    // client-side.
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    ...priceCart(
      lines.map((line) => line.lineTotalMinor),
      activeCode(cartId),
      locale,
    ),
  };
}

/**
 * §7.3 — when the bag's first hold lapses, stated so the interface never picks
 * one line's time and calls it the bag's (DATA-13). Each line is held from when
 * it was last added to or changed, so their times differ; the earliest is the
 * first moment something leaves. A cut line holds nothing and is not counted.
 */
function earliestHold(lines: readonly BagLinePayload[]): string | null {
  return lines.reduce<string | null>((earliest, line) => {
    const expiresAt = line.reservationExpiresAt;
    if (expiresAt === null) return earliest;
    return earliest === null || Date.parse(expiresAt) < Date.parse(earliest) ? expiresAt : earliest;
  }, null);
}

/**
 * A line's product name in one locale — what §7.2 step 1 names when the line's
 * hold has lapsed, and so cannot be projected as a line any more.
 */
export function lineNameFor(line: CartLineRecord, locale: Locale): string {
  const record = CATALOGUE.find((entry) => entry.id === line.productId);
  return record === undefined ? '' : productNameFor(record, locale);
}
