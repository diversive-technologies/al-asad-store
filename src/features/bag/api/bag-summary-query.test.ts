import { focusManager, QueryClient, QueryObserver } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/config/routes';

import { bagSummaryQuery } from './bag-summary-query';

/**
 * TEST-08 — F3: the bag was read once per page load and never again. Its one
 * standing observer is the provider in the root layout, which never remounts,
 * and the client's default is not to refetch on focus — so a line whose hold had
 * lapsed stayed in the header and the panel for as long as the customer browsed.
 *
 * TEST-04: the BFF is mocked at the HTTP layer, so the real reader runs.
 */

const ORIGIN = 'http://store.test';
const server = setupServer();

beforeAll(() => {
  vi.stubGlobal('location', { href: `${ORIGIN}/catalogue` });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  focusManager.setFocused(undefined);
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('the bag query', () => {
  it('reads the bag again when the tab comes back, whatever the client’s default', async () => {
    let reads = 0;
    server.use(
      http.get(`${ORIGIN}${ROUTES.api.bag}`, () => {
        reads += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    // The store's own client turns focus refetching OFF by default.
    const client = new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false } },
    });
    // What `QueryClientProvider` does: listen for the window's focus.
    client.mount();
    const observer = new QueryObserver(client, bagSummaryQuery());
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => {
      expect(observer.getCurrentResult().isSuccess).toBe(true);
    });

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await vi.waitFor(() => {
      expect(reads).toBe(2);
    });
    unsubscribe();
    client.unmount();
  });
});
