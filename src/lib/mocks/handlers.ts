import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { SYSTEM_HEALTH } from './db';

/**
 * D1 / TEST-04 — network is mocked at the HTTP layer, never by stubbing the
 * project's own API client. Requests therefore travel through `apiRequest`
 * unchanged, exercising the real client, its timeout, its error normalisation
 * and its schema validation.
 *
 * Paths are prefixed with `*` so a handler matches whatever origin
 * `JAVA_API_BASE_URL` currently points at, without duplicating that value here.
 */
export const handlers = [
  http.get(`*${ENDPOINTS.system.health}`, () => HttpResponse.json(SYSTEM_HEALTH)),
];
