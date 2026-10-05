import 'server-only';

import { serverEnv } from '@/config/env.server';

import type { Session } from '../schemas/auth.schema';

import { openSessionWith, sealSessionWith } from './session-seal';

/**
 * F-01 — the session token, bound to this server's secrets.
 *
 * `SESSION_SECRET` signs. `SESSION_SECRET_PREVIOUS`, set only during a rotation,
 * is accepted for opening so customers are not signed out the moment the secret
 * changes; once the old tokens have expired (seven days) it is removed.
 */

/** The cookie value for `session`, signed now. */
export function sealSession(session: Session, now: Date): string {
  return sealSessionWith(session, Math.floor(now.getTime() / 1000), serverEnv.SESSION_SECRET);
}

/** The session a cookie value carries, or `null` for anything that is not a genuine, live one. */
export function openSession(token: string, now: Date): Session | null {
  const secrets =
    serverEnv.SESSION_SECRET_PREVIOUS === undefined
      ? [serverEnv.SESSION_SECRET]
      : [serverEnv.SESSION_SECRET, serverEnv.SESSION_SECRET_PREVIOUS];
  return openSessionWith(token, Math.floor(now.getTime() / 1000), secrets);
}
