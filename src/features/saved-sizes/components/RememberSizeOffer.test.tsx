import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { accountKeyOf, SessionProvider } from '@/features/auth';
import { en } from '@/i18n/messages/en';
import { MessagesProvider } from '@/i18n/use-messages';
import { queryKeys } from '@/lib/api/query-keys';
import { sizeIdSchema } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { SavedSizesError } from '../api/saved-sizes-browser';
import type { SavedSizes } from '../schemas/saved-size.schema';
import { RememberSizeOffer } from './RememberSizeOffer';

const SESSION = {
  displayName: 'Test Customer',
  email: 'customer@example.com',
  mobile: '03001234567',
};

const SIZE = { id: sizeIdSchema.parse('00000000-0000-4000-8000-0000000000d1'), label: 'M' };

/** The saved sizes as a render finds them: read (`list`), and whether the last read FAILED. */
function clientHolding(list: SavedSizes | undefined, error: SavedSizesError | null) {
  // `retryOnMount: false`, so a render reads the state as seeded rather than as refetching.
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  const key = queryKeys.account.savedSizes(accountKeyOf(SESSION), 'en');
  const query = client
    .getQueryCache()
    .build<SavedSizes, SavedSizesError>(client, { queryKey: key });

  query.setState({
    ...query.state,
    data: list,
    dataUpdatedAt: list === undefined ? 0 : Date.now(),
    error,
    errorUpdatedAt: error === null ? 0 : Date.now(),
    status: error === null ? 'success' : 'error',
    fetchStatus: 'idle',
  });
  return client;
}

function offerWith(list: SavedSizes | undefined, error: SavedSizesError | null): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={clientHolding(list, error)}>
      <MessagesProvider value={en}>
        <SessionProvider session={SESSION}>
          <RememberSizeOffer size={SIZE} isPrefilled={false} locale="en" />
        </SessionProvider>
      </MessagesProvider>
    </QueryClientProvider>,
  );
}

const REMEMBER = formatTemplate(en.savedSizes.remember, { size: SIZE.label });

describe('the offer to remember a size', () => {
  /*
   * F6 — a refused press asks the server again. When that read failed too, the
   * sizes were marked unreadable and the offer returned nothing: the button and
   * the refusal it had just written both vanished, with nothing said.
   */
  it('stays on the page when a read after the sizes were read fails', () => {
    expect(offerWith({ sizes: [] }, { kind: 'SIGNED_OUT' })).toContain(REMEMBER);
    expect(offerWith({ sizes: [] }, { kind: 'UNREACHABLE' })).toContain(REMEMBER);
  });

  it('offers nothing while the sizes have never been read, since it cannot say what is saved', () => {
    expect(offerWith(undefined, { kind: 'UNREACHABLE' })).toBe('');
  });
});
