import 'server-only';

import type { Locale } from '@/i18n/locales';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import type { AddToBagRequest, AddToBagResult } from '../schemas/bag-write.schema';
import { addItem, isCartLive } from './bag-server';
import { clearCartId, ensureCartId } from './cart-cookie';

/**
 * §16 `addItem`, for whichever cart this browser holds — creating one if it has
 * none, and replacing one the backend no longer has.
 *
 * The cookie can name a cart the backend lost: swept for age, gone with a
 * restart, or issued by a different environment. Left alone, every add would
 * fail for good, and clearing cookies is not something a shopper knows to do.
 * So a NOT_FOUND takes a fresh cart and retries ONCE — bounded, because a second
 * NOT_FOUND is the backend's problem rather than the cookie's.
 *
 * Throwing the cookie away is the one step here that cannot be undone, so it is
 * taken only once the backend has CONFIRMED the cart is gone. A 404 is also what
 * a plain REST backend says about a product withdrawn a moment ago, and reading
 * that as a dead cart used to cost a customer the bag they already had. A cart
 * that is still live keeps its cookie and the add fails as itself.
 *
 * `measurementOwner` travels on the retry too: it used to be dropped there, so a
 * made-to-measure add from a browser whose cart had lapsed was refused for naming
 * measurements that belonged to nobody.
 */
export async function addForCustomer(
  request: AddToBagRequest,
  locale: Locale,
  measurementOwner?: string,
): Promise<Result<AddToBagResult, ApiError>> {
  const cartId = await ensureCartId();
  if (!cartId.ok) return cartId;

  const first = await addItem(cartId.value, request, locale, measurementOwner);
  if (first.ok || first.error.kind !== 'NOT_FOUND') return first;

  const live = await isCartLive(cartId.value);
  if (!live.ok) return live;
  if (live.value) return first;

  await clearCartId();
  const replacement = await ensureCartId();
  if (!replacement.ok) return replacement;

  return addItem(replacement.value, request, locale, measurementOwner);
}
