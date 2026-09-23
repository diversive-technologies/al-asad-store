import { z } from 'zod';

import { addressDetailSchema } from '@/lib/domain/address';

import { adoptCart, adoptCartCodeEvents, cartCodeEvents, cartRecord } from './cart-store';
import { type OrderPayload, findOrder, recordOrder } from './orders-db';
import { adoptAddressRows, addressRowsOf, defaultEventsOf } from './addresses-db';
import { adoptDeviceToken } from './profile-owners';
import { adoptProfiles, profilesOfOwner } from './profiles-db';
import { RESERVATIONS, type Reservation } from './reservation-ledger';
import { adoptSizeEvents, sizeEventsOf } from './saved-sizes-db';
import { adoptSavedRows, savedRowsOf } from './wishlist-db';

/**
 * D1 — carrying one visitor's mock state between serverless invocations.
 *
 * ## Why this module exists at all
 *
 * Every store in this directory is a module-scoped `Map` or array, and the
 * comment on `RESERVATIONS` says what that assumes out loud: "module-scoped so
 * it survives across requests within a dev server process". On one long-lived
 * server that assumption holds and nothing here is needed.
 *
 * On a serverless host it is false twice over. A cold start begins with empty
 * stores, and two requests seconds apart can be served by different instances
 * with different memory. Worse, Next splits the RSC render and the Route
 * Handlers into separate functions, so "add to bag" and the `/checkout` page
 * that reads the bag are not even the same process — `node.ts` already
 * describes that split for the dev server's module layers.
 *
 * The visible symptom is the one the operator reported: a bag that is empty by
 * the time checkout renders.
 *
 * ## Why the RESERVATIONS rows travel with the cart
 *
 * It is not enough to carry the lines. `isLapsed` in `cart-store.ts` calls
 * `expiryFor`, which answers null when no ACTIVE reservation row names the
 * line — and a line with no expiry is read as lapsed and excluded from the
 * projection. A cart restored without its holds is therefore indistinguishable
 * from an abandoned one, and renders as an empty bag. The rows come too.
 *
 * ## Why ids are carried rather than regenerated
 *
 * `mockId` counts up from a single module-scoped `nextId` shared by every
 * group, so an id depends on how many ids that instance happened to mint
 * before it. Replaying the adds through `addItem` would therefore hand the
 * line a DIFFERENT id on every instance, while the page the browser is looking
 * at still refers to the old one — every remove and quantity change would 404.
 * So records are restored verbatim, ids included.
 *
 * ## What this is not
 *
 * It is not a database, and it is per-visitor rather than shared: the stock
 * ledger it restores is that visitor's own view. Two people demonstrating the
 * store at once each see full stock rather than competing for it, which is the
 * right behaviour for a demonstration and the wrong one for a shop. D1 ends
 * when the Java service replaces this directory, and this module goes with it.
 */

const selectionSchema = z.object({
  pieceId: z.string().min(1),
  sizeId: z.string().min(1),
});

const ownerSchema = z.object({
  keptWith: z.union([z.literal('ACCOUNT'), z.literal('DEVICE')]),
  key: z.string().min(1),
});

const lineSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  selections: z.array(selectionSchema),
  quantity: z.number().int().positive(),
  stitchingProfileId: z.string().min(1).nullable(),
  stitchingOwner: ownerSchema.nullable(),
  removedAt: z.number().int().nullable(),
  removalReason: z
    .union([z.literal('CUSTOMER'), z.literal('EXPIRED'), z.literal('MOVED_TO_WISHLIST')])
    .nullable(),
});

const cartSchema = z.object({
  id: z.string().min(1),
  lines: z.array(lineSchema),
  status: z.union([z.literal('ACTIVE'), z.literal('CONVERTED')]),
  orderNumber: z.string().min(1).nullable(),
});

/** D6 — the history, not a "current code" field. `activeCode` reads the last un-lifted one. */
const codeEventSchema = z.object({
  code: z.string().min(1),
  appliedAt: z.number().int(),
  liftedAt: z.number().int().nullable(),
});

