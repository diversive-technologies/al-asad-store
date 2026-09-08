import { ROUTES } from '@/config/routes';
import type { ProductId } from '@/lib/domain/ids';
import { err, ok, type Result } from '@/lib/result';

import { tryOnResultSchema, type TryOnResult } from '../schemas/try-on.schema';

/**
 * The browser side of §24. It reads our own BFF and never the Java service —
 * `apiRequest` is `server-only`, and a photograph is chosen in a file picker.
 *
 * Note that a successful HTTP response can still carry `UNAVAILABLE`. That is
 * not a contradiction: the module was reached and answered, and its answer was
 * that it could not produce an image. The failures below are the ones where it
 * did not answer at all.
 */

/** Two, because the customer can act on one of them and not on the other. */
export type TryOnRequestFailure = 'PHOTO_REJECTED' | 'FAILED';

export async function requestTryOn(
  productId: ProductId,
  photo: File,
  signal?: AbortSignal,
): Promise<Result<TryOnResult, TryOnRequestFailure>> {
  const body = new FormData();
  body.set('productId', productId);
  body.set('photo', photo);

  /*
   * No Content-Type header: the browser must set multipart's own, because the
   * boundary token is generated with the body and any value written by hand is
   * wrong.
   *
   * ERR-05(1) / ERR-01: the rejection becomes a value; no try/catch for flow.
   */
  const response = await fetch(ROUTES.api.tryOn, {
    method: 'POST',
    body,
    signal: signal ?? null,
    headers: { Accept: 'application/json' },
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  if (response === null) return err('FAILED');

  /*
   * 400 is the refused photograph, and it is worth separating from everything
   * else: it is the one failure where the customer can do something — choose a
   * different file — rather than only try again.
   */
  if (response.status === 400) return err('PHOTO_REJECTED');
  if (!response.ok) return err('FAILED');

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: our own route is a network boundary like any other.
  const parsed = tryOnResultSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err('FAILED');
}
