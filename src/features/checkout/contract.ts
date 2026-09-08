/**
 * STRUCT-06 — the CLIENT-SAFE half of this feature's surface, split from
 * `index.ts` for the same reason the bag's is: everything there imports
 * `server-only`, and a Client Component touching it would fail the build.
 */
export {
  checkoutFormSchema,
  checkoutQuoteSchema,
  deliveryOptionSchema,
  orderSchema,
  orderTotalsSchema,
  paymentMethodSchema,
  placeOrderRequestSchema,
  placeOrderResultSchema,
  type CheckoutFormInput,
  type CheckoutQuote,
  type DeliveryOption,
  type Order,
  type OrderLine,
  type OrderTotals,
  type PaymentMethod,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from './schemas/checkout.schema';

export { CheckoutScreen, type CheckoutScreenProps } from './components/CheckoutScreen';
export { OrderConfirmation, type OrderConfirmationProps } from './components/OrderConfirmation';
export { OrderScreen, type OrderScreenProps } from './components/OrderScreen';

/* The browser half of §28.3's read. `api/checkout-server.ts` is `server-only`. */
export { fetchOrderByNumber } from './api/checkout-browser';
