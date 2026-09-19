import { describe, expect, it } from 'vitest';

import { RETURN_TO_PARAM, ROUTES } from '@/config/routes';

import { returnPathFrom } from './return-path';

/**
 * TEST-08 — BUG-15: signing in always landed on the homepage, whatever page had
 * asked the customer to sign in. The way back is now carried in the address, and
 * the address is untrusted — so this pins both halves: it returns, and it cannot
 * be turned into an open redirect (SEC-06).
 */
describe('the page a sign-in returns to', () => {
  it.each([
    ['the saved items', ROUTES.wishlist],
    ['the address book', ROUTES.accountAddresses],
    ['a product', ROUTES.catalogue.detail('plain-suit-1')],
    ['a filtered listing, filters and all', '/catalogue?garmentType=stitched&page=2'],
    ['a section of the account', `${ROUTES.account}#orders`],
    ['an order', ROUTES.orderConfirmation('AA100001')],
    ['the homepage', ROUTES.home],
  ])('returns to %s', (_label, path) => {
    expect(returnPathFrom(path)).toBe(path);
  });

  it.each([
    ['another site, protocol-relative', '//evil.test/account'],
    ['another site, by a backslash browsers read as a slash', '/\\evil.test'],
    ['another site, absolute', 'https://evil.test/'],
    ['a script', 'javascript:alert(1)'],
    ['a relative path', 'account'],
    ['a header-splitting control character', '/account\r\nSet-Cookie:x=1'],
    ['a page the store does not have', '/nope'],
    ['the sign-in screen itself', ROUTES.signIn],
    ['a BFF route', ROUTES.api.bag],
    ['more than one value', ['/wishlist', '/account']],
    ['nothing', undefined],
    ['an address longer than any page has', `/catalogue?q=${'a'.repeat(600)}`],
    // F1 — each passes the raw checks and normalises to the path `//evil.test`.
    ['another site, behind a dot segment', '/.//evil.test'],
    ['another site, behind a climb out of a page', '/catalogue/..//evil.test'],
    ['another site, behind a dot segment, with a path', '/.//evil.test/account'],
    ['another site, behind percent-encoded dot segments', '/%2e/%2e//evil.test'],
    ['an encoded slash that names no page', '/./%2F/x'],
  ])('refuses %s', (_label, raw) => {
    expect(returnPathFrom(raw)).toBeNull();
  });

  it('normalises a path that climbs out of its segment', () => {
    expect(returnPathFrom('/account/../sign-in')).toBeNull();
    expect(returnPathFrom('/sign-in/../wishlist')).toBe(ROUTES.wishlist);
  });

  it('is what the auth screens are linked with', () => {
    const href = new URL(ROUTES.signInFrom(ROUTES.wishlist), 'https://store.test');

    expect(href.pathname).toBe(ROUTES.signIn);
    expect(returnPathFrom(href.searchParams.get(RETURN_TO_PARAM))).toBe(ROUTES.wishlist);
    expect(ROUTES.signUpFrom(null)).toBe(ROUTES.signUp);
  });
});
