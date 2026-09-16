import { beforeEach, describe, expect, it } from 'vitest';

import { addItem, createCart, removeLine, resetCarts, summaryFor, updateQuantity } from './bag-db';
import { reservationLedger, resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { placeOrder, quoteFor, resetOrders, type PlaceInput } from './checkout-db';
import { styleOfferFor } from './measurement-sets-db';
import { saveProfile, type ProfileOwnerRow, type SubmissionRow } from './profiles-db';
import { onHandFor, toProductDetail } from './product-detail-db';

/**
 * §34.8 — a garment being CUT, in the bag and through to the order.
 *
 * Three properties are the whole of what makes this line different from every
 * other, and each one is a way the store could quietly do the wrong thing with
 * cloth:
 *
 * - it holds NOTHING, so it must not take a size off a shelf and must not be
 *   dropped by the expiry that governs lines which do;
 * - the stitching is a LINE COMPONENT, so the garment's own price stays the
 *   garment's price and the charge is its own figure;
 * - it names the measurement VERSION it was added against, so saving those
 *   measurements again stops the order rather than cutting to figures the
 *   customer never confirmed.
 */

const OWNER: ProfileOwnerRow = { keptWith: 'ACCOUNT', key: 'customer@example.com' };

/* A kameez shalwar with every required figure in range — the same set the
   profile store's own tests use, for the same reason: it has to pass. */
const ENTRIES = [
  { pointId: 'kameezLength', raw: '40', unit: 'IN' as const },
  { pointId: 'kameezSleeve', raw: '24', unit: 'IN' as const },
  { pointId: 'kameezShoulder', raw: '18', unit: 'IN' as const },
  { pointId: 'kameezNeck', raw: '15.5', unit: 'IN' as const },
  { pointId: 'kameezChest', raw: '21', unit: 'IN' as const },
  { pointId: 'kameezBottom', raw: '22', unit: 'IN' as const },
  { pointId: 'shalwarLength', raw: '40', unit: 'IN' as const },
  { pointId: 'shalwarPaincha', raw: '7.5', unit: 'IN' as const },
];

function submission(): SubmissionRow {
  return {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'GARMENT_COPY',
    version: 1,
    entries: ENTRIES,
    preferences: [],
    acknowledgedFindings: [],
  };
}

/** A saved profile version, and the id that names it. */
function savedProfileId(): string {
  const outcome = saveProfile(OWNER, submission());
  if (outcome.kind !== 'SAVED') throw new Error('Expected the fixture profile to save.');
  return outcome.profile.id;
}

/**
 * A product the backend declares is cut as THIS style.
 *
 * Picking "any stitched product" is what the first version of these tests did,
 * and it paired a waistcoat suit with a kameez profile and then asserted the
 * mismatched result correct — the charge, the lead time and the style label all
 * came from the profile's table rather than the product's. The tests blessed the
 * defect. The style is part of what a fixture has to state.
 */
function productCutAs(garmentStyle: string): string {
  const record = CATALOGUE.find(
    (entry) => toProductDetail(entry, 'en').stitching?.garmentStyle === garmentStyle,
  );
  if (record === undefined) throw new Error(`No product in the fixture is cut as ${garmentStyle}.`);
  return record.id;
}

/** A product the backend declares is NOT cut at all — the boy's kurta. */
function uncuttableProductId(): string {
  const record = CATALOGUE.find((entry) => toProductDetail(entry, 'en').stitching === null);
  if (record === undefined) throw new Error('Every product in the fixture is cuttable.');
  return record.id;
}

const KAMEEZ_PRODUCT = (): string => productCutAs('KAMEEZ_SHALWAR');

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetOrders();
});

