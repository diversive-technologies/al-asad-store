/**
 * MOD-04 — pure. What a quick-add size tray does with an event while it is
 * open, decided apart from the listeners that observe it so it can be tested
 * without a document.
 *
 * Escape closes it and hands focus back to the toggle that opened it (A11Y-08),
 * because the tray's own controls are about to disappear and focus would
 * otherwise fall to the page. A press outside the card's action area — the
 * toggle column and the tray — closes it where it is, without moving focus: the
 * press is already taking the reader somewhere. A press inside is the tray being
 * used, and the toggle's own click is what closes it from there.
 *
 * It used to be closable only by that toggle or by buying a size. On a phone at
 * three columns the tray covers most of the photograph, so a customer who opened
 * it by mistake had no way out that was not a purchase.
 */
export type TrayEvent =
  | { readonly kind: 'KEY'; readonly key: string }
  | { readonly kind: 'POINTER'; readonly isInsideActions: boolean };

export type TrayDismissal = 'CLOSE_AND_RETURN_FOCUS' | 'CLOSE' | 'KEEP_OPEN';

export function trayDismissalFor(event: TrayEvent): TrayDismissal {
  if (event.kind === 'KEY') return event.key === 'Escape' ? 'CLOSE_AND_RETURN_FOCUS' : 'KEEP_OPEN';
  return event.isInsideActions ? 'KEEP_OPEN' : 'CLOSE';
}
