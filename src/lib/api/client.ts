import 'server-only';

import type { z } from 'zod';

import { serverEnv } from '@/config/env.server';
import { err, ok, type Result } from '@/lib/result';

import { fromHttpStatus, toApiError, type ApiError } from './errors';

interface RequestOptions<TSchema extends z.ZodType> {
  path: string;
  schema: TSchema;
  /** `HEAD` asks whether a resource exists and carries no body either way. */
  method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Overrides `JAVA_API_TIMEOUT_MS` for one call.
   *
   * The global budget is sized for reads that answer in hundreds of
   * milliseconds, and a handful of operations legitimately do not — architecture
   * 24's try-on is given 30 seconds by configuration register 23. Raising the
   * global value to fit the slowest call would let a hung product read sit for
   * half a minute, so the exception is stated per call instead.
   */
  timeoutMs?: number;
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

/** Marks a body that was present and was not JSON — distinct from an empty one. */
const NOT_JSON = Symbol('NOT_JSON');

function parseJson(text: string): unknown {
  // ERR-05(1): `JSON.parse` signals malformed input only by throwing. It is
  // converted to a value on the spot and never propagates.
  try {
    return JSON.parse(text);
  } catch {
    return NOT_JSON;
  }
}

/**
 * A successful response's body, as untrusted `unknown`.
 *
 * An EMPTY body is `null` whatever the status says — a 204, and equally a 200
 * that a `-> void` operation answers with nothing — so a schema that allows a
 * void answer can accept it (§11 `issueCode`, `resetPassword`). A body that is
 * present and not JSON is a broken contract, reported as one rather than thrown:
 * `response.json()` used to reject straight out of this function, which is the
 * one thing DATA-03 says it never does.
 */
async function readPayload(response: Response, path: string): Promise<Result<unknown, ApiError>> {
  const text = await response.text().then<string | ApiError, ApiError>(
    (value) => value,
    (cause: unknown) => toApiError(cause),
  );
  if (typeof text !== 'string') return err(text);
  if (text.trim().length === 0) return ok(null);

  const payload = parseJson(text);
  if (payload !== NOT_JSON) return ok(payload);

  return err({
    kind: 'CONTRACT_VIOLATION',
    message: 'Backend response was not JSON.',
    issues: [],
    path,
  });
}

function requestInit<TSchema extends z.ZodType>(options: RequestOptions<TSchema>): RequestInit {
  const { method = 'GET', body, headers, signal, next } = options;
  const timeout = AbortSignal.timeout(options.timeoutMs ?? serverEnv.JAVA_API_TIMEOUT_MS);

  /*
   * Binary bodies travel as FormData, and both branches below are required.
   *
   * `JSON.stringify` on a FormData yields "{}" — it would send an empty object
   * with a straight face rather than fail. And the Content-Type must be OMITTED
   * rather than written: multipart's header carries a boundary token generated
   * with the body, so any hand-written value is wrong and the request arrives
   * unparseable at the far end.
   */
  const isMultipart = body instanceof FormData;
  const encodedBody: BodyInit | undefined =
    body === undefined ? undefined : isMultipart ? body : JSON.stringify(body);

  /*
   * TS-01 `exactOptionalPropertyTypes` forbids assigning `undefined` to an
   * optional property, so an absent body is omitted from the init object rather
   * than set to `undefined`.
   */
  const init: RequestInit & { next: RequestOptions<TSchema>['next'] } = {
    method,
    headers: {
      ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      ...headers,
    },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    next,
    ...(encodedBody === undefined ? {} : { body: encodedBody }),
  };
  return init;
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
  const { path, schema, searchParams } = options;

  // ERR-05(1): fetch signals transport failure only by rejecting. The rejection
  // is converted to a Result here and never propagates as a throw.
  const response = await fetch(buildUrl(path, searchParams), requestInit(options)).then<
    Response | ApiError,
    ApiError
  >(
    (res) => res,
    (cause: unknown) => toApiError(cause),
  );

  if (!(response instanceof Response)) return err(response);
  if (!response.ok) return err(fromHttpStatus(response));

  const payload = await readPayload(response, path);
  if (!payload.ok) return payload;

  // DATA-02: the wire shape is validated at the boundary, never cast.
  const parsed = schema.safeParse(payload.value);

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
