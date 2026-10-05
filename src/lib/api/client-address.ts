import 'server-only';

import { isIP } from 'node:net';

import { headers as requestHeaders } from 'next/headers';

import { API_HEADERS } from './headers';

/**
 * F-02 — the customer's address, for the Java calls behind a rate limit (A-03).
 *
 * Java cannot see the customer: every call arrives from this server. So the
 * address is read from the request THIS server is answering and passed on as
 * `x-client-ip`. Java uses it only because Cloudflare Access admits no caller but
 * this server (A-01, A-02); it is a hint the backend validates, never a
 * credential.
 *
 * `x-forwarded-for` is `client, proxy1, proxy2`, and the host (Vercel) sets the
 * first entry from the connection — so the FIRST entry is the customer. Anything
 * that is not a syntactically valid IPv4 or IPv6 address is dropped rather than
 * forwarded (SEC-02), which leaves Java to fall back to the connection's address.
 *
 * Do not attach this to cached catalogue or content reads: a per-visitor header
 * is part of what Next's data cache keys on, and it would make every one of them
 * uncacheable.
 */

/** What a call behind a limit adds to its headers. Empty when no address is known. */
export type ClientAddressHeaders = Readonly<Record<string, string>>;

const MAX_ADDRESS_LENGTH = 45; // the longest IPv6 text form

function addressFrom(forwardedFor: string | null): string | null {
  if (forwardedFor === null) return null;

  const first = (forwardedFor.split(',')[0] ?? '').trim();
  if (first.length === 0 || first.length > MAX_ADDRESS_LENGTH) return null;
  return isIP(first) === 0 ? null : first;
}

/** For a Route Handler, which holds its `Request`. */
export function clientAddressHeader(request: Pick<Request, 'headers'>): ClientAddressHeaders {
  const address = addressFrom(request.headers.get('x-forwarded-for'));
  return address === null ? {} : { [API_HEADERS.clientAddress]: address };
}

/** For a Server Action, which has no `Request` and reads `headers()` instead (NEXT-04). */
export async function currentClientAddressHeader(): Promise<ClientAddressHeaders> {
  return clientAddressHeader({ headers: await requestHeaders() });
}
