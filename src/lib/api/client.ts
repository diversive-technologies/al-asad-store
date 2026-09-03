import 'server-only';

import type { z } from 'zod';

import { serverEnv } from '@/config/env.server';
import { err, ok, type Result } from '@/lib/result';

import { fromHttpStatus, toApiError, type ApiError } from './errors';

interface RequestOptions<TSchema extends z.ZodType> {
  path: string;
  schema: TSchema;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** DATA-09: caching intent is mandatory. Use `{ revalidate: 0 }` for fully dynamic reads. */
  next: { revalidate?: number; tags?: string[] };
}

function buildUrl(path: string, params?: RequestOptions<z.ZodType>['searchParams']): string {
  const url = new URL(path, serverEnv.JAVA_API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * SSOT-05 / DATA-01 — THE HTTP client. Exactly one module performs network I/O
 * against the Java backend, so base URL, timeout, headers, error normalisation
 * and schema validation exist in one place.
 *
 * DATA-03: returns a Result and never throws.
 *
 * D1: while the Java service is unbuilt, MSW intercepts these calls in the Next
 * server process. The interception happens at the HTTP layer (TEST-04), so this
 * module and its schema validation run unchanged against mocks and against the
 * real service.
 */
export async function apiRequest<TSchema extends z.ZodType>(
  options: RequestOptions<TSchema>,
): Promise<Result<z.infer<TSchema>, ApiError>> {
  const { path, schema, method = 'GET', body, searchParams, headers, signal, next } = options;

  const timeout = AbortSignal.timeout(serverEnv.JAVA_API_TIMEOUT_MS);

  /*
   * TS-01 `exactOptionalPropertyTypes` forbids assigning `undefined` to an
   * optional property, so an absent body is omitted from the init object rather
   * than set to `undefined`.
   */
  const init: RequestInit & { next: RequestOptions<TSchema>['next'] } = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    next,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };

  // ERR-05(1): fetch signals transport failure only by rejecting. The rejection
  // is converted to a Result here and never propagates as a throw.
  const response = await fetch(buildUrl(path, searchParams), init).then<
    Response | ApiError,
    ApiError
  >(
    (res) => res,
    (cause: unknown) => toApiError(cause),
  );

  if (!(response instanceof Response)) return err(response);
  if (!response.ok) return err(fromHttpStatus(response));

  const payload: unknown = response.status === 204 ? null : await response.json();
  // DATA-02: the wire shape is validated at the boundary, never cast.
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return err({
      kind: 'CONTRACT_VIOLATION',
      message: 'Backend response did not match the expected schema.',
      issues: parsed.error.issues,
      path,
    });
  }

  return ok(parsed.data);
}
