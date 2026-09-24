import 'server-only';

import { serverEnv } from '@/config/env.server';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';

import { ACCEPTED_FORMATS, MAX_PHOTO_BYTES } from '../lib/try-on-limits';
import type { TryOnOffer } from '../schemas/try-on.schema';
import { imageModelProvider } from './gemini-provider';

/**
 * §24 `isAvailable()`, and the upload rules that come with it.
 *
 * This used to be a cached round trip to the backend to learn a value the
 * frontend already holds. It is now answered where it is known — from this
 * process's own configuration — which removes a request from the product
 * page's 200ms budget (§30.1) entirely rather than caching it for a minute.
 *
 * The `Result` is kept although nothing here can fail. Every caller already
 * treats a failed offer as "assume nothing and let the module be the judge"
 * (`ProductTryOn.tsx`), and narrowing the type would be a breaking change to
 * five call sites in exchange for nothing.
 */

/**
 * The two answers have to agree, and this is the line that keeps them agreeing:
 * if a SAMPLE is what a generation will return, the feature IS available.
 * Reporting otherwise would have the panel announce that try-on is switched off
 * and then produce an image anyway, which is worse than either state alone.
 */
export function isTryOnAvailable(): boolean {
  return imageModelProvider.isConfigured() || serverEnv.TRY_ON_SAMPLE_RESULT === 'enabled';
}

export function fetchTryOnOffer(): Promise<Result<TryOnOffer, ApiError>> {
  return Promise.resolve(
    ok({
      available: isTryOnAvailable(),
      maxPhotoBytes: MAX_PHOTO_BYTES,
      acceptedFormats: [...ACCEPTED_FORMATS],
    }),
  );
}
