import { describe, expect, it } from 'vitest';

import { trayDismissalFor } from './tray-dismissal';

/*
 * The quick-add tray could be closed only by its own toggle or by buying a size.
 * On a phone at three columns it covers most of the photograph, so a tray opened
 * by mistake had no way out that was not a purchase.
 */
describe('trayDismissalFor', () => {
  it('closes on Escape and hands focus back to the toggle', () => {
    expect(trayDismissalFor({ kind: 'KEY', key: 'Escape' })).toBe('CLOSE_AND_RETURN_FOCUS');
  });

  it('ignores every other key, so a keyboard user can still move through the sizes', () => {
    expect(trayDismissalFor({ kind: 'KEY', key: 'Tab' })).toBe('KEEP_OPEN');
    expect(trayDismissalFor({ kind: 'KEY', key: 'Enter' })).toBe('KEEP_OPEN');
  });

  it('closes on a press outside the card actions, and stays open for one inside', () => {
    expect(trayDismissalFor({ kind: 'POINTER', isInsideActions: false })).toBe('CLOSE');
    expect(trayDismissalFor({ kind: 'POINTER', isInsideActions: true })).toBe('KEEP_OPEN');
  });
});
