import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { accountKeyOf, SessionProvider } from '@/features/auth';
import { en } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { formatPlural } from '@/lib/utils/format';

import type { SavedItemsError } from '../api/saved-items-browser';
import { savedItemsSchema, type SavedItems } from '../schemas/saved-items.schema';
import { WishlistContents } from './WishlistContents';

const SESSION = {
  displayName: 'Test Customer',
  email: 'customer@example.com',
  mobile: '03001234567',
};

/** Two saved products, both since withdrawn: `/api/products` answers without them. */
const IDS = ['00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2'];

/**
 * The account's list as a render finds it — read, and whether the last read
 * FAILED — beside the products read for it. A failed read after a good one keeps
 * the list, which is what a refused heart's follow-up read leaves behind.
 */
function clientHolding(listReadFailed: SavedItemsError | null): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  const list = client.getQueryCache().build<SavedItems, SavedItemsError>(client, {
    queryKey: queryKeys.wishlist.savedItems(accountKeyOf(SESSION)),
  });

  list.setState({
    ...list.state,
    data: savedItemsSchema.parse({ ids: IDS }),
    dataUpdatedAt: Date.now(),
    error: listReadFailed,
    errorUpdatedAt: listReadFailed === null ? 0 : Date.now(),
    status: listReadFailed === null ? 'success' : 'error',
    fetchStatus: 'idle',
  });
  client.setQueryData(queryKeys.wishlist.products(IDS, 'en'), []);
  return client;
}

function contentsWith(listReadFailed: SavedItemsError | null): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={clientHolding(listReadFailed)}>
      <SessionProvider session={SESSION}>
        <WishlistContents locale="en" messages={en} onAddedToBag={() => undefined} />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

const WITHDRAWN = formatPlural(en.wishlist.withdrawn, IDS.length, 'en');

describe('the saved items page', () => {
  /*
   * F5 — the list holds two ids and neither product is on sale any more. The page
   * said "Nothing saved yet" while `/account` counted two, and the sentence
   * written for exactly this never appeared.
   */
  it('says the saved products were withdrawn, rather than that nothing is saved', () => {
    const markup = contentsWith(null);

    expect(markup).toContain(WITHDRAWN);
    expect(markup).not.toContain(en.wishlist.emptyHeading);
  });

  /*
   * F3 — a refused heart asks the server again, and when that read failed too the
   * whole list gave way to "could not load" over one refused press.
   */
  it('keeps the list when a read after it has been read fails', () => {
    const markup = contentsWith({ kind: 'UNREACHABLE' });

    expect(markup).toContain(WITHDRAWN);
    expect(markup).not.toContain(en.wishlist.unreachable);
  });
});
