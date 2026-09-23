import { beforeEach, describe, expect, it } from 'vitest';

import { productAvailabilityFor } from './availability-db';
import { addItem, createCart, resetCarts, summaryFor } from './bag-db';
import { resetReservations } from './bag-reservations';
import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { resetOrders } from './checkout-db';
import {
  removeItem,
  resetSavedItems,
  saveItem,
  savedItemsFor,
} from './wishlist-db';
import { resetAddresses } from './addresses-db';
import { resetSavedSizes } from './saved-sizes-db';
import {
  adoptDeviceToken,
  isKnownOwner,
  profileById,
  resetDeviceTokens,
  resetProfiles,
  saveProfile,
} from './profiles-db';
import {
  EMPTY_SESSION,
  captureMockSession,
  carryOrders,
  isEmptySession,
  mockSessionSchema,
  restoreMockSession,
} from './session-snapshot';

/** The fields an order carries, with nothing in them — only the ids matter here. */
const EMPTY_ORDER = {
  id: '',
  orderNumber: '',
  accountKey: null,
  state: 'PLACED',
  paymentState: 'PENDING',
  placedAt: '2026-09-23T00:00:00.000Z',
  contactName: '',
  contactMobile: '',
  deliveryAddress: '',
  deliveryCity: '',
  deliveryLabel: '',
  paymentLabel: '',
  isGift: false,
  giftMessage: '',
  lines: [],
  totals: {
    subtotalMinor: 0,
    discountMinor: 0,
    deliveryMinor: 0,
    giftMinor: 0,
    totalMinor: 0,
  },
  transferInstructions: null,
};

/**
 * D1 serverless — a bag that outlives the instance that took it.
 *
 * The deployed store lost every bag on the way to checkout: the mock stores are
 * module-scoped, and on a serverless host the request that renders `/checkout`
 * need not be served by the process that handled "add to bag". These tests
 * reproduce that by CLEARING the stores between the two halves of a journey,
 * which is what a cold instance is, and assert the customer never sees it.
 *
 * The subtle half is the reservation rows. `isLapsed` reads a line as expired
 * when no ACTIVE hold names it, so a cart restored without its holds is still
 * an EMPTY bag — the projection drops every line. A test that only compared
 * stored records would pass while the customer still saw nothing, so every
 * assertion below goes through `summaryFor`, the projection the page renders.
 */

/** A one-piece length: SIMPLE, no size set, so an add needs no selections. */
function inStockLength(): CatalogueRecord {
  const record = CATALOGUE.find(
    (entry) =>
      entry.garmentType === 'unstitched' &&
      entry.type === 'SIMPLE' &&
      productAvailabilityFor(entry.id, 'en')?.status !== 'SOLD_OUT',
  );
  if (record === undefined) throw new Error('The fixture has no unstitched length in stock.');
  return record;
}

/** Everything a serverless instance forgets when it is replaced by a cold one. */
function coldInstance(): void {
  resetCarts();
  resetReservations();
  resetOrders();
  resetProfiles();
  resetDeviceTokens();
  resetSavedItems();
  resetAddresses();
  resetSavedSizes();
}

beforeEach(() => {
  coldInstance();
});

