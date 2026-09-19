import { describe, expect, it } from 'vitest';

import { codeStatusFor } from './code-status';

/**
 * TEST-08 — F8: applying or lifting a code swapped the form for the applied code
 * and said nothing; only a refusal was announced (§30.3).
 */
const WORDS = { codeAppliedStatus: 'Code {code} on.', codeRemovedStatus: 'Code off.' };

describe('codeStatusFor', () => {
  it('names the code Pricing applied, as Pricing wrote it', () => {
    expect(codeStatusFor({ code: 'EID10', description: '10% off' }, WORDS)).toBe('Code EID10 on.');
  });

  it('says the code was lifted when the bag carries none', () => {
    expect(codeStatusFor(null, WORDS)).toBe('Code off.');
  });
});
