import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  LOCALES,
  localeSwitchPlace,
  localeToRemember,
  type Locale,
} from './locales';

/**
 * TEST-08 — BUG-11: every page advertised `?locale=ur` as its Urdu alternate, and
 * nothing read the parameter, so the "Urdu" page a search engine indexed was the
 * English one.
 */
describe('the locale a request leaves with', () => {
  describe('when language switcher is on', () => {
    it.each<[string, string | null, unknown, string | null]>([
      ['a valid query chooses the language', 'ur', 'en', 'ur'],
      ['a valid query on a first visit chooses it too', 'ur', undefined, 'ur'],
      ['a query naming the language already chosen writes nothing', 'ur', 'ur', null],
      ['a query that is not a locale is ignored', 'fr', 'ur', null],
      ['a query that is not a locale does not keep a tampered cookie', 'xx', 'zz', DEFAULT_LOCALE],
      ['no query keeps a valid cookie', null, 'ur', null],
      ['no query and no cookie takes the default', null, undefined, DEFAULT_LOCALE],
    ])('%s', (_label, query, cookie, expected) => {
      expect(localeToRemember(query, cookie, true)).toBe(expected);
    });
  });

  describe('when language switcher is off (F-10)', () => {
    it.each<[string, string | null, unknown]>([
      ['a query choosing another language sets nothing', 'ur', 'en'],
      ['a query on a first visit sets nothing', 'ur', undefined],
      ['no query sets nothing', null, undefined],
      ['a query that is not a locale sets nothing', 'xx', 'zz'],
      ['an existing ur cookie sets nothing', null, 'ur'],
    ])('%s', (_label, query, cookie) => {
      expect(localeToRemember(query, cookie, false)).toBeNull();
      // Also verify default parameter reading CLIENT.features.languageSwitcher (false in launch)
      expect(localeToRemember(query, cookie)).toBeNull();
    });
  });
});

/**
 * F-10: with the switch turned off, Urdu is disabled and the switch is drawn
 * nowhere (not even the footer). When on, it sits in the header.
 */
describe('the language switch', () => {
  const other: Locale = LOCALES.find((locale) => locale !== DEFAULT_LOCALE) ?? DEFAULT_LOCALE;

  it('sits in the header when the deployment offers it', () => {
    expect(localeSwitchPlace(DEFAULT_LOCALE, true)).toBe('HEADER');
    expect(localeSwitchPlace(other, true)).toBe('HEADER');
  });

  it('is offered nowhere when the deployment does not offer it (F-10)', () => {
    expect(localeSwitchPlace(DEFAULT_LOCALE, false)).toBeNull();
    expect(localeSwitchPlace(other, false)).toBeNull();
    // Also verify default parameter reading CLIENT.features.languageSwitcher
    expect(localeSwitchPlace(DEFAULT_LOCALE)).toBeNull();
    expect(localeSwitchPlace(other)).toBeNull();
  });
});