describe('a mock session carried between instances', () => {
  it('brings the bag back after the instance that took it is gone', () => {
    const cartId = createCart();
    expect(addItem(cartId, inStockLength().id, [], 1, 'en').kind).toBe('ADDED');

    const before = summaryFor(cartId, 'en');
    expect(before?.lines).toHaveLength(1);

    const session = captureMockSession(cartId, null);
    coldInstance();

    // The symptom the operator reported, reproduced: the bag is simply gone.
    expect(summaryFor(cartId, 'en')).toBeNull();

    restoreMockSession(session);

    const after = summaryFor(cartId, 'en');
    expect(after?.lines).toHaveLength(1);
    expect(after?.lines[0]?.id).toBe(before?.lines[0]?.id);
  });

  it('carries the holds, so a restored line is not read as lapsed', () => {
    const cartId = createCart();
    addItem(cartId, inStockLength().id, [], 1, 'en');

    const session = captureMockSession(cartId, null);
    expect(session.reservations.length).toBeGreaterThan(0);

    coldInstance();
    // Everything EXCEPT the holds: the failure mode a records-only snapshot has.
    restoreMockSession({ ...session, reservations: [] });

    expect(summaryFor(cartId, 'en')?.lines ?? []).toHaveLength(0);
  });

  it('keeps the line ids, because the rendered page already refers to them', () => {
    /*
     * `mockId` counts up from one shared counter, and `resetCarts` puts it
     * back to zero — so the cart under test is the SECOND one minted here. A
     * cold instance that mints one of its own then takes id 1, which is not
     * this cart's, and the counter sits somewhere else than it did before:
     * exactly the conditions under which replaying the adds would hand the
     * line a different id from the one the browser is holding.
     */
    createCart();
    const cartId = createCart();
    addItem(cartId, inStockLength().id, [], 1, 'en');
    const lineId = summaryFor(cartId, 'en')?.lines[0]?.id;
    expect(lineId).toBeDefined();

    const session = captureMockSession(cartId, null);
    coldInstance();
    createCart();
    restoreMockSession(session);

    expect(summaryFor(cartId, 'en')?.lines[0]?.id).toBe(lineId);
  });

  it('does not overwrite a cart the instance already holds', () => {
    const cartId = createCart();
    addItem(cartId, inStockLength().id, [], 1, 'en');

    const stale = captureMockSession(cartId, null);
    addItem(cartId, inStockLength().id, [], 1, 'en');
    const fresh = summaryFor(cartId, 'en')?.lines.length ?? 0;

    restoreMockSession(stale);

    expect(summaryFor(cartId, 'en')?.lines).toHaveLength(fresh);
  });

  it('survives the round trip through its own schema', () => {
    const cartId = createCart();
    addItem(cartId, inStockLength().id, [], 1, 'en');

    const parsed = mockSessionSchema.safeParse(
      JSON.parse(JSON.stringify(captureMockSession(cartId, null))),
    );

    expect(parsed.success).toBe(true);
  });

  it('keeps a placed order after the cart that produced it is replaced', () => {
    const order = {
      ...EMPTY_ORDER,
      id: 'order-1',
      orderNumber: 'AA-1001',
    };
    const previous = { ...EMPTY_SESSION, orders: [order] };

    // The next capture cannot reach it: a fresh cart knows nothing about it.
    const carried = carryOrders(previous, EMPTY_SESSION);

    expect(carried.orders.map((row) => row.orderNumber)).toEqual(['AA-1001']);
    expect(isEmptySession(carried)).toBe(false);
  });

  it('does not duplicate an order the new snapshot already carries', () => {
    const order = { ...EMPTY_ORDER, id: 'order-1', orderNumber: 'AA-1001' };
    const session = { ...EMPTY_SESSION, orders: [order] };

    expect(carryOrders(session, session).orders).toHaveLength(1);
  });

  it('is empty for a browser that has never added anything', () => {
    expect(captureMockSession(null, null)).toEqual(EMPTY_SESSION);
    expect(captureMockSession('no-such-cart', null)).toEqual(EMPTY_SESSION);
    expect(isEmptySession(EMPTY_SESSION)).toBe(true);
  });
});

