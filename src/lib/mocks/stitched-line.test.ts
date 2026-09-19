import { beforeEach, describe, expect, it } from 'vitest';

import { addItem, createCart, removeLine, resetCarts, summaryFor, updateQuantity } from './bag-db';
import { reservationLedger, resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { placeOrder, quoteFor, resetOrders, type PlaceInput } from './checkout-db';
import { onHandFor } from './inventory-db';
import { styleOfferFor } from './measurement-sets-db';
import { saveProfile, type ProfileOwnerRow, type SubmissionRow } from './profiles-db';
import { toProductDetail } from './product-detail-db';

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

/* `kameezLength` is the figure varied to make DIFFERENT measurements: a length is
   judged against no other point, so changing it cannot raise a note that would
   stop the save. */
function submission(kameezLength = '40'): SubmissionRow {
  return {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'GARMENT_COPY',
    version: 1,
    entries: ENTRIES.map((entry) =>
      entry.pointId === 'kameezLength' ? { ...entry, raw: kameezLength } : entry,
    ),
    preferences: [],
    acknowledgedFindings: [],
  };
}

/**
 * The version a save of these figures names. Saving the SAME figures again
 * answers with the same version; a different length makes a new one.
 */
function savedProfileId(kameezLength = '40'): string {
  const outcome = saveProfile(OWNER, submission(kameezLength));
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

/* A SECOND product cut as the same style — the fixture offers every garment in
   two cloths, so an order of two kameez shalwars is an ordinary basket. */
function anotherKameezProduct(): string {
  const first = KAMEEZ_PRODUCT();
  const record = CATALOGUE.find(
    (entry) =>
      entry.id !== first &&
      toProductDetail(entry, 'en').stitching?.garmentStyle === 'KAMEEZ_SHALWAR',
  );
  if (record === undefined) throw new Error('The fixture has only one kameez shalwar.');
  return record.id;
}

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

    // Saving the same figures again names the same version, so it merges too.
    addItem(cartId, productId, [], 1, 'en', savedProfileId(), OWNER);
    expect(summaryFor(cartId, 'en')?.lines).toHaveLength(1);

    // Different figures are a different garment, however alike the two look.
    addItem(cartId, productId, [], 1, 'en', savedProfileId('41'), OWNER);
    expect(summaryFor(cartId, 'en')?.lines).toHaveLength(2);
  });

  it('marks the line whose measurements changed since it was added, and only that one', () => {
    const cartId = createCart();
    const earlier = KAMEEZ_PRODUCT();
    const later = anotherKameezProduct();

    addItem(cartId, earlier, [], 1, 'en', savedProfileId(), OWNER);
    addItem(cartId, later, [], 1, 'en', savedProfileId('41'), OWNER);

    const lines = summaryFor(cartId, 'en')?.lines ?? [];
    const flagOf = (productId: string) =>
      lines.find((line) => line.productId === productId)?.stitching?.measurementsChanged;
    // The refusal at checkout names a product; this is what lets the bag say
    // which LINE it means when two lines are the same garment.
    expect(flagOf(earlier)).toBe(true);
    expect(flagOf(later)).toBe(false);
  });

  it('refuses a profile belonging to somebody ELSE', () => {
    const cartId = createCart();
    const mine = savedProfileId();
    const stranger: ProfileOwnerRow = { keptWith: 'ACCOUNT', key: 'stranger@example.com' };

    // The id is real and the garment is right; it is simply not theirs. An id
    // arrives from a browser, and what it buys is cloth cut to those figures.
    expect(addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', mine, stranger).kind).toBe(
      'MEASUREMENTS_REFUSED',
    );
    // A device cannot name an account's profile either — the KIND is part of it.
    const device: ProfileOwnerRow = { keptWith: 'DEVICE', key: OWNER.key };
    expect(addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', mine, device).kind).toBe(
      'MEASUREMENTS_REFUSED',
    );
    expect(addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', mine, null).kind).toBe(
      'MEASUREMENTS_REFUSED',
    );
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
    expect(addItem(cartId, waistcoat, [], 1, 'en', savedProfileId(), OWNER).kind).toBe(
      'MEASUREMENTS_REFUSED',
    );
  });

  it('refuses a garment the backend does not offer stitching for', () => {
    const cartId = createCart();
    // A boy's kurta maps to null deliberately: every served bound is an adult's.
    const result = addItem(cartId, uncuttableProductId(), [], 1, 'en', savedProfileId(), OWNER);
    expect(result.kind).toBe('MEASUREMENTS_REFUSED');
  });

  it('refuses a profile the store does not hold', () => {
    const cartId = createCart();
    const result = addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', 'not-a-profile', OWNER);
    expect(result.kind).toBe('MEASUREMENTS_REFUSED');
  });

  it('keeps a refused profile apart from a missing cart, the only thing the BFF replaces a cart for', () => {
    // A real cart, refused on its measurements: an answer about the profile.
    const cartId = createCart();
    expect(addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', 'not-a-profile', OWNER).kind).toBe(
      'MEASUREMENTS_REFUSED',
    );
    // No such cart, whatever the measurements: that, and only that, is NOT_FOUND.
    expect(
      addItem('no-such-cart', KAMEEZ_PRODUCT(), [], 1, 'en', savedProfileId(), OWNER).kind,
    ).toBe('NOT_FOUND');
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

    // The customer measures again, differently. That mints a new version and
    // supersedes the one the line names — so the order must stop rather than cut
    // to figures nobody has looked at.
    savedProfileId('41');

    const outcome = placeOrder(cartId, input, 'en');
    expect(outcome.kind).toBe('MEASUREMENTS_CHANGED');
    if (outcome.kind === 'MEASUREMENTS_CHANGED') {
      expect(outcome.restitchedItems).toHaveLength(1);
      expect(outcome.restitchedItems[0]?.length).toBeGreaterThan(0);
    }
  });

  it('places two garments of one style, each added after its own save of the same figures', () => {
    /*
     * The review's reproduction, and the ordinary way this happens: measure for
     * one kameez shalwar and add it; open a second, take the saved figures, check
     * them, save, add. Every add goes through a save, and a save used to mint a
     * version every time — so the second add superseded the first line's version
     * and the order could never be placed, whatever the customer did.
     */
    const cartId = createCart();
    addItem(cartId, KAMEEZ_PRODUCT(), [], 1, 'en', savedProfileId(), OWNER);
    addItem(cartId, anotherKameezProduct(), [], 1, 'en', savedProfileId(), OWNER);

    expect(summaryFor(cartId, 'en')?.lines).toHaveLength(2);
    // By card: two garments with their stitching pass the Cash on Delivery cap,
    // which is its own refusal and not the one under test.
    const input = { ...inputFor(cartId), paymentMethodId: 'card' };
    expect(placeOrder(cartId, input, 'en').kind).toBe('PLACED');
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
