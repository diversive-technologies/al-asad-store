import { describe, expect, it } from 'vitest';

import { classifyOrderResponse, type OrderReadOutcome } from './order-read';

/**
 * TEST-08 — the regression guard for the order-confirmation 404.
 *
 * Every placed order answered "this page could not be found" on the deployment
 * because the read could not reach the mock state and the page reported that as
 * absence. The assertion that would have failed then is the last one here: a
 * transport failure and a 502 MUST NOT classify the same way as a 404.
 */
describe('classifyOrderResponse', () => {
  // TEST-06: table-driven, no branching in the test body.
  it.each([
    { label: 'a rejected request', status: null, expected: 'FAILED' },
    { label: 'no such order', status: 404, expected: 'ABSENT' },
    { label: 'the store unreachable', status: 502, expected: 'FAILED' },
    { label: 'the store broken', status: 500, expected: 'FAILED' },
    { label: 'a gateway timeout', status: 504, expected: 'FAILED' },
    { label: 'forbidden', status: 403, expected: 'FAILED' },
    { label: 'a readable order', status: 200, expected: 'BODY' },
  ] satisfies { label: string; status: number | null; expected: OrderReadOutcome }[])(
    'reads $label as $expected',
    ({ status, expected }) => {
      expect(classifyOrderResponse(status)).toBe(expected);
    },
  );

  /*
   * The defect, stated directly. These three were indistinguishable before —
   * all of them produced `notFound()` — and a customer who had just paid was
   * told their order did not exist.
   */
  it('never reports a failed read as a missing order', () => {
    const failures = [null, 500, 502, 503, 504].map(classifyOrderResponse);

    expect(failures).not.toContain('ABSENT');
    expect(new Set(failures)).toEqual(new Set(['FAILED']));
  });

  it('still reports a genuine absence as absence', () => {
    expect(classifyOrderResponse(404)).toBe('ABSENT');
  });
});
