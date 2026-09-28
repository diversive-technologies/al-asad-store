import 'server-only';

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
 * Available exactly when a provider is configured. Without one the module
 * answers §28.5's unavailable state, and the offer has to say the same.
 */
export function isTryOnAvailable(): boolean {
  return imageModelProvider.isConfigured();
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
