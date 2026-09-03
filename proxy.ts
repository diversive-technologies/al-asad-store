import { NextResponse, type NextRequest } from 'next/server';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@/i18n/locales';

/**
 * NEXT-05 — `middleware.ts` is deprecated in Next.js 16; the replacement is
 * this file, exporting a function named `proxy`, running on the Node runtime.
 *
 * NEXT-06 — cross-cutting request concerns only. No business logic, no data
 * fetching. This one ensures every request carries a valid locale cookie so
 * that the root layout can resolve `lang` and `dir` without a fallback branch.
 */
export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const current = request.cookies.get(LOCALE_COOKIE)?.value;

  // SEC-02: a cookie is untrusted input. An absent or tampered value is
  // replaced rather than trusted.
  if (!isLocale(current)) {
    response.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
