/**
 * STRUCT-06 — auth's SERVER-only surface.
 *
 * `index.ts` is imported by Client Components for `useSession` and the sign-in
 * screens, so anything carrying `server-only` cannot go there: a Client
 * Component reaching it through the barrel fails the build. This is the other
 * half, and only a Server Component or a Route Handler may import it.
 */
export { currentAccountKey } from './api/current-account';
