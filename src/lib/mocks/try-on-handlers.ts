import { http, HttpResponse } from 'msw';

import { serverEnv } from '@/config/env.server';
import { ENDPOINTS } from '@/lib/api/endpoints';

import { findTryOnProduct, generateTryOn, tryOnOffer } from './try-on-db';

/**
 * D1 — architecture §24 Try-On, module 14, standing in for Java. Split out of
 * `handlers.ts` (MOD-03).
 */

/* Standing in for Java configuration: the module is TOLD the policy (see `try-on-db.ts`). */
const policy = () => ({ sampleWhenUnconfigured: serverEnv.TRY_ON_SAMPLE_RESULT === 'enabled' });

export const tryOnHandlers = [
  /*
   * `offer` is `isAvailable()` and is answered from configuration alone: it
   * never reaches the provider, so a product page can ask it without putting an
   * external service on its render path (ADR 12).
   */
  http.get(`*${ENDPOINTS.tryOn.offer}`, () => HttpResponse.json(tryOnOffer(policy()))),

  /*
   * §24 `generate`. Multipart, because the body is a photograph rather than a
   * document — see the client for why that shape reaches `apiRequest` intact.
   */
  http.post(`*${ENDPOINTS.tryOn.generate}`, async ({ request }) => {
    /*
     * MSW walks its handler list looking for a match, and a resolver that reads
     * the body consumes the stream — the next handler to touch the same request
     * throws "Body is unusable" and the whole lookup fails as a 502. Cloning
     * leaves the original untouched for whoever comes next.
     */
    const form = await request.clone().formData();
    const productId = form.get('productId');
    const photo = form.get('photo');

    // SEC-02: untrusted input, and a form entry is a File OR a string.
    if (typeof productId !== 'string' || photo === null || typeof photo === 'string') {
      return new HttpResponse(null, { status: 400 });
    }

    const record = findTryOnProduct(productId);
    if (record === null) return new HttpResponse(null, { status: 404 });

    const outcome = await generateTryOn(
      record,
      { bytes: new Uint8Array(await photo.arrayBuffer()), mimeType: photo.type },
      policy(),
    );

    /*
     * PHOTO_REJECTED is deliberately NOT a §24 outcome, so it does not travel on
     * the success union — it becomes the contract's 422 here, which `apiRequest`
     * reads as a VALIDATION error. Smuggling it through as a third success member
     * would have made every caller handle a failure while holding a value the
     * type says succeeded. It was a 400, which `apiRequest` reads as SERVER, so a
     * photo the module refused reached the customer as "try again".
     */
    if (outcome.status === 'PHOTO_REJECTED') return new HttpResponse(null, { status: 422 });

    return HttpResponse.json(outcome);
  }),
];
