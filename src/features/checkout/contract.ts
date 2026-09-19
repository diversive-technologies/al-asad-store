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
  type CheckoutFormInput,
  type CheckoutQuote,
  type DeliveryOption,
  type Order,
  type OrderLine,
  type OrderTotals,
  type PaymentMethod,
} from './schemas/checkout.schema';
export {
  placeOrderRequestSchema,
  placeOrderResultSchema,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from './schemas/place-order.schema';
export { orderLookupRequestSchema, type OrderLookupRequest } from './schemas/order-lookup.schema';

export { CheckoutScreen, type CheckoutScreenProps } from './components/CheckoutScreen';
export { CheckoutSkeleton, type CheckoutSkeletonProps } from './components/CheckoutSkeleton';
export { OrderConfirmation, type OrderConfirmationProps } from './components/OrderConfirmation';
export { OrderScreen, type OrderScreenProps } from './components/OrderScreen';
export { OrderSkeleton, type OrderSkeletonProps } from './components/OrderSkeleton';

/* The browser half of §28.3's read. `api/checkout-server.ts` is `server-only`. */
export { fetchOrderByNumber } from './api/checkout-browser';
