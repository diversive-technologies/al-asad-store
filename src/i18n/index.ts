import 'server-only';

import { cookies } from 'next/headers';

import { CLIENT } from '@/config/client';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './locales';
import { en, type Messages } from './messages/en';
import { ur } from './messages/ur';

/** SSOT-07 — THE server-side resolver. Components never import a locale module. */
const DICTIONARIES: Record<Locale, Messages> = { en, ur };

/** NEXT-04: cookies() is async in Next.js 16. */
export async function getLocale(): Promise<Locale> {
  // F-10: when languageSwitcher is off, the locale read used for rendering returns
  // the default whatever the cookie or query says.
  if (!CLIENT.features.languageSwitcher) {
    return DEFAULT_LOCALE;
  }
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  // SEC-02: a cookie is untrusted input and is validated, never cast.
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getMessages(): Promise<Messages> {
  return DICTIONARIES[await getLocale()];
}
