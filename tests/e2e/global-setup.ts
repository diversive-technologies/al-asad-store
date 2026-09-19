import { ROUTES } from '@/config/routes';

import { E2E_BASE_URL } from './support/server';

/** Reads one address from the suite's server, whatever it answers. */
async function request(path: string): Promise<string> {
  const response = await fetch(new URL(path, E2E_BASE_URL), { redirect: 'manual' });
  return response.text();
}

/**
 * Runs once, after Playwright has started the dev server and before the first
 * journey. Both of its jobs are about the SERVER, not the store:
 *
 * 1. **It proves the mock layer is answering.** When MSW stops intercepting (a
 *    known `next dev` failure — PROGRESS, "Things that cost time") every page
 *    still renders, as "we could not reach the store", and every journey then
 *    fails somewhere unhelpful. A listing with no product cards in its HTML is
 *    that state, and the run stops here saying so.
 * 2. **It compiles every route once, one at a time.** `next dev` compiles a route
 *    on its first request; left to the journeys, the first one to reach each
 *    route pays for it inside an assertion's timeout. The pages are the ones the
 *    journeys visit, and the BFF routes are every one in `ROUTES.api`, so a new
 *    route is warmed without anybody remembering to list it here. What each
 *    answers — a 405 for a GET on a write, a 401 for a guest — does not matter;
 *    the request is what compiles it.
 *
 * A default export, because that is how Playwright finds a global setup — the
 * same reason Next's special files are default exports (CMP-03).
 */
export default async function globalSetup(): Promise<void> {
  const listing = await request(ROUTES.catalogue.list);
  const cards = listing.match(/<article\b/g)?.length ?? 0;
  if (cards === 0) {
    throw new Error(
      `${ROUTES.catalogue.list} rendered no products, so the mock layer is not answering. ` +
        'Nothing any journey could check would mean anything; stopping here.',
    );
  }

  const product = /href="(\/catalogue\/[^"?#]+)"/.exec(listing)?.[1];
  if (product === undefined) throw new Error(`${ROUTES.catalogue.list} links to no product.`);

  const pages = [
    ROUTES.home,
    product,
    `${ROUTES.search}?${new URLSearchParams({ q: 'warm' }).toString()}`,
    ROUTES.bag,
    ROUTES.checkout,
    ROUTES.orderConfirmation('warm-up'),
    ROUTES.wishlist,
    ROUTES.account,
    ROUTES.accountAddresses,
    ROUTES.stitched,
    ROUTES.help.sizeGuide,
  ];
  const routeHandlers = Object.values(ROUTES.api).map((route) =>
    typeof route === 'string' ? route : route('warm-up'),
  );

  // One at a time: parallel first compiles only make each of them slower.
  for (const path of [...pages, ...routeHandlers]) {
    await request(path);
  }
}