/** §34 — one saved measurement version, exactly as the store holds it. */
const profileSchema = z.object({
  id: z.string().min(1),
  ownerKey: z.string().min(1),
  keptWith: z.union([z.literal('ACCOUNT'), z.literal('DEVICE')]),
  garmentStyle: z.string().min(1),
  setVersion: z.number().int(),
  ruleSetVersion: z.number().int(),
  version: z.number().int(),
  source: z.union([z.literal('GARMENT_COPY'), z.literal('TAILOR_CARD')]),
  preferences: z.array(z.object({ group: z.string(), value: z.string() })),
  values: z.array(
    z.object({
      pointId: z.string(),
      enteredValue: z.string(),
      unitEntered: z.union([z.literal('IN'), z.literal('CM')]),
      enteredAs: z.union([z.literal('HALF'), z.literal('FULL')]),
      basis: z.union([z.literal('GARMENT'), z.literal('BODY')]),
      origin: z.union([z.literal('TYPED'), z.literal('TRANSCRIBED')]),
      valueMm: z.number(),
    }),
  ),
  acknowledgedFindings: z.array(
    z.object({
      ruleId: z.string(),
      pointId: z.string(),
      direction: z.union([z.literal('ABOVE'), z.literal('BELOW')]).nullable(),
    }),
  ),
  createdAt: z.string(),
  supersededBy: z.string().nullable(),
});

/** §28.3 — what a signed-in customer keeps against their account. D6: removals are rows. */
const savedRowSchema = z.object({
  accountKey: z.string().min(1),
  productId: z.string().min(1),
  savedAt: z.string(),
  removedAt: z.string().nullable(),
});

const addressRowSchema = z.object({
  accountKey: z.string().min(1),
  addressId: z.string().min(1),
  version: z.number().int(),
  // SSOT: the four field rules live in the domain layer and are reused, not restated.
  detail: addressDetailSchema,
  savedAt: z.string(),
  supersededBy: z.number().int().nullable(),
  removedAt: z.string().nullable(),
});

const defaultEventSchema = z.object({
  accountKey: z.string().min(1),
  addressId: z.string().min(1),
  at: z.string(),
});

const sizeEventSchema = z.object({
  accountKey: z.string().min(1),
  sizeSetId: z.string().min(1),
  sizeId: z.string().min(1),
  kind: z.union([z.literal('SAVED'), z.literal('FORGOTTEN')]),
  at: z.string(),
});

const reservationSchema = z.object({
  cartId: z.string().min(1),
  lineId: z.string().min(1),
  pieceId: z.string().min(1),
  sizeId: z.string().min(1),
  quantity: z.number().int().positive(),
  expiresAt: z.number().int(),
  status: z.union([
    z.literal('ACTIVE'),
    z.literal('RELEASED'),
    z.literal('EXPIRED'),
    z.literal('ALLOCATED'),
  ]),
  settledAt: z.number().int().nullable(),
});

const totalsSchema = z.object({
  subtotalMinor: z.number().int(),
  discountMinor: z.number().int(),
  deliveryMinor: z.number().int(),
  giftMinor: z.number().int(),
  totalMinor: z.number().int(),
});

const orderLineSchema = z.object({
  productId: z.string(),
  productCode: z.string(),
  productName: z.string(),
  quantity: z.number().int(),
  unitPriceMinor: z.number().int(),
  lineTotalMinor: z.number().int(),
  pieces: z.array(z.object({ pieceCode: z.string(), name: z.string(), size: z.string() })),
  stitching: z
    .object({
      garmentStyle: z.string(),
      styleLabel: z.string(),
      profileId: z.string(),
      chargeMinor: z.number().int(),
      leadTimeDays: z.number().int(),
      measurements: z.array(z.object({ pointId: z.string(), mm: z.number() })),
    })
    .nullable(),
});

const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  accountKey: z.string().nullable(),
  state: z.string(),
  paymentState: z.string(),
  placedAt: z.string(),
  contactName: z.string(),
  contactMobile: z.string(),
  deliveryAddress: z.string(),
  deliveryCity: z.string(),
  deliveryLabel: z.string(),
  paymentLabel: z.string(),
  isGift: z.boolean(),
  giftMessage: z.string(),
  lines: z.array(orderLineSchema),
  totals: totalsSchema,
  transferInstructions: z
    .object({
      bankName: z.string(),
      accountTitle: z.string(),
      accountNumber: z.string(),
      iban: z.string(),
      reference: z.string(),
    })
    .nullable(),
});

/**
 * SEC-02 — the cookie is untrusted input and is parsed, never cast. A visitor
 * who edits their own session can only describe a different fake bag to
 * themselves; a MALFORMED one must not be able to crash the render, which is
 * what the schema is actually guarding against here.
 */
