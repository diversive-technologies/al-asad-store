import { describe, expect, it } from 'vitest';

import type { MeasurementSet } from '../schemas/measurement-set.schema';
import { readingOf } from './garments';
import { servedSet } from './test-support';

/*
 * What a card's figures record as, the rules a card is held to and what a card
 * save keeps are the server's (§34.4, A2-10), and are tested there. What stays
 * here is the studio's own reading of a card's conventions.
 */
const CARD = servedSet('KAMEEZ_SHALWAR', 'TAILOR_CARD');

const pointIn = (set: MeasurementSet, id: string) => {
  const point = set.points.find((candidate) => candidate.id === id);
  if (point === undefined) throw new Error(`no point ${id}`);
  return point;
};

describe("the tailor's card path (plan Phase 4)", () => {
  it("reads a card's teera as half the shoulder", () => {
    expect(readingOf(pointIn(CARD, 'kameezCardTeera'))).toBe('HALF_WIDTH');
  });
});
