import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { tryOnNotice } from './try-on-notice';

const IMAGE = { dataUrl: 'data:image/jpeg;base64,AAAA', widthPx: 4, heightPx: 5 };

describe('tryOnNotice', () => {
  const none = { rejection: null, failure: null, result: undefined };

  it('says nothing while nothing has gone wrong', () => {
    expect(tryOnNotice(none, null, 'en', en)).toBeNull();
    expect(
      tryOnNotice({ ...none, result: { status: 'READY', image: IMAGE } }, null, 'en', en),
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
