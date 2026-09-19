import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';

import { backInStockNotice, type BackInStockAnswerKind } from './back-in-stock-notice';

/**
 * §28.2's Notify Me, in words. What matters is that every answer says what
 * happened — an email LATER, never one already sent — and that nothing it says
 * could tell a guest whether an address belongs to an account.
 */

const PRODUCT = { productName: 'Plain Waistcoat Suit', pieceName: null, sizeLabel: 'M' };
const PIECE = { ...PRODUCT, pieceName: 'Shalwar' };

describe('what a Notify Me answer says', () => {
  it.each([
    ['RECORDED', PRODUCT, 'We will email you when Plain Waistcoat Suit is back in size M.'],
    [
      'RECORDED',
      PIECE,
      'We will email you when the Shalwar in Plain Waistcoat Suit is back in size M.',
    ],
    [
      'ALREADY_RECORDED',
      PRODUCT,
      'We already have a request to email you when Plain Waistcoat Suit is back in size M.',
    ],
    [
      'ALREADY_RECORDED',
      PIECE,
      'We already have a request to email you when the Shalwar in Plain Waistcoat Suit is back in size M.',
    ],
    [
      'IN_STOCK',
      PIECE,
      'Size M can be bought again. The sizes have been refreshed so you can choose it.',
    ],
  ] as const)('tells %s politely, naming what it was about', (kind, subject, text) => {
    expect(backInStockNotice(kind, subject, en.backInStock)).toEqual({ role: 'status', text });
  });

  it.each(['NOT_OFFERED', 'UNREACHABLE'] as const)(
    'raises %s as an alert, because the request did not go through',
    (kind) => {
      expect(backInStockNotice(kind, PRODUCT, en.backInStock)?.role).toBe('alert');
    },
  );

  it.each(['EMAIL_REQUIRED', 'INVALID'] as const)(
    'leaves %s to the address form, which says it where it applies',
    (kind) => {
      expect(backInStockNotice(kind, PRODUCT, en.backInStock)).toBeNull();
    },
  );

  const EVERY_KIND: readonly BackInStockAnswerKind[] = [
    'RECORDED',
    'ALREADY_RECORDED',
    'IN_STOCK',
    'NOT_OFFERED',
    'UNREACHABLE',
  ];

  it.each(EVERY_KIND.flatMap((kind) => [[kind, 'en', en] as const, [kind, 'ur', ur] as const]))(
    'leaves no placeholder unfilled for %s in %s',
    (kind, _locale, messages) => {
      expect(backInStockNotice(kind, PIECE, messages.backInStock)?.text).not.toMatch(/\{\w+\}/);
    },
  );

  it.each(EVERY_KIND)('never mentions an account in %s', (kind) => {
    expect(backInStockNotice(kind, PIECE, en.backInStock)?.text).not.toMatch(/account/i);
  });
});
