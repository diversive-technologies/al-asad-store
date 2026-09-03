'use client';

import { createContext, useContext } from 'react';

import { en, type Messages } from './messages/en';

/**
 * I18N-02 — Client Components read the dictionary from this provider, seeded
 * once by the root layout. Importing a locale module into a component compiles,
 * renders, and silently makes it monolingual.
 *
 * `en` is the context default only so the type is non-optional; the real value
 * is always supplied by the provider in `app/layout.tsx`.
 */
const MessagesContext = createContext<Messages>(en);

export const MessagesProvider = MessagesContext.Provider;

export function useMessages(): Messages {
  return useContext(MessagesContext);
}
