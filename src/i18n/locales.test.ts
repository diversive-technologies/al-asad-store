import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  LOCALES,
  localeSwitchPlace,
  localeToRemember,
  type Locale,
  type LocaleSwitchPlace,
} from './locales';

/**
 * TEST-08 — BUG-11: every page advertised `?locale=ur` as its Urdu alternate, and
 * nothing read the parameter, so the "Urdu" page a search engine indexed was the
 * English one.
 */
describe('the locale a request leaves with', () => {
  it.each<[string, string | null, unknown, string | null]>([
    ['a valid query chooses the language', 'ur', 'en', 'ur'],
    ['a valid query on a first visit chooses it too', 'ur', undefined, 'ur'],
    ['a query naming the language already chosen writes nothing', 'ur', 'ur', null],
    ['a query that is not a locale is ignored', 'fr', 'ur', null],
    ['a query that is not a locale does not keep a tampered cookie', 'xx', 'zz', DEFAULT_LOCALE],
    ['no query keeps a valid cookie', null, 'ur', null],
    ['no query and no cookie takes the default', null, undefined, DEFAULT_LOCALE],
  ])('%s', (_label, query, cookie, expected) => {
    expect(localeToRemember(query, cookie)).toBe(expected);
  });
});

/**
 * TEST-08 — with the switch turned off, a `?locale=ur` link (every page
 * publishes one as its Urdu alternate) put a visitor in Urdu for a year with
 * nothing on the page to bring them back to English.
 */
describe('the language switch', () => {
  // Whichever language is not the default — found, never named (D5).
  const other: Locale = LOCALES.find((locale) => locale !== DEFAULT_LOCALE) ?? DEFAULT_LOCALE;

  it.each<[string, Locale, boolean, LocaleSwitchPlace]>([
    ['sits in the header when the deployment offers it', DEFAULT_LOCALE, true, 'HEADER'],
    ['sits in the header in another language too', other, true, 'HEADER'],
    [
      'is offered nowhere to a default reader when the deployment does not',
      DEFAULT_LOCALE,
      false,
      null,
    ],
    [
      'still offers the way back to a visitor who arrived in another language',
      other,
      false,
      'FOOTER',
    ],
  ])('%s', (_label, current, isSwitchOffered, place) => {
    expect(localeSwitchPlace(current, isSwitchOffered)).toBe(place);
  });
});
