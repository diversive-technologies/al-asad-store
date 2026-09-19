import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { sizeIdSchema, type SizeId } from '@/lib/domain/ids';

import { BackInStockSizes } from './BackInStockSizes';

/**
 * The sold-out sizes as buttons. What is pinned is what a screen reader and a
 * keyboard get: a full name that still contains the size shown, `aria-expanded`
 * only where a press opens something, and busy as `aria-busy` on a button that
 * stays enabled — a disabled one would drop the focus it holds.
 */

/** Parsed rather than cast, so the ids are branded the way a payload's are (TS-12). */
const SMALL = sizeIdSchema.parse('7d1f0a2c-9b4e-4c8a-8f21-000000000011');
const MEDIUM = sizeIdSchema.parse('7d1f0a2c-9b4e-4c8a-8f21-000000000012');
const SIZES = [
  { id: SMALL, label: 'S' },
  { id: MEDIUM, label: 'M' },
];

function markupOf(opensForm: boolean, expandedId: SizeId | null, pendingId: SizeId | null) {
  return renderToStaticMarkup(
    <BackInStockSizes
      sizes={SIZES}
      labelledBy="lead"
      opensForm={opensForm}
      expandedId={expandedId}
      pendingId={pendingId}
      onPress={() => undefined}
      words={en.backInStock}
    />,
  );
}

/** The opening tag of the button with this accessible name. */
function buttonNamed(markup: string, label: string): string {
  return markup.split('<button').find((tag) => tag.includes(`aria-label="${label}"`)) ?? '';
}

describe('BackInStockSizes', () => {
  it('names every chip in full, with the size it shows inside the name', () => {
    const markup = markupOf(false, null, null);

    expect(buttonNamed(markup, 'Email me when size S is back')).not.toBe('');
    expect(buttonNamed(markup, 'Email me when size M is back')).not.toBe('');
    expect(markup).toContain('role="group" aria-labelledby="lead"');
  });

  it('says which chip’s form is open when a press opens one', () => {
    const markup = markupOf(true, MEDIUM, null);

    expect(buttonNamed(markup, 'Email me when size M is back')).toContain('aria-expanded="true"');
    expect(buttonNamed(markup, 'Email me when size S is back')).toContain('aria-expanded="false"');
  });

  it('says nothing about expanding when a press sends at once', () => {
    expect(markupOf(false, null, null)).not.toContain('aria-expanded');
  });

  it('marks the chip in flight busy, and leaves it enabled so it keeps its focus', () => {
    const pending = buttonNamed(markupOf(false, null, SMALL), 'Email me when size S is back');

    expect(pending).toContain('aria-busy="true"');
    expect(pending).not.toContain('disabled=""');
  });
});
