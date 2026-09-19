import { describe, expect, it } from 'vitest';

import { measurementSetSchema } from './measurement-set.schema';

function point(id: string, pieceId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    pieceId,
    kind: 'LENGTH',
    enteredAs: 'FULL',
    basis: 'GARMENT',
    termKey: null,
    required: true,
    minMm: 100,
    maxMm: 200,
    geometry: null,
    askedWhen: null,
    ...overrides,
  };
}

const PIECE_A = { id: 'A', drawingId: 'KAMEEZ' };
const PIECE_B = { id: 'B', drawingId: 'SHALWAR' };
const TWO_PIECES = { pieces: [PIECE_A, PIECE_B] };

function list(points: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    garmentStyle: 'TEST_STYLE',
    source: 'GARMENT_COPY',
    sources: ['GARMENT_COPY'],
    version: 1,
    pieces: [PIECE_A],
    points,
    options: [],
    ...overrides,
  };
}

const accepts = (input: unknown): boolean => measurementSetSchema.safeParse(input).success;

const RING = { shape: 'RING', cx: 50, cy: 50, rx: 10, ry: 5 };
const SPAN = { shape: 'SPAN', x1: 10, y1: 10, x2: 60, y2: 10 };

describe('the measurement list contract (A2-3)', () => {
  it('accepts a well-formed list', () => {
    expect(
      accepts(list([point('a1', 'A'), point('b1', 'B', { geometry: SPAN })], TWO_PIECES)),
    ).toBe(true);
  });

  it('refuses a point or a piece declared twice', () => {
    expect(accepts(list([point('a1', 'A'), point('a1', 'A')]))).toBe(false);
    expect(accepts(list([point('a1', 'A')], { pieces: [PIECE_A, PIECE_A] }))).toBe(false);
  });

  it('refuses a piece that resumes after another has begun', () => {
    // The tabs, the fieldsets and the stepper would disagree about the order.
    expect(accepts(list([point('a1', 'A'), point('b1', 'B'), point('a2', 'A')], TWO_PIECES))).toBe(
      false,
    );
  });

  it('refuses a point on a piece the list does not declare', () => {
    expect(accepts(list([point('a1', 'A'), point('c1', 'C')]))).toBe(false);
  });

  it('refuses a garment declared with nothing to measure on it', () => {
    // It would draw a tab, an unmarked drawing and an empty fieldset.
    expect(accepts(list([point('a1', 'A')], TWO_PIECES))).toBe(false);
  });

  it('refuses a range whose minimum is not below its maximum', () => {
    expect(accepts(list([point('a1', 'A', { minMm: 200, maxMm: 200 })]))).toBe(false);
  });

  it('refuses a half on a length, and takes one on a girth or a width — a card’s teera', () => {
    expect(accepts(list([point('a1', 'A', { enteredAs: 'HALF' })]))).toBe(false);
    expect(accepts(list([point('a1', 'A', { kind: 'GIRTH', enteredAs: 'HALF' })]))).toBe(true);
    expect(accepts(list([point('a1', 'A', { kind: 'WIDTH', enteredAs: 'HALF' })]))).toBe(true);
  });

  it('refuses a list for a path it does not offer, and a path offered twice', () => {
    expect(accepts(list([point('a1', 'A')], { source: 'TAILOR_CARD' }))).toBe(false);
    expect(accepts(list([point('a1', 'A')], { sources: ['GARMENT_COPY', 'GARMENT_COPY'] }))).toBe(
      false,
    );
    expect(accepts(list([point('a1', 'A')], { source: 'BODY' }))).toBe(false);
  });

  it('refuses a length drawn as a ring, and a girth drawn as a span', () => {
    expect(accepts(list([point('a1', 'A', { geometry: RING })]))).toBe(false);
    expect(accepts(list([point('a1', 'A', { kind: 'GIRTH', geometry: SPAN })]))).toBe(false);
    expect(accepts(list([point('a1', 'A', { kind: 'GIRTH', geometry: RING })]))).toBe(true);
  });

  it('refuses a drawing the storefront does not have', () => {
    expect(accepts(list([point('a1', 'A')], { pieces: [{ id: 'A', drawingId: 'DUPATTA' }] }))).toBe(
      false,
    );
  });

  it('refuses an id that is not a plain code, since it becomes an address and a field name', () => {
    expect(accepts(list([point('kameez chest', 'A')]))).toBe(false);
    expect(accepts(list([point('a1', 'A')], { garmentStyle: '../admin' }))).toBe(false);
  });

  it('refuses a list with nothing to measure', () => {
    expect(accepts(list([]))).toBe(false);
  });
});

