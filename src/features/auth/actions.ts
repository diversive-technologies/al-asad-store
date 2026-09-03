'use server';

import { cookies } from 'next/headers';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { err, type Result } from '@/lib/result';

import { sessionSchema, signInSchema, type Session } from './schemas/sign-in.schema';

/**
 * D3 — the placeholder sign-in.
 *
 * It goes through the real client and the real mock boundary rather than
 * short-circuiting, so the shape of an authenticated request is exercised now
 * and the real Identity module (section 11) replaces the body of this file
 * without the callers changing.
 *
 * SEC-01: no credential is collected, stored or logged. The cookie holds a
 * display name only and confers no authority — the Java service will own
 * sessions, and the backend re-checks authorization on every request (SEC-03).
 */
const SESSION_COOKIE = 'session';

export async function signInAction(input: unknown): Promise<Result<Session, ApiError>> {
  // NEXT-12 / SEC-02: Server Action input is untrusted and validated with Zod.
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return err({
      kind: 'VALIDATION',
      message: 'The submitted data was rejected.',
      fieldErrors: { mobile: ['invalid'] },
    });
  }

  const result = await apiRequest({
    path: ENDPOINTS.auth.session,
    schema: sessionSchema,
    method: 'POST',
    body: { mobile: parsed.data.mobile },
    next: { revalidate: 0 },
  });

  if (!result.ok) return result;

  const store = await cookies(); // NEXT-04: cookies() is async.
  store.set(SESSION_COOKIE, result.value.displayName, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 24,
  });

  return result;
}
