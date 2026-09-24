import { describe, expect, it } from 'vitest';

import {
  BUDGET_WINDOW_MS,
  INSTANCE_GENERATIONS_PER_WINDOW,
  VISITOR_GENERATIONS_PER_WINDOW,
  isExhausted,
  withinWindow,
} from './try-on-budget';

/**
 * §24 — the arithmetic that stands between a held button and an invoice.
 *
 * `now` is a parameter rather than a clock, which is the whole reason these can
 * be tested at all: the window is an hour and nothing here waits for one.
 */
const NOW = 1_700_000_000_000;

describe('the window', () => {
  it('keeps what is inside it and drops what has aged out', () => {
    const stamps = [
      NOW - BUDGET_WINDOW_MS - 1, // just outside
      NOW - BUDGET_WINDOW_MS + 1, // just inside
      NOW,
    ];

    expect(withinWindow(stamps, NOW)).toEqual([NOW - BUDGET_WINDOW_MS + 1, NOW]);
  });

  it('forgives everything once the window has passed', () => {
    const spent = Array.from({ length: 50 }, () => NOW);

    expect(withinWindow(spent, NOW + BUDGET_WINDOW_MS + 1)).toEqual([]);
  });
});

describe('exhaustion', () => {
  it('allows up to the limit and refuses the one after it', () => {
    const spent = Array.from({ length: VISITOR_GENERATIONS_PER_WINDOW - 1 }, () => NOW);

    expect(isExhausted(spent, VISITOR_GENERATIONS_PER_WINDOW, NOW)).toBe(false);
    expect(isExhausted([...spent, NOW], VISITOR_GENERATIONS_PER_WINDOW, NOW)).toBe(true);
  });

  it('counts only what is still inside the window', () => {
    const old = Array.from({ length: 100 }, () => NOW - BUDGET_WINDOW_MS - 1);

    expect(isExhausted(old, VISITOR_GENERATIONS_PER_WINDOW, NOW)).toBe(false);
  });
});

describe('the two ceilings', () => {
  /*
   * A visitor ceiling at or above the instance ceiling would mean one caller
   * could spend the whole process's budget, which is the case the instance
   * ceiling exists to prevent.
   */
  it('lets one visitor spend only a fraction of what the instance may', () => {
    expect(VISITOR_GENERATIONS_PER_WINDOW).toBeLessThan(INSTANCE_GENERATIONS_PER_WINDOW);
  });

  it('leaves room for an ordinary customer to be particular', () => {
    expect(VISITOR_GENERATIONS_PER_WINDOW).toBeGreaterThanOrEqual(5);
  });
});
