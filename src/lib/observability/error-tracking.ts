import 'server-only';

import * as Sentry from '@sentry/node';

import { serverEnv } from '@/config/env.server';

import { installErrorReporter, type ErrorReport } from './error-reporter';
import { maskPersonalData } from './redact';

/**
 * F-08 — server-side error tracking with Sentry (TD-11).
 *
 * `@sentry/node` only: no `@sentry/nextjs`, no wrapped Next config, nothing in the
 * browser (the storefront's JavaScript budget has 3.5 kB of headroom on
 * `/stitched`). Browser errors reach it through `POST /api/client-error`.
 *
 * What is sent is chosen, not defaulted. The SDK's default integrations record
 * console output as breadcrumbs, request data, local variables and source lines —
 * every one of which can carry a customer's details — so none of them is
 * installed. What remains is uncaught exceptions, unhandled rejections, error
 * chaining and de-duplication; the rest reaches Sentry only through the two
 * functions below, with a masked message and a handful of tags.
 */

/** Initialises Sentry when a DSN is configured; with none, tracking stays off. Idempotent. */
export function initErrorTracking(): void {
  const dsn = serverEnv.SENTRY_DSN;
  if (dsn === undefined || Sentry.isInitialized()) return;

  Sentry.init({
    dsn,
    environment: serverEnv.VERCEL_ENV ?? serverEnv.NODE_ENV,
    /*
     * The plan names `sendDefaultPii: false`; SDK 11 replaced that option with
     * `dataCollection`, whose defaults COLLECT user info, cookies, headers, bodies
     * and query strings. Every category is switched off explicitly.
     */
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
    },
    tracesSampleRate: 0,
    defaultIntegrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    beforeSend(event) {
      // Whatever an integration attached, none of it identifies a customer.
      delete event.request;
      delete event.user;
      if (event.message !== undefined) event.message = maskPersonalData(event.message);
      for (const exception of event.exception?.values ?? []) {
        if (exception.value !== undefined) exception.value = maskPersonalData(exception.value);
      }
      return event;
    },
  });

  installErrorReporter(reportLoggedProblem);
}

/** What `log.ts` hands over: a context tag and an already-masked sentence. */
function reportLoggedProblem(report: ErrorReport): void {
  Sentry.withScope((scope) => {
    scope.setTag('context', report.context);
    Sentry.captureMessage(report.message, report.level);
  });
}

/** What Next tells `onRequestError` about the request that failed. */
export interface FailedRequest {
  readonly method: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

export interface FailedRequestContext {
  readonly routePath: string;
  readonly routeType: string;
  readonly routerKind: string;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Sends an error Next caught while serving a request.
 *
 * Only the route PATTERN (`/app/order/[orderNumber]`, never the address, whose
 * query can hold a reset token or a mobile number), the method, the kind of
 * handler and the request id travel with it. Never the body, the cookies or any
 * header's value but the id.
 */
export function captureRequestError(
  error: unknown,
  request: FailedRequest,
  context: FailedRequestContext,
): void {
  if (!Sentry.isInitialized()) return;

  const requestId = headerValue(request.headers['x-request-id'] ?? request.headers['x-vercel-id']);

  Sentry.withScope((scope) => {
    scope.setTags({
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
      method: request.method,
      ...(requestId === undefined ? {} : { requestId }),
    });
    Sentry.captureException(error);
  });
}

/** Sends one error the browser reported through `/api/client-error`. */
export function captureClientError(report: {
  readonly message: string;
  readonly digest: string | null;
  readonly path: string;
}): void {
  if (!Sentry.isInitialized()) return;

  Sentry.withScope((scope) => {
    scope.setTags({
      source: 'browser',
      ...(report.digest === null ? {} : { digest: report.digest }),
      // The pathname only — the route, never the query the customer was on.
      path: report.path,
    });
    Sentry.captureMessage(maskPersonalData(report.message), 'error');
  });
}
