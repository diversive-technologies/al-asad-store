import { beforeEach, describe, expect, it } from 'vitest';

import {
  BUDGET_WINDOW_MS,
  INSTANCE_GENERATIONS_PER_WINDOW,
  VISITOR_GENERATIONS_PER_WINDOW,
} from '../lib/try-on-budget';
import { claimGeneration, resetTryOnBudget } from './try-on-budget-store';

/**
 * §24 — spending the budget, and the two ways it runs out.
 *
 * What these pin is the SPENDING, not the arithmetic: that a claim is recorded
 * even though nothing was generated, that one visitor cannot reach the
 * instance ceiling on their own, and that the window forgives.
 */
const NOW = 1_700_000_000_000;

beforeEach(() => {
  resetTryOnBudget();
});

describe('claiming a generation', () => {
  it('allows a visitor up to their share and refuses the next', () => {
    for (let spent = 0; spent < VISITOR_GENERATIONS_PER_WINDOW; spent += 1) {
      expect(claimGeneration('1.2.3.4', NOW)).toBe('ALLOWED');
    }

    expect(claimGeneration('1.2.3.4', NOW)).toBe('VISITOR_EXHAUSTED');
  });

  it('does not spend one visitor’s budget on another', () => {
    for (let spent = 0; spent < VISITOR_GENERATIONS_PER_WINDOW; spent += 1) {
      claimGeneration('1.2.3.4', NOW);
    }

    expect(claimGeneration('5.6.7.8', NOW)).toBe('ALLOWED');
  });

  it('forgives a visitor once the window has passed', () => {
    for (let spent = 0; spent < VISITOR_GENERATIONS_PER_WINDOW; spent += 1) {
      claimGeneration('1.2.3.4', NOW);
    }
    expect(claimGeneration('1.2.3.4', NOW)).toBe('VISITOR_EXHAUSTED');

    expect(claimGeneration('1.2.3.4', NOW + BUDGET_WINDOW_MS + 1)).toBe('ALLOWED');
  });

  /*
   * The defeat of a per-visitor limit is a caller who changes address. The
   * instance ceiling is what actually bounds the bill, so it has to hold when
   * every request looks like somebody new.
   */
  it('stops a caller who arrives as a different visitor every time', () => {
    let allowed = 0;
    for (let attempt = 0; attempt < INSTANCE_GENERATIONS_PER_WINDOW + 25; attempt += 1) {
      if (claimGeneration(`visitor-${String(attempt)}`, NOW) === 'ALLOWED') allowed += 1;
    }

    expect(allowed).toBe(INSTANCE_GENERATIONS_PER_WINDOW);
    expect(claimGeneration('someone-new', NOW)).toBe('INSTANCE_EXHAUSTED');
  });

  it('records a claim per attempt, so a failing request cannot be retried for free', () => {
    /*
     * The claim is taken BEFORE the generation runs. Whether the provider then
     * succeeded, refused or timed out is not knowable here and must not be:
     * every one of them cost a call.
     */
    claimGeneration('1.2.3.4', NOW);
    claimGeneration('1.2.3.4', NOW);

    let allowed = 0;
    while (claimGeneration('1.2.3.4', NOW) === 'ALLOWED') allowed += 1;

    expect(allowed).toBe(VISITOR_GENERATIONS_PER_WINDOW - 2);
  });
});