export const mockSessionSchema = z.object({
  cart: cartSchema.nullable(),
  codes: z.array(codeEventSchema),
  reservations: z.array(reservationSchema),
  orders: z.array(orderSchema),
  /** §34 — the guest's device token, so the next instance does not 401 them. */
  device: z.string().min(1).nullable(),
  profiles: z.array(profileSchema),
  /** §28.3 — the signed-in customer's own rows, or empty for a guest. */
  saved: z.array(savedRowSchema),
  addresses: z.array(addressRowSchema),
  addressDefaults: z.array(defaultEventSchema),
  sizes: z.array(sizeEventSchema),
});

export type MockSession = z.infer<typeof mockSessionSchema>;

/** Nothing recorded yet — the shape a first request starts from. */
export const EMPTY_SESSION: MockSession = {
  cart: null,
  codes: [],
  reservations: [],
  orders: [],
  device: null,
  profiles: [],
  saved: [],
  addresses: [],
  addressDefaults: [],
  sizes: [],
};

/** True when there is nothing worth writing a cookie for. */
export function isEmptySession(session: MockSession): boolean {
  return (
    session.cart === null &&
    session.orders.length === 0 &&
    session.profiles.length === 0 &&
    session.saved.length === 0 &&
    session.addresses.length === 0 &&
    session.sizes.length === 0
  );
}

/**
 * How many placed orders a visitor's cookie keeps, newest last.
 *
 * An order is the largest thing in the session — it carries a snapshot of
 * every line, and for a cut garment the measurements too — so the number is
 * small on purpose. A demonstration shows one order; the allowance is for the
 * second and third without unbounded growth.
 */
const CARRIED_ORDERS = 3;

/**
 * The new snapshot, keeping orders the old one had that it does not.
 *
 * A snapshot is scoped to the cart the cookie names, so an order stops being
 * reachable the moment that cart is replaced — and it IS replaced: placing an
 * order converts the cart, and the next add finds it converted, clears the
 * cookie and starts a fresh one (`add-for-customer.ts`). Without this the
 * customer's own confirmation link would 404 on a cold instance as soon as
 * they put something else in the bag.
 */
export function carryOrders(previous: MockSession, next: MockSession): MockSession {
  const known = new Set(next.orders.map((order) => order.orderNumber));
  const kept = previous.orders.filter((order) => !known.has(order.orderNumber));

  /*
   * The measurements are carried the same way and for the same reason: a
   * request that touched only the bag captures no profiles, and writing that
   * snapshot as it stands would drop figures the visitor already confirmed.
   */
  const heldProfiles = new Set(next.profiles.map((row) => row.id));
  const profiles = [...previous.profiles.filter((row) => !heldProfiles.has(row.id)), ...next.profiles];

  /*
   * §28.3's rows are carried only while the new snapshot has none of its own.
   * A signed-in request captures the account's rows in full, so taking those
   * verbatim is what lets a REMOVAL stick; a guest request captures nothing,
   * and overwriting the cookie with that would sign the customer's belongings
   * away because their bag happened to change.
   */
  const belongings =
    next.saved.length > 0 || next.addresses.length > 0 || next.sizes.length > 0
      ? {
          saved: next.saved,
          addresses: next.addresses,
          addressDefaults: next.addressDefaults,
          sizes: next.sizes,
        }
      : {
          saved: previous.saved,
          addresses: previous.addresses,
          addressDefaults: previous.addressDefaults,
          sizes: previous.sizes,
        };

  return {
    ...next,
    orders: [...kept, ...next.orders].slice(-CARRIED_ORDERS),
    device: next.device ?? previous.device,
    profiles,
    ...belongings,
  };
}

/**
 * Everything this instance holds for one visitor, ready to be written out.
 *
 * Scoped by cart id and by the order numbers that cart became: a snapshot must
 * never carry another visitor's rows, and every row here is reachable only
 * from this visitor's own cookie.
 */
