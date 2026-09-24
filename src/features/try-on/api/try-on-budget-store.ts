import 'server-only';

import {
  BUDGET_WINDOW_MS,
  INSTANCE_GENERATIONS_PER_WINDOW,
  VISITOR_GENERATIONS_PER_WINDOW,
  isExhausted,
  withinWindow,
  type BudgetVerdict,
} from '../lib/try-on-budget';

/**
 * §24 — where the budget is counted.
 *
 * In memory, and the honest description of that is: **this is a brake, not a
 * gate.** The counters live in one process, so a serverless deployment running
 * four instances allows four times the instance ceiling, and a cold start
 * forgets everything. It stops the accident and the casual abuser — a held
 * button, a loop left running, a page left open on a script — which is what
 * actually produces a surprise invoice on a demonstration deployment.
 *
 * It does NOT stop a determined attacker. The control that would is a counter
 * in a store shared across instances; that is the same missing piece the mock
 * session cookie works around elsewhere, and it is named here rather than left
 * for an invoice to discover (PD-05).
 *
 * The claim is recorded BEFORE the generation runs, not after. A generation
 * that fails still cost a call to the provider, and a budget that only counted
 * successes would let a caller retry a failing request without limit.
 */

const VISITORS = new Map<string, number[]>();
let instanceStamps: number[] = [];

/**
 * Keeps the visitor table from growing without bound on a long-lived process.
 *
 * Swept on write rather than on a timer: there is no scheduler here, and a
 * table only grows when something is written to it anyway.
 */
function sweep(now: number): void {
  if (VISITORS.size < 1_000) return;

  for (const [key, stamps] of VISITORS) {
    const live = withinWindow(stamps, now);
    if (live.length === 0) VISITORS.delete(key);
    else VISITORS.set(key, live);
  }
}

/**
 * Spend one generation from the budget, or say why not.
 *
 * `visitorKey` is whatever the route can honestly identify a caller by — the
 * forwarded address on a deployment. It is a BUCKET, never an identity: it is
 * not logged, not stored beyond the window, and not tied to a customer.
 */
export function claimGeneration(visitorKey: string, now: number = Date.now()): BudgetVerdict {
  sweep(now);

  instanceStamps = withinWindow(instanceStamps, now);
  if (isExhausted(instanceStamps, INSTANCE_GENERATIONS_PER_WINDOW, now)) {
    return 'INSTANCE_EXHAUSTED';
  }

  const stamps = withinWindow(VISITORS.get(visitorKey) ?? [], now);
  if (isExhausted(stamps, VISITOR_GENERATIONS_PER_WINDOW, now)) return 'VISITOR_EXHAUSTED';

  VISITORS.set(visitorKey, [...stamps, now]);
  instanceStamps = [...instanceStamps, now];
  return 'ALLOWED';
}

/** Test seam, and what a cold instance starts from. */
export function resetTryOnBudget(): void {
  VISITORS.clear();
  instanceStamps = [];
}

/** How long a refused caller should wait, in whole seconds — the `Retry-After`. */
export function retryAfterSeconds(): number {
  return Math.ceil(BUDGET_WINDOW_MS / 1000);
}
