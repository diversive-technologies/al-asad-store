import 'server-only';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { readSession } from '@/features/auth';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';
import { capabilityCookieOptions } from '@/lib/utils/cookies';

import { requestDeviceToken } from './profile-server';

export interface ProfileOwner {
  readonly keptWith: 'ACCOUNT' | 'DEVICE';
  readonly key: string;
}

export interface ResolvedOwner {
  readonly owner: ProfileOwner;
  /** A device seen for the first time: its cookie is written only once a save succeeds. */
  readonly isNewDevice: boolean;
}

/*
 * A guest's profiles are theirs by this cookie, which is a CAPABILITY exactly as
 * the cart id is (SEC-01). Its value is a token the backend minted; anything that
 * is not even token-shaped is treated as no cookie at all (SEC-02), and the
 * backend refuses a well-shaped token it never issued.
 */
const DEVICE_COOKIE = 'aa_measurements';
const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const deviceTokenShape = z.uuid();

/**
 * Who a save belongs to — from the session, or this device's own token; never
 * from the request body (A2-5).
 *
 * D3: a signed-in customer is keyed by the mock session's email (or mobile, for
 * a code sign-in). That cookie is unsigned and confers no authority of its own;
 * §11 replaces it with a session Java verifies, which the BFF then forwards in
 * place of this header.
 */
export async function resolveProfileOwner(): Promise<Result<ResolvedOwner, ApiError>> {
  const session = await readSession();
  if (session !== null) {
    const key = session.email.length > 0 ? session.email : session.mobile;
    return ok({ owner: { keptWith: 'ACCOUNT', key }, isNewDevice: false });
  }

  const store = await cookies();
  const existing = deviceTokenShape.safeParse(store.get(DEVICE_COOKIE)?.value);
  if (existing.success) {
    return ok({ owner: { keptWith: 'DEVICE', key: existing.data }, isNewDevice: false });
  }

  return mintDeviceOwner();
}

/** A new device owner, on a token the backend minted — remembered only once it saves. */
export async function mintDeviceOwner(): Promise<Result<ResolvedOwner, ApiError>> {
  const minted = await requestDeviceToken();
  if (!minted.ok) return minted;
  return ok({ owner: { keptWith: 'DEVICE', key: minted.value.token }, isNewDevice: true });
}

/** Remembers a new device's token, once its first save has succeeded. */
export async function rememberDevice(owner: ProfileOwner): Promise<void> {
  if (owner.keptWith !== 'DEVICE') return;
  const store = await cookies();
  store.set(DEVICE_COOKIE, owner.key, capabilityCookieOptions(DEVICE_COOKIE_MAX_AGE_SECONDS));
}
