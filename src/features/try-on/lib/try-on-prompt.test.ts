import { describe, expect, it } from 'vitest';

import { TRY_ON_INSTRUCTION, tryOnPromptFor } from './try-on-prompt';

/**
 * §24 — the prompt is the module's behaviour, so its load-bearing requirements
 * are pinned rather than left to a reviewer to notice.
 *
 * These are not style assertions. Each one is a thing the feature would do
 * WRONG if the line went missing, and each was put in the prompt for a stated
 * reason: identity drift, flattery, colour infidelity, and implying a fit the
 * photograph cannot know.
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
});

describe('the instruction for one garment', () => {
  it('names the garment as well as showing it', () => {
    expect(tryOnPromptFor('Embroidered Kurta')).toContain('The garment is: Embroidered Kurta.');
  });

  it('keeps every standing requirement alongside the garment', () => {
    expect(tryOnPromptFor('Embroidered Kurta')).toContain(TRY_ON_INSTRUCTION);
  });

  it('says nothing about a garment it was given no name for', () => {
    expect(tryOnPromptFor('   ')).toBe(TRY_ON_INSTRUCTION);
    expect(tryOnPromptFor('')).toBe(TRY_ON_INSTRUCTION);
  });
});
