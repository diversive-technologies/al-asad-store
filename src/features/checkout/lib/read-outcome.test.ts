import { describe, expect, it } from 'vitest';

import { classifyReadResponse, type ReadOutcome } from './read-outcome';

/**
 * TEST-08 — the regression guard for the order-confirmation 404, and for the
 * checkout that called an unreachable store an empty bag.
 *
 * Every placed order answered "this page could not be found" on the deployment
 * because the read could not reach the mock state and the page reported that as
 * absence. The assertion that would have failed then is the last one here: a
 * transport failure and a 502 MUST NOT classify the same way as a 404.
 */
describe('classifyReadResponse', () => {
  // TEST-06: table-driven, no branching in the test body.
  it.each([
    { label: 'a rejected request', status: null, expected: 'FAILED' },
    { label: 'nothing there', status: 404, expected: 'ABSENT' },
    { label: 'the store unreachable', status: 502, expected: 'FAILED' },
    { label: 'the store broken', status: 500, expected: 'FAILED' },
    { label: 'a gateway timeout', status: 504, expected: 'FAILED' },
    { label: 'forbidden', status: 403, expected: 'FAILED' },
    { label: 'a readable body', status: 200, expected: 'BODY' },
  ] satisfies { label: string; status: number | null; expected: ReadOutcome }[])(
    'reads $label as $expected',
    ({ status, expected }) => {
      expect(classifyReadResponse(status)).toBe(expected);
    },
  );

  /*
   * The defect, stated directly. These were indistinguishable before — all of
   * them produced `notFound()` on the order page and "your bag is empty" at
   * checkout.
   */
  it('never reports a failed read as absence', () => {
    const failures = [null, 500, 502, 503, 504].map(classifyReadResponse);

    expect(failures).not.toContain('ABSENT');
    expect(new Set(failures)).toEqual(new Set(['FAILED']));
  });

  it('still reports a genuine absence as absence', () => {
    expect(classifyReadResponse(404)).toBe('ABSENT');
  });
});
