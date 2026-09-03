'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { z } from 'zod';

import { LOCALE_COOKIE, LOCALES, type Locale } from '@/i18n/locales';
import { err, ok, type Result } from '@/lib/result';

const setLocaleInputSchema = z.object({ locale: z.enum(LOCALES) });

export interface SetLocaleError {
  kind: 'INVALID_LOCALE';
  message: string;
}

/** `null` is the pre-submission state supplied to `useActionState`. */
export type SetLocaleState = Result<Locale, SetLocaleError> | null;

/**
 * NEXT-12 — a Server Action is a public, unauthenticated endpoint. Its input is
 * validated with Zod and its outcome is returned as a Result.
 *
 * No authorization check is required here: a visitor choosing the language they
 * read the store in is not a permissioned operation.
 */
export async function setLocaleAction(
  _previous: SetLocaleState,
  formData: FormData,
): Promise<SetLocaleState> {
  // SEC-02: form input is untrusted and is validated, never cast.
  const parsed = setLocaleInputSchema.safeParse({ locale: formData.get('locale') });

  if (!parsed.success) {
    return err({ kind: 'INVALID_LOCALE', message: 'Unsupported locale requested.' });
  }

  const store = await cookies(); // NEXT-04: cookies() is async.
  store.set(LOCALE_COOKIE, parsed.data.locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  // The root layout resolves `lang` and `dir` from this cookie, so the whole
  // tree re-renders rather than just the page that submitted.
  revalidatePath('/', 'layout');

  return ok(parsed.data.locale);
}
