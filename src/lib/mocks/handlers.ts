import { accountHandlers } from './account-handlers';
import { authHandlers } from './auth-handlers';
import { backInStockHandlers } from './back-in-stock-handlers';
import { bagHandlers } from './bag-handlers';
import { catalogueHandlers } from './catalogue-handlers';
import { checkoutHandlers } from './checkout-handlers';
import { contentHandlers } from './content-handlers';
import { madeToMeasureHandlers } from './made-to-measure-handlers';

/**
 * D1 / TEST-04 — network is mocked at the HTTP layer, never by stubbing the
 * project's own API client. Requests therefore travel through `apiRequest`
 * unchanged, exercising the real client, its timeout, its error normalisation
 * and its schema validation.
 *
 * Paths are prefixed with `*` so a handler matches whatever origin
 * `JAVA_API_BASE_URL` currently points at, without duplicating that value here.
 *
 * One handler module per architecture module (MOD-03), composed here and
 * nowhere else. No two modules' paths overlap, so the order below is reading
 * order rather than precedence.
 */
export const handlers = [
  // §21 Content, §22 Localisation, the newsletter.
  ...contentHandlers,

  // §12 Catalogue, §15 Search, §8.2's availability overlays, §25 Fabric Calculator.
  ...catalogueHandlers,

  // §28.2's Notify Me — the request §28.7's back-in-stock email answers.
  ...backInStockHandlers,

  // §34 module 18.
  ...madeToMeasureHandlers,

  // §28.3's account.
  ...accountHandlers,

  // §16 CartService.
  ...bagHandlers,

  // §17 CheckoutService and §28.3's order read.
  ...checkoutHandlers,

  // §11 Identity.
  ...authHandlers,
];
