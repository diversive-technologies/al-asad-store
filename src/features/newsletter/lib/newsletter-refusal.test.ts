import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import type { ApiError } from '@/lib/api/errors';

import { newsletterRefusal } from './newsletter-refusal';

/** F-09 — where a failed subscription is said, and that a limit is not an outage. */
describe('newsletterRefusal', () => {
  it.each<[string, ApiError, 'email' | 'root', string]>([
    [
      'a refused address',
      { kind: 'VALIDATION', message: 'bad', fieldErrors: {} },
      'email',
      en.newsletter.invalidEmail,
    ],
    [
      'Java’s limit per address',
      { kind: 'RATE_LIMITED', message: 'wait' },
      'root',
      'Please wait a few minutes and try again.',
    ],
    [
      'a store that could not be reached',
      { kind: 'NETWORK', message: 'down' },
      'root',
      en.errors.network,
    ],
    [
      'a store that failed on its own side',
      { kind: 'SERVER', message: 'down', status: 503 },
      'root',
      en.errors.network,
    ],
  ])('says %s on the right place', (_label, error, field, message) => {
    expect(newsletterRefusal(error, en)).toEqual({ field, message });
  });

  it('has the limit’s words in Urdu too', () => {
    expect(newsletterRefusal({ kind: 'RATE_LIMITED', message: 'wait' }, ur).message).toBe(
      ur.newsletter.rateLimited,
    );
  });
});
