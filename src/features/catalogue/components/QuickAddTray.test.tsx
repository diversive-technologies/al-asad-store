import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { accountKeyOf, SessionProvider } from '@/features/auth';
import { en } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { pieceIdSchema, productIdSchema, sizeIdSchema } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { QuickAdd } from '../hooks/use-quick-add';
import { quickAddOfferSchema } from '../schemas/quick-add.schema';
import { QuickAddTray } from './QuickAddTray';

/**
 * The card's size tray while an add is in flight (A11Y-08, FORM-06). A size is
 * disabled only when it is sold out: a disabled button drops the keyboard focus
 * it holds, so the pressed size stays enabled and says it is busy, and a second
 * press is refused by the hook's latch rather than by the button.
 */

const SMALL = sizeIdSchema.parse('00000000-0000-4000-8000-000000000001');
const MEDIUM = sizeIdSchema.parse('00000000-0000-4000-8000-000000000002');

const OFFER = quickAddOfferSchema.parse({
  kind: 'SIZED',
  productId: productIdSchema.parse('00000000-0000-4000-8000-0000000000f1'),
  pieceIds: [pieceIdSchema.parse('00000000-0000-4000-8000-0000000000a1')],
  sizes: [
    { id: SMALL, label: 'S', isAvailable: true },
    { id: MEDIUM, label: 'M', isAvailable: false },
  ],
});

const IDLE: QuickAdd = {
  isTrayOpen: true,
  toggleTray: () => undefined,
  closeTray: () => undefined,
  offer: OFFER,
  isOfferPending: false,
  isOfferUnavailable: false,
  isAdding: false,
  pendingSizeId: null,
  add: () => undefined,
  notice: null,
};

function tray(quickAdd: QuickAdd): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <QuickAddTray quickAdd={quickAdd} locale="en" messages={en} />
    </QueryClientProvider>,
  );
}

/** The attributes of the size button labelled `label`. */
function buttonFor(markup: string, label: string): string {
  const button = new RegExp(`<button([^>]*)>(?:(?!</button>).)*?<bdi>${label}</bdi>`, 's');
  return button.exec(markup)?.[1] ?? '';
}

describe('the quick-add tray while an add is in flight', () => {
  const adding = tray({ ...IDLE, isAdding: true, pendingSizeId: SMALL });

  it('keeps the pressed size enabled, and says it is busy', () => {
    expect(buttonFor(adding, 'S')).not.toContain('disabled');
    expect(buttonFor(adding, 'S')).toContain('aria-busy="true"');
  });

  it('disables only the size that is sold out', () => {
    expect(buttonFor(adding, 'M')).toContain('disabled');
    expect(buttonFor(adding, 'M')).toContain('aria-busy="false"');
  });

  it('draws the same buttons as when nothing is in flight, busy mark apart', () => {
    expect(adding.replace('aria-busy="true"', 'aria-busy="false"')).toBe(tray(IDLE));
  });
});

/**
 * TEST-08 — F16 (I18N-06): a saved size's name was the size's label with
 * " — your saved size" appended in the component, dash and all, so a translator
 * could not reorder it. It is one message now, and it still starts with the
 * label on the button, so the name matches what is seen.
 */
describe('the quick-add tray for a customer with a saved size', () => {
  const session = { displayName: 'Test Customer', email: 'customer@example.com', mobile: '' };
  const client = new QueryClient();
  client.setQueryData(queryKeys.account.savedSizes(accountKeyOf(session), 'en'), {
    sizes: [{ sizeSet: { id: 'set', name: 'Kameez' }, size: { id: SMALL, label: 'S' } }],
  });
  const markup = renderToStaticMarkup(
    <SessionProvider session={session}>
      <QueryClientProvider client={client}>
        <QuickAddTray quickAdd={IDLE} locale="en" messages={en} />
      </QueryClientProvider>
    </SessionProvider>,
  );

  it('names the saved size with one message', () => {
    const name = formatTemplate(en.savedSizes.sizeSavedName, { size: 'S' });

    expect(buttonFor(markup, 'S')).toContain(`aria-label="${name}"`);
  });

  it('leaves a size that is not saved to its own label', () => {
    expect(buttonFor(markup, 'M')).not.toContain('aria-label');
  });
});
