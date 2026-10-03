import { NextRequest, type NextFetchEvent } from 'next/server';
import { describe, expect, it } from 'vitest';

import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import { DEFAULT_LOCALE, DIRECTION, LOCALE_COOKIE, localeSwitchPlace, localeToRemember } from '@/i18n/locales';
import { ur } from '@/i18n/messages/ur';
import { localeAlternates } from '@/lib/utils/locale-alternates';
import { proxy } from '../../proxy';

/** M-03: the proxy takes Next's fetch event (it reports page views through `waitUntil`). */
const EVENT = { waitUntil: () => undefined } as unknown as NextFetchEvent;

/**
 * F-10 Acceptance Tests:
 * 1. With the flag off:
 *    - `/?locale=ur` sets no locale cookie in proxy
 *    - no page's metadata contains an `ur` alternate
 *    - canonical address remains English
 *    - language switch is drawn nowhere
 * 2. With the flag mocked on:
 *    - existing behaviour is unchanged
 *    - unit test drives the same code path as the Urdu journey
 */
describe('F-10: Urdu switch behavior', () => {
  describe('when languageSwitcher flag is OFF (production launch state)', () => {
    it('CLIENT.features.languageSwitcher is false for launch', () => {
      expect(CLIENT.features.languageSwitcher).toBe(false);
    });

    it('proxy sets no locale cookie on /?locale=ur', () => {
      const request = new NextRequest('https://store.alasad.com/?locale=ur');
      const response = proxy(request, EVENT);

      // Must NOT set a locale cookie
      expect(response.cookies.get(LOCALE_COOKIE)).toBeUndefined();
    });

    it('proxy sets no locale cookie on first visit to /', () => {
      const request = new NextRequest('https://store.alasad.com/');
      const response = proxy(request, EVENT);

      expect(response.cookies.get(LOCALE_COOKIE)).toBeUndefined();
    });

    it('localeToRemember returns null for all inputs when switch is off', () => {
      expect(localeToRemember('ur', undefined)).toBeNull();
      expect(localeToRemember('ur', 'en')).toBeNull();
      expect(localeToRemember('ur', 'ur')).toBeNull();
      expect(localeToRemember(null, 'ur')).toBeNull();
      expect(localeToRemember(null, undefined)).toBeNull();
    });

    it('localeAlternates publishes only default language and x-default, with no ur alternate', () => {
      const alternates = localeAlternates(ROUTES.home, DEFAULT_LOCALE);

      expect(alternates.canonical).toBe(ROUTES.home);
      expect(alternates.languages[DEFAULT_LOCALE]).toBe(ROUTES.home);
      expect(alternates.languages['x-default']).toBe(ROUTES.home);
      expect(alternates.languages['ur']).toBeUndefined();
    });

    it('localeAlternates produces canonical English address even if ur is passed', () => {
      const alternates = localeAlternates(ROUTES.catalogue.detail('test-suit'), 'ur');

      expect(alternates.canonical).toBe(ROUTES.catalogue.detail('test-suit'));
      expect(alternates.languages['ur']).toBeUndefined();
    });

    it('localeSwitchPlace returns null (drawn nowhere, neither header nor footer)', () => {
      expect(localeSwitchPlace('en')).toBeNull();
      expect(localeSwitchPlace('ur')).toBeNull();
    });

    it('default locale direction is ltr', () => {
      expect(DIRECTION[DEFAULT_LOCALE]).toBe('ltr');
    });
  });

  describe('when languageSwitcher is mocked ON', () => {
    it('localeToRemember remembers valid requested language', () => {
      expect(localeToRemember('ur', 'en', true)).toBe('ur');
      expect(localeToRemember('ur', undefined, true)).toBe('ur');
      expect(localeToRemember('ur', 'ur', true)).toBeNull();
    });

    it('localeSwitchPlace returns HEADER when enabled', () => {
      expect(localeSwitchPlace('en', true)).toBe('HEADER');
      expect(localeSwitchPlace('ur', true)).toBe('HEADER');
    });

    it('localeAlternates includes ur and points canonical to ?locale=ur', () => {
      const alternates = localeAlternates(ROUTES.home, 'ur', true);

      expect(alternates.canonical).toBe(`${ROUTES.home}?locale=ur`);
      expect(alternates.languages['en']).toBe(ROUTES.home);
      expect(alternates.languages['ur']).toBe(`${ROUTES.home}?locale=ur`);
      expect(alternates.languages['x-default']).toBe(ROUTES.home);
    });

    it('Urdu direction is rtl', () => {
      expect(DIRECTION['ur']).toBe('rtl');
    });

    it('drives the Urdu E2E journey keys ensuring all translation targets exist', () => {
      // Keys exercised by tests/e2e/urdu.spec.ts:
      expect(ur.search.inputLabel).toBeDefined();
      expect(ur.search.inputLabel.length).toBeGreaterThan(0);

      expect(ur.nav.stitchedCta).toBeDefined();
      expect(ur.footer.helpHeading).toBeDefined();

      expect(ur.nav.catalogue).toBeDefined();
      expect(ur.catalogue.title).toBeDefined();
      expect(ur.catalogue.filtersHeading).toBeDefined();

      expect(ur.common.breadcrumbLabel).toBeDefined();
      expect(ur.product.addToBag).toBeDefined();
      expect(ur.product.copyLink).toBeDefined();
    });
  });
});
