import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { accountOrderSchema, type AccountOrder } from '../schemas/account-orders.schema';
import { AccountOrderList } from './AccountOrderList';

describe('AccountOrderList', () => {
  const activeOrder: AccountOrder = accountOrderSchema.parse({
    orderNumber: 'AA100001',
    placedAt: '2026-09-17T10:00:00.000Z',
    totalMinor: 725_000,
    lineCount: 1,
    firstItem: 'Plain Waistcoat Suit',
    state: 'CONFIRMED',
  });

  const cancelledOrder: AccountOrder = accountOrderSchema.parse({
    orderNumber: 'AA100002',
    placedAt: '2026-09-18T11:00:00.000Z',
    totalMinor: 1_400_000,
    lineCount: 2,
    firstItem: 'Embroidered Kurta',
    state: 'CANCELLED',
  });

  it('marks a cancelled order with the word Cancelled', () => {
    const markup = renderToStaticMarkup(
      <AccountOrderList orders={[activeOrder, cancelledOrder]} locale="en" messages={en} />,
    );

    expect(markup).toContain('AA100001');
    expect(markup).toContain('AA100002');
    // Cancelled badge is rendered on the cancelled order
    expect(markup).toContain('Cancelled');
  });

  it('does not show Cancelled for active orders', () => {
    const markup = renderToStaticMarkup(
      <AccountOrderList orders={[activeOrder]} locale="en" messages={en} />,
    );

    expect(markup).toContain('AA100001');
    expect(markup).not.toContain('Cancelled');
  });
});
