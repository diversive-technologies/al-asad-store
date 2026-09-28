import { describe, expect, it } from 'vitest';

import { ORDER, ORDER_NUMBER, TRANSFER_INSTRUCTIONS } from '../lib/test-fixtures';
import { placeOrderResultSchema } from './place-order.schema';

/**
 * The placed order's transfer instructions, held to the contract: what the
 * backend answers a placement with must be what `orderSchema` accepts, for the
 * method that carries instructions and for one that carries none.
 */

/** A placement paid by bank transfer, as the backend answers it: the order says where to pay. */
const PLACED_BY_TRANSFER = {
  kind: 'PLACED',
  order: {
    ...ORDER,
    state: 'AWAITING_PAYMENT',
    paymentState: 'AWAITING_TRANSFER',
    paymentLabel: 'Bank transfer',
    transferInstructions: TRANSFER_INSTRUCTIONS,
  },
} as const;

describe('transfer instructions on a placed order', () => {
  it('parses a bank transfer with its reference being the order number', () => {
    expect(placeOrderResultSchema.safeParse(PLACED_BY_TRANSFER)).toMatchObject({
      success: true,
      data: {
        kind: 'PLACED',
        order: { orderNumber: ORDER_NUMBER, transferInstructions: { reference: ORDER_NUMBER } },
      },
    });
  });

  it('parses a method with no instructions as null', () => {
    expect(placeOrderResultSchema.safeParse({ kind: 'PLACED', order: ORDER })).toMatchObject({
      success: true,
      data: { kind: 'PLACED', order: { transferInstructions: null } },
    });
  });

  it('refuses instructions that name no reference', () => {
    const broken = {
      ...PLACED_BY_TRANSFER,
      order: {
        ...PLACED_BY_TRANSFER.order,
        transferInstructions: { ...TRANSFER_INSTRUCTIONS, reference: '' },
      },
    };

    expect(placeOrderResultSchema.safeParse(broken).success).toBe(false);
  });
});
