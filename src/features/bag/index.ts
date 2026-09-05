/**
 * STRUCT-04 / STRUCT-06 — the bag's SERVER-side barrel.
 *
 * Everything here reaches `server-only` code: the Java callers and the cart
 * cookie. Client Components import from `./contract` instead — see the note
 * there for why the surface is split in two rather than one barrel.
 */
export {
  addItem,
  applyCode,
  createCart,
  fetchBagSummary,
  removeCode,
  removeItem,
  updateQuantity,
} from './api/bag-server';

export { clearCartId, ensureCartId, readCartId } from './api/cart-cookie';
