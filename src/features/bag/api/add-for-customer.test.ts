import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { resetCarts } from '@/lib/mocks/bag-db';
import { resetReservations } from '@/lib/mocks/bag-reservations';
import { CATALOGUE } from '@/lib/mocks/catalogue-db';
import { handlers } from '@/lib/mocks/handlers';
import { onHandFor } from '@/lib/mocks/inventory-db';
import { pathPattern } from '@/lib/mocks/path-pattern';
import { toProductDetail } from '@/lib/mocks/product-detail-db';

import { addToBagRequestSchema, type AddToBagRequest } from '../schemas/bag-write.schema';
import { addForCustomer } from './add-for-customer';
import { fetchBagSummary } from './bag-server';
import { readCartId } from './cart-cookie';

/**
 * The bag's add, end to end below the Route Handler: the real API client, the
 * real mock handlers at the HTTP layer (TEST-04) and the real cart cookie logic,
 * with only the framework's cookie store replaced by a jar.
 *
 * What it pins is the one irreversible step in the add path — throwing the cart
 * cookie away. An add the cart merely REFUSED used to come back as NOT_FOUND and
 * cost the customer the bag they already had.
 */

const jar = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  const values = new Map<string, string>();
  return {
    values,
    store: {
      get: (name: string) => (values.has(name) ? { name, value: values.get(name) } : undefined),
      set: (name: string, value: string) => values.set(name, value),
      delete: (name: string) => values.delete(name),
    },
  };
});

vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(jar.store) }));

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

beforeEach(() => {
  jar.values.clear();
  resetCarts();
  resetReservations();
});

/** A stock add the fixture can satisfy. */
function stockAdd(): AddToBagRequest {
  for (const record of CATALOGUE) {
    const pieces = toProductDetail(record, 'en').pieces;
    const selections = pieces.flatMap((piece) => {
      const size = piece.sizes.find((entry) => onHandFor(piece.id, entry.id) > 1);
      return size === undefined ? [] : [{ pieceId: piece.id, sizeId: size.id }];
    });
    if (selections.length === pieces.length && selections.length > 0) {
      return addToBagRequestSchema.parse({ productId: record.id, selections, quantity: 1 });
    }
  }
  throw new Error('No product in the fixture has stock on every piece.');
}

async function linesInBag(): Promise<number> {
  const cartId = await readCartId();
  const summary = cartId === null ? null : await fetchBagSummary(cartId, 'en');
  return summary?.ok === true ? summary.value.lines.length : -1;
}

describe('addForCustomer', () => {
  it.each([
    [
      'a product the store does not sell',
      (add: AddToBagRequest) => ({
        ...add,
        productId: addToBagRequestSchema.shape.productId.parse(crypto.randomUUID()),
      }),
    ],
    [
      'a size cover missing a piece',
      (add: AddToBagRequest) => ({ ...add, selections: add.selections.slice(1) }),
    ],
  ])('keeps the cart cookie and the bag when the add is refused for %s', async (_l, bend) => {
    const add = stockAdd();
    await addForCustomer(add, 'en');
    const cookie = jar.values.get('aa_cart');

    const result = await addForCustomer(bend(add), 'en');

    expect(result.ok ? result.value.kind : result.error.kind).toBe('SELECTION_REFUSED');
    expect(jar.values.get('aa_cart')).toBe(cookie);
    expect(await linesInBag()).toBe(1);
  });

  it('replaces a cookie naming a cart the backend no longer has, and adds', async () => {
    const stale = crypto.randomUUID();
    jar.values.set('aa_cart', stale);

    const result = await addForCustomer(stockAdd(), 'en');

    expect(result.ok ? result.value.kind : result.error.kind).toBe('ADDED');
    expect(jar.values.get('aa_cart')).not.toBe(stale);
  });

  /* A plain REST 404 on the add — a product withdrawn a moment ago, say — for a
     cart that is still there. The cart is asked about first, and survives. */
  it('keeps a live cart when an add answers 404 for some other reason', async () => {
    await addForCustomer(stockAdd(), 'en');
    const cookie = jar.values.get('aa_cart');
    server.use(
      http.post(
        `*${pathPattern(ENDPOINTS.bag.items, 'cartId')}`,
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    const result = await addForCustomer(stockAdd(), 'en');

    expect(result.ok ? null : result.error.kind).toBe('NOT_FOUND');
    expect(jar.values.get('aa_cart')).toBe(cookie);
  });

  /* BUG-01 — a one-piece unstitched length has no size set (§6.1), so its add names
     no size; the backend resolves the piece's key (§7.1 step 1). It used to be refused. */
  it('adds a product with no size to choose through the real client and handlers', async () => {
    const record = CATALOGUE.find((entry) => entry.garmentType === 'unstitched' && entry.isInStock);
    if (record === undefined) throw new Error('The fixture has no unstitched length in stock.');
    const add = addToBagRequestSchema.parse({ productId: record.id, selections: [], quantity: 1 });

    const result = await addForCustomer(add, 'en');

    expect(result.ok ? result.value.kind : result.error.kind).toBe('ADDED');
    expect(await linesInBag()).toBe(1);
  });

  it('treats a cookie that is not a cart id as no cookie at all', async () => {
    jar.values.set('aa_cart', '../../account/orders');

    expect(await readCartId()).toBeNull();
  });
});
