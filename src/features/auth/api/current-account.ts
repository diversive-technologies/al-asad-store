import 'server-only';

import { accountKeyOf } from '../account-key';
import { readSession } from '../actions';

/**
 * The signed-in customer's account key, or null for a guest.
 *
 * Every owner-scoped BFF route asks this and then attaches the answer as a
 * header, so the account is read from the SESSION on the server and never taken
 * from the request the browser sent. Three features want it now — the saved
 * items, the address book, and the order history behind them — and three copies
 * of "session, then `accountKeyOf`" would be three places for it to drift
 * (PD-01).
 *
 * It is `server-only` and therefore NOT on the feature's main barrel, which a
 * Client Component imports for `useSession`. A `server-only` module reached
 * through that barrel fails the build outright, so this one has its own
 * (`features/auth/server.ts`, STRUCT-06's split by boundary).
 */
export async function currentAccountKey(): Promise<string | null> {
  const session = await readSession();
  return session === null ? null : accountKeyOf(session);
}