export function captureMockSession(
  cartId: string | null,
  device: string | null,
  account: string | null = null,
): MockSession {
  /*
   * §34 — the measurements are captured whether or not there is a bag: taking
   * them is a journey of its own, and a visitor who has measured a kameez but
   * bagged nothing must not lose the figures.
   */
  const profiles = device === null ? [] : profilesOfOwner(`DEVICE:${device}`);
  const measurements = { device, profiles: profiles.map(copyProfile) };

  /*
   * §28.3 — saved items, addresses and saved sizes belong to an ACCOUNT, so a
   * guest carries none of them and a signed-in customer carries only their own.
   * Reachable on a serverless host because the test account is seeded at module
   * load, so a password sign-in succeeds on whichever instance answers.
   */
  const belongings =
    account === null
      ? { saved: [], addresses: [], addressDefaults: [], sizes: [] }
      : {
          saved: [...savedRowsOf(account)],
          addresses: addressRowsOf(account).map((row) => ({ ...row, detail: { ...row.detail } })),
          addressDefaults: [...defaultEventsOf(account)],
          sizes: [...sizeEventsOf(account)],
        };

  const cart = cartId === null ? null : cartRecord(cartId);
  if (cartId === null || cart === null) {
    return { ...EMPTY_SESSION, ...measurements, ...belongings };
  }

  const orderNumber = cart.orderNumber;
  const order = orderNumber === null ? null : findOrder(orderNumber);

  return {
    cart: {
      id: cartId,
      // `selections` is readonly on the record and mutable on the schema, so
      // the snapshot takes its own copy rather than aliasing the live row.
      lines: cart.lines.map((line) => ({ ...line, selections: [...line.selections] })),
      status: cart.status,
      orderNumber,
    },
    codes: [...cartCodeEvents(cartId)],
    reservations: RESERVATIONS.filter((row) => row.cartId === cartId),
    orders: order === null ? [] : [order],
    ...measurements,
    ...belongings,
  };
}

/**
 * Put a visitor's rows back into this instance's stores.
 *
 * Restoring is idempotent and never overwrites: an instance that already holds
 * the cart is the one that wrote the cookie, and its rows are at least as
 * fresh. Only a cold instance — the case this whole module exists for — takes
 * the cookie's copy.
 */
export function restoreMockSession(session: MockSession): void {
  const cart = session.cart;

  if (cart !== null && cartRecord(cart.id) === null) {
    adoptCart(cart.id, {
      lines: cart.lines.map((line) => ({ ...line, selections: [...line.selections] })),
      status: cart.status,
      orderNumber: cart.orderNumber,
    });

    adoptCartCodeEvents(cart.id, session.codes);

    for (const row of session.reservations) {
      if (!RESERVATIONS.some((held) => held.lineId === row.lineId && held.pieceId === row.pieceId)) {
        RESERVATIONS.push(toReservation(row));
      }
    }
  }

  for (const order of session.orders) {
    if (findOrder(order.orderNumber) === null) recordOrder(toOrder(order));
  }

  /*
   * The token first: without it `isKnownOwner` refuses this visitor with a 401
   * before any profile is looked for, because the token was minted on an
   * instance that no longer exists.
   */
  if (session.device !== null) adoptDeviceToken(session.device);
  if (session.profiles.length > 0) adoptProfiles(session.profiles.map(copyProfile));

  if (session.saved.length > 0) adoptSavedRows(session.saved);
  if (session.addresses.length > 0 || session.addressDefaults.length > 0) {
    adoptAddressRows(session.addresses, session.addressDefaults);
  }
  if (session.sizes.length > 0) adoptSizeEvents(session.sizes);
}

/** A profile with its nested arrays copied, so a snapshot never aliases a live row. */
function copyProfile(row: MockSession['profiles'][number]): MockSession['profiles'][number] {
  return {
    ...row,
    preferences: row.preferences.map((entry) => ({ ...entry })),
    values: row.values.map((entry) => ({ ...entry })),
    acknowledgedFindings: row.acknowledgedFindings.map((entry) => ({ ...entry })),
  };
}

/** The parsed row as the ledger's own type, with its readonly arrays copied. */
function toReservation(row: MockSession['reservations'][number]): Reservation {
  return {
    cartId: row.cartId,
    lineId: row.lineId,
    pieceId: row.pieceId,
    sizeId: row.sizeId,
    quantity: row.quantity,
    expiresAt: row.expiresAt,
    status: row.status,
    settledAt: row.settledAt,
  };
}

/** The parsed order as the store's own type. */
function toOrder(order: MockSession['orders'][number]): OrderPayload {
  return {
    ...order,
    lines: order.lines.map((line) => ({
      ...line,
      pieces: [...line.pieces],
      stitching:
        line.stitching === null
          ? null
          : { ...line.stitching, measurements: [...line.stitching.measurements] },
    })),
  };
}
