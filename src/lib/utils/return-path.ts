import { ROUTES } from '@/config/routes';

/** A placeholder origin to resolve against; nothing is ever fetched from it. */
const PLACEHOLDER_ORIGIN = 'https://return-path.invalid';

/** SEC-02 — an address a person could have come from is nowhere near this long. */
const MAX_LENGTH = 512;

/** Control characters, which no page address carries and a header-splitting one would. */
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function firstSegment(path: string): string {
  return path.split('/')[1] ?? '';
}

/**
 * SEC-06 — the pages a sign-in may send a customer back to, by the first segment
 * of their address, allow-listed against the route registry (SSOT-02) rather than
 * written out here.
 *
 * The auth screens are left out on purpose — returning to sign-in from sign-in is
 * a loop — and so are the BFF routes, which are fetched rather than visited. A page
 * added to `ROUTES` and not here returns the customer to the homepage, which is
 * the safe way for this to be incomplete.
 */
const RETURNABLE_ROOTS: ReadonlySet<string> = new Set(
  [
    ROUTES.home,
    ROUTES.catalogue.detail(''),
    ROUTES.search,
    ROUTES.stitched,
    ROUTES.bag,
    ROUTES.wishlist,
    ROUTES.account,
    ROUTES.checkout,
    ROUTES.orderConfirmation(''),
    ROUTES.help.page(''),
  ].map(firstSegment),
);

/* ERR-05(1): the URL constructor signals an unparseable address only by throwing.
   `URL.canParse` would answer without a throw, but not on the older iOS Safari
   this store still serves — and this runs while the header renders. */
function parsedPath(raw: string): URL | null {
  try {
    return new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
}

/**
 * The page to return to after signing in, from the untrusted `returnTo` in the
 * address — or `null`, meaning "the homepage".
 *
 * Open redirects are PROHIBITED (SEC-06), and the address is exactly what an
 * attacker controls, so the value has to be a path ON THIS SITE and to a page
 * this store has: `//evil.test`, `/\evil.test`, `https://evil.test` and
 * `javascript:` all resolve to another origin or to nothing, and are refused.
 * What is returned is rebuilt from the parsed URL rather than passed through.
 *
 * The REBUILT value is judged as well as the raw one, because parsing collapses
 * dot segments: `/.//evil.test`, `/catalogue/..//evil.test` and `/%2e/%2e//evil.test`
 * all pass the raw checks and all come out as the path `//evil.test` — which a
 * browser reads as another HOST, and whose empty first segment is the homepage's.
 */
export function returnPathFrom(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  if (CONTROL_CHARACTER.test(raw)) return null;

  const url = parsedPath(raw);
  if (url === null || url.origin !== PLACEHOLDER_ORIGIN) return null;
  if (url.pathname.startsWith('//')) return null;
  if (!RETURNABLE_ROOTS.has(firstSegment(url.pathname))) return null;

  const rebuilt = `${url.pathname}${url.search}${url.hash}`;
  // The invariant itself, whatever the parser does next: it resolves to THIS site.
  return parsedPath(rebuilt)?.origin === PLACEHOLDER_ORIGIN ? rebuilt : null;
}
