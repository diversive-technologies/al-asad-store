import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { tryOnResultSchema } from '../schemas/try-on.schema';
import { tryOnNotice } from './try-on-notice';

const IMAGE = { dataUrl: 'data:image/jpeg;base64,AAAA', widthPx: 4, heightPx: 5 };

/*
 * BUG-06: with no provider connected the module answers with the garment's own
 * catalogue photograph, and it used to arrive as READY — so the page headed a
 * photograph of the model "You in this piece". The contract has to be able to
 * say it is a sample, and keep saying it through the boundary.
 */
describe('a sample try-on result', () => {
  it('survives the contract as SAMPLE rather than becoming READY', () => {
    const parsed = tryOnResultSchema.parse({ status: 'SAMPLE', image: IMAGE });

    expect(parsed.status).toBe('SAMPLE');
  });

  it('is its own wording, distinct from a generated image of the customer', () => {
    expect(en.tryOn.sampleHeading).not.toBe(en.tryOn.resultHeading);
    expect(en.tryOn.sampleAlt).not.toBe(en.tryOn.resultAlt);
  });
});

describe('tryOnNotice', () => {
  const none = { rejection: null, failure: null, result: undefined };

  it('says nothing while nothing has gone wrong', () => {
    expect(tryOnNotice(none, null, 'en', en)).toBeNull();
    expect(
      tryOnNotice({ ...none, result: { status: 'SAMPLE', image: IMAGE } }, null, 'en', en),
    ).toBeNull();
  });

  it('puts a refused photo before anything the module said', () => {
    const notice = tryOnNotice(
      {
        rejection: 'EMPTY',
        failure: null,
        result: { status: 'UNAVAILABLE', reason: 'TIMEOUT' },
      },
      null,
      'en',
      en,
    );

    expect(notice).toBe(en.tryOn.photoEmpty);
  });

  it('does not tell a customer to try again when the feature is switched off', () => {
    const notice = tryOnNotice(
      { ...none, result: { status: 'UNAVAILABLE', reason: 'PROVIDER_DISABLED' } },
      null,
      'en',
      en,
    );

    expect(notice).toBe(en.tryOn.unavailableDisabled);
  });
});
