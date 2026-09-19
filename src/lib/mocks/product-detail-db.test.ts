import { afterEach, describe, expect, it, vi } from 'vitest';

import { CATALOGUE } from './catalogue-db';
import { toProductDetail } from './product-detail-db';

/**
 * §28.2's "Estimated delivery" is the backend's estimate, so the stand-in for it
 * has to state a plausible one (DATA-13). It used to count from a fixed date, and
 * once that date had passed every product page promised a delivery in the past.
 */

afterEach(() => {
  vi.useRealTimers();
});

function deliveryDatesOn(today: string): string[] {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${today}T09:00:00.000Z`));
  return CATALOGUE.map((record) => toProductDetail(record, 'en').estimatedDeliveryDate);
}

describe('the estimated delivery a product page is given', () => {
  it.each(['2026-09-19', '2027-03-01'])('falls after today, and within a week, on %s', (today) => {
    const dates = deliveryDatesOn(today);
    const weekOut = new Date(Date.parse(`${today}T00:00:00.000Z`) + 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    expect(dates.filter((date) => date <= today)).toEqual([]);
    expect(dates.filter((date) => date > weekOut)).toEqual([]);
  });

  it('varies by product, so no one lead time is assumed', () => {
    expect(new Set(deliveryDatesOn('2026-09-19')).size).toBeGreaterThan(1);
  });
});
