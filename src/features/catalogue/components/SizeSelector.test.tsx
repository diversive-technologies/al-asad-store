import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { MessagesProvider } from '@/i18n/use-messages';
import type { SizeId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import { sizeOptionSchema } from '../schemas/product-detail.schema';
import { SizeSelector, type SizeChoice } from './SizeSelector';

/** Parsed rather than cast, so the ids are branded the way a payload's are (TS-12). */
const SIZES = sizeOptionSchema.array().parse([
  { id: '00000000-0000-4000-8000-000000000001', label: 'S' },
  { id: '00000000-0000-4000-8000-000000000002', label: 'M' },
]);

const NONE: SizeChoice = { selected: null, saved: null };

/* Each size reads its words from the provider the root layout mounts. */
function render(legendAction?: ReactNode, choice: SizeChoice = NONE): string {
  return renderToStaticMarkup(
    <MessagesProvider value={en}>
      <SizeSelector
        legend="Size"
        groupId="piece-1"
        sizes={SIZES}
        choice={choice}
        onSelect={() => undefined}
        statusOf={() => 'IN_STOCK'}
        {...(legendAction === undefined ? {} : { legendAction })}
      />
    </MessagesProvider>,
  );
}

function savedAs(sizeId: SizeId | undefined): SizeChoice {
  return { selected: null, saved: sizeId ?? null };
}

/**
 * §28.2 — the size guide sits on the legend's line. The line is built by floating
 * the legend rather than wrapping it, because only a fieldset's OWN legend child
 * names the radio group; a flex wrapper around it would silently unname the group.
 */
describe('a size selector', () => {
  it('keeps its legend as the fieldset’s first child when a control shares its line', () => {
    const markup = render(<button type="button">Size guide</button>);

    expect(markup).toMatch(/^<fieldset><legend [^>]*>Size<\/legend>/);
    expect(markup).toContain('<button type="button">Size guide</button>');
  });

  it('draws the legend alone when nothing shares its line', () => {
    expect(render()).not.toContain('<button');
  });
});

/**
 * §28.3 — the customer's saved size is MARKED, in words, whether or not it is the
 * one chosen, and the radio itself says so to a screen reader.
 */
describe('the saved size on a size selector', () => {
  it('marks the saved size, and only that one', () => {
    const markup = render(undefined, savedAs(SIZES[1]?.id));

    expect(markup.split(en.savedSizes.mark)).toHaveLength(2);
    expect(markup).toContain(
      `<span class="sr-only">${formatTemplate(en.savedSizes.sizeSavedName, { size: 'M' })}</span>`,
    );
    expect(markup).not.toContain(formatTemplate(en.savedSizes.sizeSavedName, { size: 'S' }));
  });

  it('marks it even when another size is chosen', () => {
    const markup = render(undefined, {
      selected: SIZES[0]?.id ?? null,
      saved: SIZES[1]?.id ?? null,
    });

    expect(markup).toContain(en.savedSizes.mark);
  });

  it('marks nothing when there is no saved size among its sizes', () => {
    expect(render()).not.toContain(en.savedSizes.mark);
  });
});