describe("a signed-in customer's belongings carried between instances", () => {
  const ACCOUNT = 'customer@example.com';

  it('brings saved items back, removals included', () => {
    saveItem(ACCOUNT, inStockLength().id);
    expect(savedItemsFor(ACCOUNT)).toHaveLength(1);

    const session = captureMockSession(null, null, ACCOUNT);
    expect(session.saved).toHaveLength(1);
    // Worth a cookie on its own: a heart pressed is not nothing.
    expect(isEmptySession(session)).toBe(false);

    resetSavedItems();
    expect(savedItemsFor(ACCOUNT)).toHaveLength(0);

    restoreMockSession(session);
    expect(savedItemsFor(ACCOUNT)).toHaveLength(1);
  });

  it('carries nothing for a guest, and never another account', () => {
    saveItem(ACCOUNT, inStockLength().id);

    expect(captureMockSession(null, null, null).saved).toHaveLength(0);
    expect(captureMockSession(null, null, 'somebody@else.com').saved).toHaveLength(0);
  });

  it('lets a removal stick rather than restoring what was just taken out', () => {
    const productId = inStockLength().id;
    saveItem(ACCOUNT, productId);
    const withItem = captureMockSession(null, null, ACCOUNT);

    removeItem(ACCOUNT, productId);
    const afterRemoval = captureMockSession(null, null, ACCOUNT);

    /*
     * Both snapshots carry rows, so the newer one wins outright. Merging them
     * would resurrect the heart the customer just pressed off — D6 keeps the
     * removal AS a row, so "has rows" is not the same as "has it saved".
     */
    const carried = carryOrders(withItem, afterRemoval);

    resetSavedItems();
    restoreMockSession(carried);
    expect(savedItemsFor(ACCOUNT)).toHaveLength(0);
  });

  it('keeps belongings when a later request captured none of its own', () => {
    saveItem(ACCOUNT, inStockLength().id);
    const signedIn = captureMockSession(null, null, ACCOUNT);
    // A request that touched only the bag knows nothing of the account.
    const bagOnly = captureMockSession(null, null, null);

    expect(carryOrders(signedIn, bagOnly).saved).toHaveLength(1);
  });
});

describe("a guest's measurements carried between instances", () => {
  const DEVICE = 'device-token-for-the-session-test';
  const OWNER = { keptWith: 'DEVICE', key: DEVICE } as const;

  /* The same figures the profile store's own tests use, for the same reason. */
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

  function saveOne(): string {
    adoptDeviceToken(DEVICE);
    const outcome = saveProfile(OWNER, {
      garmentStyle: 'KAMEEZ_SHALWAR',
      source: 'GARMENT_COPY',
      version: 1,
      entries: ENTRIES,
      preferences: [],
      acknowledgedFindings: [],
    });
    if (outcome.kind !== 'SAVED') throw new Error('Expected the fixture profile to save.');
    return outcome.profile.id;
  }

  it('brings the figures back, and the token that makes them readable', () => {
    const profileId = saveOne();
    const session = captureMockSession(null, DEVICE);

    expect(session.profiles).toHaveLength(1);
    expect(session.device).toBe(DEVICE);
    // Worth carrying on its own: a bag with nothing in it is still a visit.
    expect(isEmptySession(session)).toBe(false);

    resetProfiles();
    resetDeviceTokens();
    expect(profileById(profileId, OWNER)).toBeNull();
    // The 401 the next instance would answer with, before any profile is sought.
    expect(isKnownOwner(OWNER)).toBe(false);

    restoreMockSession(session);

    expect(isKnownOwner(OWNER)).toBe(true);
    expect(profileById(profileId, OWNER)?.id).toBe(profileId);
  });

  it('survives the round trip through its own schema', () => {
    saveOne();
    const parsed = mockSessionSchema.safeParse(
      JSON.parse(JSON.stringify(captureMockSession(null, DEVICE))),
    );

    expect(parsed.success).toBe(true);
  });

  it('carries figures a bag-only request did not capture', () => {
    saveOne();
    const withProfiles = captureMockSession(null, DEVICE);
    // A request that touched the bag alone knows nothing of the device.
    const bagOnly = captureMockSession(null, null);

    const carried = carryOrders(withProfiles, bagOnly);

    expect(carried.profiles).toHaveLength(1);
    expect(carried.device).toBe(DEVICE);
  });
});
