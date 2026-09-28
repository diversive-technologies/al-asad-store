import type { z } from 'zod';

import { orderNumberSchema } from '@/lib/domain/ids';

import type { orderSchema, transferInstructionsSchema } from '../schemas/checkout.schema';

/**
 * Test support — the smallest placed order the §17 contract admits, for the
 * checkout tests that answer a placement or an order read over HTTP, and for
 * the ones that hold the contract itself to an order. Imported by tests only;
 * nothing in checkout may import it.
 *
 * Written in the WIRE shape and left unparsed, so a schema test can bend one
 * field and see it refused, while a test answering with it gets back exactly
 * what the real client parses (SSOT-09). A field the contract gains is added
 * here once (PD-01). Every name, number and address is a placeholder (SEC-10).
 */

type OrderWire = z.input<typeof orderSchema>;
type TransferInstructionsWire = z.input<typeof transferInstructionsSchema>;

/** What the customer quotes on the phone: the backend's shape, and plainly not a real one. */
export const ORDER_NUMBER = orderNumberSchema.parse('AA100001');

/** One stock line, paid on delivery — so the order carries no transfer instructions. */
export const ORDER = {
  id: '00000000-0000-4000-8000-0000000000e1',
  orderNumber: ORDER_NUMBER,
  state: 'AWAITING_CONFIRMATION',
  paymentState: 'AWAITING_CONFIRMATION',
  placedAt: '2026-09-28T09:00:00.000Z',
  contactName: 'Test Customer',
  contactMobile: '03001234567',
  deliveryAddress: '12 Example Street, Block A',
  deliveryCity: 'Lahore',
  deliveryLabel: 'Standard delivery',
  paymentLabel: 'Cash on delivery',
  isGift: false,
  giftMessage: '',
  lines: [
    {
      productId: '00000000-0000-4000-8000-0000000000f1',
      productCode: 'FX-0001',
      productName: 'Fixture waistcoat',
      quantity: 1,
      unitPriceMinor: 529_900,
      lineTotalMinor: 529_900,
      pieces: [{ pieceCode: `${ORDER_NUMBER}-P1`, name: 'Waistcoat', size: 'L' }],
      stitching: null,
    },
  ],
  totals: {
    subtotalMinor: 529_900,
    discountMinor: 0,
    deliveryMinor: 25_000,
    giftMinor: 0,
    totalMinor: 554_900,
  },
  transferInstructions: null,
} satisfies OrderWire;

/** Where to pay an order by bank transfer, with the order's number as the reference. */
export const TRANSFER_INSTRUCTIONS = {
  reference: ORDER_NUMBER,
  bankName: 'Example Bank',
  accountTitle: 'Example Store',
  accountNumber: '0000000000000000',
  iban: 'PK00EXMP0000000000000000',
} satisfies TransferInstructionsWire;
