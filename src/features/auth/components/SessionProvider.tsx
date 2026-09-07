'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface SessionContextValue {
  /** D3: a mock session today, a real one when §11 lands. */
  isSignedIn: boolean;
  displayName: string | null;
}

const SessionContext = createContext<SessionContextValue>({
  isSignedIn: false,
  displayName: null,
});

/**
 * STATE-01 rung 5 — Context, for the "low-frequency, app-wide concern" the rule
 * names outright: session.
 *
 * The value is read on the SERVER and handed down, because the session cookie
 * is httpOnly and the browser cannot see it (SEC-01). Nothing here is a
 * security boundary — it decides what to OFFER, and the backend still decides
 * what to allow.
 */
export function SessionProvider({
  displayName,
  children,
}: {
  displayName: string | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ isSignedIn: displayName !== null, displayName }),
    [displayName],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Defaults to signed-out, so a component outside the provider offers less, not more. */
export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
