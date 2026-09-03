'use client';

import { useState, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export interface QueryProviderProps {
  children: ReactNode;
}

/**
 * DATA-05 — Client Components read server state through TanStack Query; Server
 * Components fetch directly. This provider serves the former.
 *
 * The client is created inside `useState` rather than at module scope: a
 * module-level client would be shared across requests on the server and leak
 * one user's cached data into another's render.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            // Stock and price must never be served stale from a client cache
            // (architecture 8.4); feature queries that touch either override
            // this with their own staleTime of 0.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
