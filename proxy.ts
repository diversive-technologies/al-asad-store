import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

import { LOCALE_COOKIE, LOCALE_QUERY_PARAM, localeToRemember } from '@/i18n/locales';
import { pageViewFor, postPageView } from '@/lib/analytics/page-view';
import { newVisitorId, parseVisitorId } from '@/lib/analytics/visitor';
import { capabilityCookieOptions, VISITOR_COOKIE_NAME } from '@/lib/utils/cookies';

/** M-03 — one year, so a returning visitor is recognised as one. */
const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * NEXT-05 — `middleware.ts` is deprecated in Next.js 16; the replacement is
 * this file, exporting a function named `proxy`, running on the Node runtime.
 *
 * NEXT-06 — cross-cutting request concerns only. No business logic, no data
 * fetching. This one settles the request's locale so that the root layout can
 * resolve `lang` and `dir` without a fallback branch: a valid `?locale=` query
 * chooses the language (§30.5's alternates depend on it), and otherwise every
 * request carries a valid locale cookie.
 *
 * A cookie set on this response is also visible to `cookies()` for the SAME
 * request — Next merges it into the render — so `/?locale=ur` renders Urdu on
 * its first load rather than on the next one.
 *
 * M-03 — the same holds for the visitor cookie (`aa_visitor`): a random UUID,
 * set only when absent or unreadable, that lets the shop count visits without
 * knowing who they were. The proxy also reports the page view, after the response,
 * because it is the one place every navigation — full or soft — passes through.
 */
export function proxy(request: NextRequest, event: NextFetchEvent): NextResponse {
  const response = NextResponse.next();
  const chosen = localeToRemember(
    request.nextUrl.searchParams.get(LOCALE_QUERY_PARAM),
    request.cookies.get(LOCALE_COOKIE)?.value,
  );

  if (chosen !== null) {
    response.cookies.set(LOCALE_COOKIE, chosen, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const known = parseVisitorId(request.cookies.get(VISITOR_COOKIE_NAME)?.value);
  const visitorId = known ?? newVisitorId();
  if (known === null) {
    response.cookies.set(
      VISITOR_COOKIE_NAME,
      visitorId,
      capabilityCookieOptions(VISITOR_MAX_AGE_SECONDS),
    );
  }

  const view = pageViewFor(
    { method: request.method, pathname: request.nextUrl.pathname, headers: request.headers },
    visitorId,
  );
  // `waitUntil`, not an awaited call: the page never waits on a count (M-03).
  if (view !== null) event.waitUntil(postPageView(view, request));

  return response;
}

/*
 * Static files are skipped: they carry no page, so they need no locale cookie,
 * and a `Set-Cookie` on a photograph or a film keeps a shared cache from storing
 * it. The list has to name the formats the store actually serves — AVIF
 * photography and MP4 film — as well as fonts and the text files a crawler asks
 * for; it used to stop at PNG and JPEG, so every product image ran the proxy.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|woff2?|txt|xml)$).*)',
  ],
};