describe('the finishing choices (A2-7)', () => {
  const CUFF = { id: 'CUFF', drawingVariant: null };
  const PLAIN = { id: 'PLAIN', drawingVariant: 'SLEEVE_PLAIN' };
  const SLEEVE = {
    id: 'sleeve',
    pieceId: 'A',
    defaultValue: 'CUFF',
    appliesWhen: null,
    values: [CUFF, PLAIN],
  };
  const CUFF_STYLE = {
    ...SLEEVE,
    id: 'cuffStyle',
    appliesWhen: { group: 'sleeve', values: ['CUFF'] },
  };
  const withChoices = (options: unknown[], points: unknown[] = [point('a1', 'A')]) =>
    accepts(list(points, { options }));

  it('accepts a choice, and a point asked only under it', () => {
    const cuff = point('a2', 'A', { askedWhen: { group: 'sleeve', values: ['CUFF'] } });
    expect(withChoices([SLEEVE], [point('a1', 'A'), cuff])).toBe(true);
  });

  it('refuses a condition naming a choice the list lacks, or a value its choice lacks', () => {
    const onCollar = point('a1', 'A', { askedWhen: { group: 'collar', values: ['CUFF'] } });
    const rolled = point('a1', 'A', { askedWhen: { group: 'sleeve', values: ['ROLLED'] } });
    expect(withChoices([SLEEVE], [onCollar])).toBe(false);
    expect(withChoices([SLEEVE], [rolled])).toBe(false);
  });

  it('refuses a choice that depends on one declared after it', () => {
    // Settling choices in order would meet one it has not settled yet.
    expect(withChoices([CUFF_STYLE, SLEEVE])).toBe(false);
    expect(withChoices([SLEEVE, CUFF_STYLE])).toBe(true);
  });

  it('refuses a default the choice lacks, a choice of one, and a choice declared twice', () => {
    expect(withChoices([{ ...SLEEVE, defaultValue: 'ROLLED' }])).toBe(false);
    expect(withChoices([{ ...SLEEVE, values: [CUFF] }])).toBe(false);
    expect(withChoices([{ ...SLEEVE, values: [CUFF, CUFF] }])).toBe(false);
    expect(withChoices([SLEEVE, SLEEVE])).toBe(false);
  });

  it('refuses a choice on a piece the list does not declare', () => {
    expect(withChoices([{ ...SLEEVE, pieceId: 'C' }])).toBe(false);
  });

  /* TEST-08 — accepted until now: with a plain sleeve such a list asks nothing on
     the garment, so the customer met an empty form and the workshop a garment
     with no figures. */
  it('refuses choices that can leave a garment with nothing to measure', () => {
    const onlyWithCuff = point('a1', 'A', { askedWhen: { group: 'sleeve', values: ['CUFF'] } });
    const onlyPlain = point('a2', 'A', { askedWhen: { group: 'sleeve', values: ['PLAIN'] } });

    expect(withChoices([SLEEVE], [onlyWithCuff])).toBe(false);
    expect(withChoices([SLEEVE], [onlyWithCuff, onlyPlain])).toBe(true);
  });

  it('names the garment the choices can empty', () => {
    const cuffOnB = point('b1', 'B', { askedWhen: { group: 'sleeve', values: ['CUFF'] } });
    const parsed = measurementSetSchema.safeParse(
      list([point('a1', 'A'), cuffOnB], { ...TWO_PIECES, options: [SLEEVE] }),
    );

    expect(parsed.error?.issues.map((issue) => issue.path)).toEqual([['pieces', 1]]);
  });
});
