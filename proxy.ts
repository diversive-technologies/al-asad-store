import { NextResponse, type NextRequest } from 'next/server';

import { LOCALE_COOKIE, LOCALE_QUERY_PARAM, localeToRemember } from '@/i18n/locales';

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
 */
export function proxy(request: NextRequest): NextResponse {
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
