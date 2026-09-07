import 'server-only';

import { cookies } from 'next/headers';

import { GRID_COLUMNS_COOKIE, parseMobileColumns, type MobileColumns } from './grid-columns';

/**
 * Resolves the stored small-screen column choice so the FIRST paint already has
 * it, with no flash and no blocking inline script.
 *
 * This is the same mechanism the colour scheme uses (`theme.server.ts`) and for
 * the same reason: reading the preference on the client would render the
 * default grid, then relayout every tile once the effect ran. A cookie the
 * server can read makes the server's HTML already correct (PD-01).
 *
 * localStorage cannot do this — the server cannot see it.
 */
export async function getMobileColumns(): Promise<MobileColumns> {
  const store = await cookies(); // NEXT-04: cookies() is async.

  return parseMobileColumns(store.get(GRID_COLUMNS_COOKIE)?.value);
}
