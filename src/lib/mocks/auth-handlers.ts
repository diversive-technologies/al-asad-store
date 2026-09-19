import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';

import {
  authenticate,
  authenticateByCode,
  issueCode,
  register,
  requestPasswordReset,
} from './auth-db';
import {
  authenticateBody,
  bodyOf,
  codeSignInBody,
  issueCodeBody,
  registerBody,
  resetBody,
} from './request-bodies';

/**
 * D1 — §11 Identity, standing in for Java. Split out of `handlers.ts` (MOD-03).
 *
 * Every refusal below is deliberately the same shape, because "authentication
 * responses never reveal whether an account exists" — a 401 that differs for an
 * unknown email turns this endpoint into a directory. A body of the wrong SHAPE is
 * a 400, which says nothing about any account.
 */

const BAD_REQUEST = () => new HttpResponse(null, { status: 400 });

export const authHandlers = [
  http.post(`*${ENDPOINTS.auth.authenticate}`, async ({ request }) => {
    const body = await bodyOf(request, authenticateBody);
    if (body === null) return BAD_REQUEST();

    const outcome = authenticate(body.email, body.password);
    if (outcome.kind === 'AUTHENTICATED') return HttpResponse.json(outcome.session);
    // 429 for a lockout, 401 otherwise. Neither says which account, or why.
    return new HttpResponse(null, { status: outcome.kind === 'RATE_LIMITED' ? 429 : 401 });
  }),

  http.post(`*${ENDPOINTS.auth.issueCode}`, async ({ request }) => {
    const body = await bodyOf(request, issueCodeBody);
    if (body === null) return BAD_REQUEST();

    /*
     * D1 — the code comes back in the RESPONSE, and that is a mock-only
     * affordance with a real reason: no SMS provider is wired up, so without it
     * the code-sign-in path could not be exercised at all. The real §11 returns
     * void and delivers by SMS; the interface treats this field as optional and
     * shows it only as a testing hint.
     */
    return HttpResponse.json({ devCode: issueCode(body.mobile) });
  }),

  http.post(`*${ENDPOINTS.auth.authenticateByCode}`, async ({ request }) => {
    const body = await bodyOf(request, codeSignInBody);
    if (body === null) return BAD_REQUEST();

    const outcome = authenticateByCode(body.mobile, body.code);
    if (outcome.kind === 'AUTHENTICATED') return HttpResponse.json(outcome.session);
    return new HttpResponse(null, { status: outcome.kind === 'RATE_LIMITED' ? 429 : 401 });
  }),

  http.post(`*${ENDPOINTS.auth.register}`, async ({ request }) => {
    const body = await bodyOf(request, registerBody);
    if (body === null) return BAD_REQUEST();

    const outcome = register(body);
    // 409 is the one place a collision IS reported — see `register`'s note.
    if (outcome.kind === 'TAKEN') return new HttpResponse(null, { status: 409 });
    return HttpResponse.json(outcome.session, { status: 201 });
  }),

  http.post(`*${ENDPOINTS.auth.resetPassword}`, async ({ request }) => {
    const body = await bodyOf(request, resetBody);
    if (body === null) return BAD_REQUEST();

    requestPasswordReset(body.email);
    // Always 204: the caller learns nothing about who has an account.
    return new HttpResponse(null, { status: 204 });
  }),
];
