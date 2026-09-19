'use client';

import { createContext, useContext } from 'react';

import type { Messages } from './messages/en';

/**
 * I18N-02 — Client Components read the dictionary from this provider, seeded
 * once by the root layout. Importing a locale module into a component compiles,
 * renders, and silently makes it monolingual.
 *
 * The context has no default dictionary. It used to default to `en` only so the
 * type was non-optional, and that one import made the whole English dictionary
 * first-load JavaScript on every route although the provider in `app/layout.tsx`
 * always supplies the real value (PERF-10). A component rendered outside the
 * provider is a wiring mistake, and says so.
 */
const MessagesContext = createContext<Messages | null>(null);

export const MessagesProvider = MessagesContext.Provider;

/** Throws when used outside the provider — a wiring mistake, not a runtime state (ERR-06). */
export function useMessages(): Messages {
  const messages = useContext(MessagesContext);
  if (messages === null) throw new Error('useMessages must be used inside <MessagesProvider>.');
  return messages;
}
