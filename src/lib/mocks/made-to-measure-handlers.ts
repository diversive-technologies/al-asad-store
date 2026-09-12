import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';

import { measurementSetFor, STYLE_OFFERS } from './measurement-sets-db';
import { isMalformed, readSubmission } from './profile-submission';
import {
  checkSubmission,
  isKnownOwner,
  issueDeviceToken,
  profileOwnerOf,
  saveProfile,
} from './profiles-db';

/**
 * D1 — §34 module 18, standing in for Java: the style offers, one style's list,
 * `validate`, a guest's device token and `saveProfile`. Split out of
 * `handlers.ts`, which carries every other module (MOD-03). The studio's words are
 * Localisation's (§22) and stay with it there.
 *
 * A body is read as `unknown` and checked (`readSubmission`); anything not shaped
 * like a submission is a 400, as Java's boundary would answer.
 */
export const madeToMeasureHandlers = [
  /*
   * The list is served per style and carries ids and shapes only; a style the
   * workshop does not offer is a 404, which the reader turns into `ok(null)`.
   */
  http.get(`*${ENDPOINTS.madeToMeasure.styles}`, () => HttpResponse.json(STYLE_OFFERS)),

  /* `?source=` names a way of measuring; with none, the style's first. A path the
     style does not offer is a 404, as a style not offered is. */
  http.get(`*${ENDPOINTS.madeToMeasure.set}`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const set = measurementSetFor(
      params.get('style') ?? '',
      undefined,
      params.get('source') ?? undefined,
    );
    if (set === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(set);
  }),

  /* §34.4 `validate` — stores nothing, so a customer can check as often as they like. */
  http.post(`*${ENDPOINTS.madeToMeasure.validation}`, async ({ request }) => {
    // `.clone()` — a resolver that consumes the body breaks the next lookup.
    const body = readSubmission(await request.clone().json());
    if (body === null || isMalformed(body)) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(checkSubmission(body));
  }),

  /* A guest's device token, minted by the module as a cart id is by the cart's. */
  http.post(`*${ENDPOINTS.madeToMeasure.deviceTokens}`, () =>
    HttpResponse.json({ token: issueDeviceToken() }, { status: 201 }),
  ),

  /*
   * §34.4 `saveProfile` — always a NEW version. The owner arrives in a header the
   * BFF attached, never in the body; a save without one, or naming a device token
   * this module never issued, is refused.
   */
  http.post(`*${ENDPOINTS.madeToMeasure.profiles}`, async ({ request }) => {
    const owner = profileOwnerOf(request.headers.get(API_HEADERS.measurementOwner));
    if (owner === null || !isKnownOwner(owner)) return new HttpResponse(null, { status: 401 });

    const body = readSubmission(await request.clone().json());
    if (body === null || isMalformed(body)) return new HttpResponse(null, { status: 400 });
    const outcome = saveProfile(owner, body);
    return HttpResponse.json(outcome, { status: outcome.kind === 'SAVED' ? 201 : 200 });
  }),
];
