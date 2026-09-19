/**
 * SSOT-07 — the two English sentences the ROOT error boundary shows. `en.ts`
 * reads them from here, so each is still written exactly once.
 *
 * Why they are apart (PERF-10): `app/global-error.tsx` renders when the root
 * layout itself has failed, so there is no `MessagesProvider` above it and it
 * imports its words directly, in the default locale (I18N-10). Its chunk loads
 * with every page, so importing the whole of `en.ts` for two sentences made the
 * English dictionary — about 10 kB gzipped — first-load JavaScript on every
 * route.
 */
export const enRootError = {
  unexpected: 'Something went wrong. Please try again.',
  retry: 'Try again',
} as const;