describe('a made-to-measure bag line', () => {
  it('takes no reservation at all, and is not dropped for having none', () => {
    const cartId = createCart();
    const productId = KAMEEZ_PRODUCT();

    const result = addItem(cartId, productId, [], 1, 'en', savedProfileId(), OWNER);
    expect(result.kind).toBe('ADDED');

    const summary = summaryFor(cartId, 'en');
    expect(summary?.lines).toHaveLength(1);
    // §7.1 was never entered: there is no row, not even a released one.
    expect(reservationLedger(cartId)).toHaveLength(0);
    expect(summary?.lines[0]?.reservationExpiresAt).toBeNull();
    // No size, because there is none to pick.
    expect(summary?.lines[0]?.pieces).toEqual([]);
  });

  it('prices the stitching as its own figure, per garment', () => {
    const cartId = createCart();
    const productId = KAMEEZ_PRODUCT();
    addItem(cartId, productId, [], 2, 'en', savedProfileId(), OWNER);

    const line = summaryFor(cartId, 'en')?.lines[0];
    const offer = styleOfferFor('KAMEEZ_SHALWAR');
    const garmentMinor = CATALOGUE.find((entry) => entry.id === productId)?.currentMinor ?? 0;

    expect(line?.stitching?.chargeMinor).toBe(offer?.stitchingChargeMinor);
    // The garment keeps its own unit price; the charge is beside it, not inside.
    expect(line?.unitPriceMinor).toBe(garmentMinor);
    expect(line?.lineTotalMinor).toBe((garmentMinor + (offer?.stitchingChargeMinor ?? 0)) * 2);
  });

  it('is its own line per set of measurements, and merges within one', () => {
    const cartId = createCart();
    const productId = KAMEEZ_PRODUCT();
    const first = savedProfileId();

    addItem(cartId, productId, [], 1, 'en', first, OWNER);
    addItem(cartId, productId, [], 1, 'en', first, OWNER);
    expect(summaryFor(cartId, 'en')?.lines).toHaveLength(1);
    expect(summaryFor(cartId, 'en')?.lines[0]?.quantity).toBe(2);

    // A second save is different figures, so it is a different garment.
    addItem(cartId, productId, [], 1, 'en', savedProfileId(), OWNER);
    expect(summaryFor(cartId, 'en')?.lines).toHaveLength(2);
  });

  it('refuses a profile belonging to somebody ELSE', () => {
    const cartId = createCart();
    const mine = savedProfileId();
    const stranger: ProfileOwnerRow = { keptWith: 'ACCOUNT', key: 'stranger@example.com' };

    // The id is real and the garment is right; it is simply not theirs. An id
    // arrives from a browser, and what it buys is cloth cut to those figures.
    expect(addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', mine, stranger).kind).toBe('NOT_FOUND');
    // A device cannot name an account's profile either — the KIND is part of it.
    const device: ProfileOwnerRow = { keptWith: 'DEVICE', key: OWNER.key };
    expect(addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', mine, device).kind).toBe('NOT_FOUND');
    expect(addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', mine, null).kind).toBe('NOT_FOUND');
  });

  it('refuses a profile for a DIFFERENT garment than the product is cut as', () => {
    const cartId = createCart();
    const waistcoat = productCutAs('WAISTCOAT_SUIT');

    /*
     * A kameez shalwar profile on a waistcoat suit. Without this the line was
     * priced from the KAMEEZ's charge and lead time, the order carried the
     * kameez's style label, and the workshop was sent a kameez's figures for a
     * waistcoat — all of it looking perfectly well-formed.
     */
    expect(addItem(cartId, waistcoat, [], 1, 'en', savedProfileId(), OWNER).kind).toBe('NOT_FOUND');
  });

  it('refuses a garment the backend does not offer stitching for', () => {
    const cartId = createCart();
    // A boy's kurta maps to null deliberately: every served bound is an adult's.
    const result = addItem(cartId, uncuttableProductId(), [], 1, 'en', savedProfileId(), OWNER);
    expect(result.kind).toBe('NOT_FOUND');
  });

  it('refuses a profile the store does not hold', () => {
    const cartId = createCart();
    const result = addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', 'not-a-profile', OWNER);
    expect(result.kind).toBe('NOT_FOUND');
  });

  it('changes quantity and is removed without touching a hold it never took', () => {
    const cartId = createCart();
    const productId = KAMEEZ_PRODUCT();
    addItem(cartId, productId, [], 1, 'en', savedProfileId(), OWNER);

    const lineId = summaryFor(cartId, 'en')?.lines[0]?.id ?? '';
    expect(updateQuantity(cartId, lineId, 3, 'en').kind).toBe('ADDED');
    expect(summaryFor(cartId, 'en')?.lines[0]?.quantity).toBe(3);

    removeLine(cartId, lineId, 'en');
    expect(summaryFor(cartId, 'en')?.lines).toHaveLength(0);
    expect(reservationLedger(cartId)).toHaveLength(0);
  });
});

describe('a made-to-measure line at checkout', () => {
  function inputFor(cartId: string): PlaceInput {
    const quote = quoteFor(cartId, 'en', 'standard', false);
    if (quote === null) throw new Error('Expected a quote.');
    return {
      contactName: 'Test Customer',
      contactMobile: '03001234567',
      contactEmail: '',
      addressLine: '12 Example Street, Block A',
      addressCity: 'Lahore',
      deliveryOptionId: 'standard',
      paymentMethodId: 'cod',
      isGift: false,
      giftMessage: '',
      expectedTotalMinor: quote.totals.totalMinor,
    };
  }

  it('is quoted, and the quote says a garment is being cut', () => {
    const cartId = createCart();
    addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', savedProfileId(), OWNER);

    const quote = quoteFor(cartId, 'en', 'standard', false);
    expect(quote?.madeToMeasure.isPresent).toBe(true);
    expect(quote?.madeToMeasure.leadTimeDays).toBe(styleOfferFor('KAMEEZ_SHALWAR')?.leadTimeDays);
  });

  it('places, allocating nothing, and snapshots the figures onto the order', () => {
    const cartId = createCart();
    addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', savedProfileId(), OWNER);

    const outcome = placeOrder(cartId, inputFor(cartId), 'en');
    expect(outcome.kind).toBe('PLACED');
    if (outcome.kind !== 'PLACED') return;

    const line = outcome.order.lines[0];
    expect(line?.stitching?.styleLabel).toBe('Kameez shalwar');
    // §34.7 — the VALUES, copied. Not a reference a later edit could rewrite.
    expect(line?.stitching?.measurements).toHaveLength(ENTRIES.length);
    expect(line?.stitching?.measurements[0]?.mm).toBeGreaterThan(0);
  });

  it('REFUSES when the measurements were saved again after it went in the bag', () => {
    const cartId = createCart();
    addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', savedProfileId(), OWNER);
    const input = inputFor(cartId);

    // The customer measures again. That mints a new version and supersedes the
    // one the line names — so the order must stop rather than cut to figures
    // nobody has looked at.
    savedProfileId();

    const outcome = placeOrder(cartId, input, 'en');
    expect(outcome.kind).toBe('MEASUREMENTS_CHANGED');
    if (outcome.kind === 'MEASUREMENTS_CHANGED') {
      expect(outcome.restitchedItems).toHaveLength(1);
      expect(outcome.restitchedItems[0]?.length).toBeGreaterThan(0);
    }
  });

  it('leaves a stock line in the same bag untouched by any of it', () => {
    const cartId = createCart();
    const productId = KAMEEZ_PRODUCT();
    const record = CATALOGUE.find((entry) => entry.id === productId);
    if (record === undefined) throw new Error('The product went missing between two lines.');
    const detail = toProductDetail(record, 'en');

    const selections = detail.pieces.flatMap((piece) => {
      const size = piece.sizes.find((entry) => onHandFor(piece.id, entry.id) > 0);
      return size === undefined ? [] : [{ pieceId: piece.id, sizeId: size.id }];
    });
    if (selections.length !== detail.pieces.length) return;

    addItem(cartId, productId, selections, 1, 'en');
    addItem(cartId, productId, [], 1, 'en', savedProfileId(), OWNER);

    const lines = summaryFor(cartId, 'en')?.lines ?? [];
    expect(lines).toHaveLength(2);
    // The picked one still holds its sizes and its expiry; the cut one neither.
    const picked = lines.find((line) => line.stitching === null);
    const cut = lines.find((line) => line.stitching !== null);
    expect(picked?.reservationExpiresAt).not.toBeNull();
    expect(picked?.pieces.length).toBeGreaterThan(0);
    expect(cut?.reservationExpiresAt).toBeNull();
  });
});
