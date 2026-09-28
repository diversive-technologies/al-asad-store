import { describe, expect, it } from 'vitest';

import { TRY_ON_INSTRUCTION, tryOnPromptFor, type TryOnGarment } from './try-on-prompt';

/**
 * §24 — the prompt is the module's behaviour, so its load-bearing requirements
 * are pinned rather than left to a reviewer to notice.
 *
 * These are not style assertions. Each one is a thing the feature would do
 * WRONG if the line went missing, and each was put in the prompt for a stated
 * reason: identity drift, flattery, colour infidelity, implying a fit the
 * photograph cannot know, and copying the store model instead of the customer.
 */
describe('the try-on instruction', () => {
  it('tells the model to keep the customer recognisably themselves', () => {
    expect(TRY_ON_INSTRUCTION).toMatch(/face, hair, skin tone, body shape and build/i);
    expect(TRY_ON_INSTRUCTION).toMatch(/recognisably themselves/i);
  });

  it('forbids reshaping the body, which is the harmful default', () => {
    expect(TRY_ON_INSTRUCTION).toMatch(/do not slim, reshape, lengthen/i);
  });

  it('asks for the garment colour and texture to be faithful, which is what this market buys on', () => {
    expect(TRY_ON_INSTRUCTION).toMatch(/colour, fabric texture, pattern/i);
    expect(TRY_ON_INSTRUCTION).toMatch(/keep its colour true to the second/i);
  });

  it('refuses to let the image imply a fit, because nothing here knows the size', () => {
    expect(TRY_ON_INSTRUCTION).toMatch(/never tailoring or sizing/i);
    expect(TRY_ON_INSTRUCTION).toMatch(/do not exaggerate a tight or a loose fit/i);
  });

  it('names which image is the person and which is the garment, in order', () => {
    const person = TRY_ON_INSTRUCTION.indexOf('FIRST image is a photograph of a customer');
    const garment = TRY_ON_INSTRUCTION.indexOf('SECOND image is a garment');

    expect(person).toBeGreaterThan(-1);
    expect(garment).toBeGreaterThan(person);
  });

  it('says the garment is worn by a store model whose person must not be copied', () => {
    expect(TRY_ON_INSTRUCTION).toMatch(/photographed on a store model/i);
    expect(TRY_ON_INSTRUCTION).toMatch(/take only the garment from the second image/i);
    expect(TRY_ON_INSTRUCTION).toMatch(
      /never copy their face, hair, body, pose, background or framing/i,
    );
  });

  it('edits the customer’s photograph rather than composing a new one', () => {
    expect(TRY_ON_INSTRUCTION).toMatch(/edit the first image/i);
    expect(TRY_ON_INSTRUCTION).toMatch(/do not zoom out, extend the frame/i);
    expect(TRY_ON_INSTRUCTION).not.toMatch(/plain, uncluttered background/i);
  });
});

const KURTA: TryOnGarment = {
  name: 'Embroidered Kurta',
  colourName: 'Olive',
  fabricName: 'Boski',
  type: 'SIMPLE',
  pieceCount: 1,
};

const SUIT: TryOnGarment = {
  name: 'Plain Waistcoat',
  colourName: 'Camel',
  fabricName: 'Wash-n-Wear',
  type: 'SET',
  pieceCount: 3,
};

describe('the instruction for one garment', () => {
  it('names the garment with its colour and fabric as well as showing it', () => {
    expect(tryOnPromptFor(KURTA)).toContain('The garment is: Olive Boski Embroidered Kurta.');
  });

  it.each([KURTA, SUIT])('keeps every standing requirement alongside $name', (garment) => {
    expect(tryOnPromptFor(garment)).toContain(TRY_ON_INSTRUCTION);
  });

  it.each([
    ['a SET', SUIT, /set of 3 pieces: dress the customer in every piece/i],
    [
      'a SIMPLE garment',
      KURTA,
      /single piece: it replaces .* outer layers included, so that all of it is visible/i,
    ],
  ])('says how much of the photograph %s replaces', (_case, garment, coverage) => {
    expect(tryOnPromptFor(garment)).toMatch(coverage);
  });
});
