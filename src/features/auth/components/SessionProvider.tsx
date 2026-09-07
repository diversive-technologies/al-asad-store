'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface SessionContextValue {
  /** D3: a mock session today, a real one when §11 lands. */
  isSignedIn: boolean;
  displayName: string;
  /** Empty when the customer signed in by code and has no email on file. */
  email: string;
  mobile: string;
}

const EMPTY: SessionContextValue = {
  isSignedIn: false,
  displayName: '',
  email: '',
  mobile: '',
};

const SessionContext = createContext<SessionContextValue>(EMPTY);

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
  session,
  children,
}: {
  session: { displayName: string; email: string; mobile: string } | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => (session === null ? EMPTY : { isSignedIn: true, ...session }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Defaults to signed-out, so a component outside the provider offers less, not more. */
export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
