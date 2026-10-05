import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * F-08 — what reaches Sentry, and what never does. The SDK is replaced by a
 * recorder, so these are tests of OUR choices: when it starts, what it is told to
 * collect, and which parts of a failed request are sent.
 */

const env = vi.hoisted(() => ({
  SENTRY_DSN: undefined as string | undefined,
  VERCEL_ENV: undefined as string | undefined,
  NODE_ENV: 'test',
}));
vi.mock('@/config/env.server', () => ({ serverEnv: env }));

interface Recorded {
  initOptions: Record<string, unknown> | null;
  initialized: boolean;
  tags: Record<string, unknown>[];
  messages: [string, string][];
  exceptions: unknown[];
}

const recorded = vi.hoisted<Recorded>(() => ({
  initOptions: null,
  initialized: false,
  tags: [],
  messages: [],
  exceptions: [],
}));

vi.mock('@sentry/node', () => {
  const scope = {
    setTag: (key: string, value: unknown) => {
      recorded.tags.push({ [key]: value });
    },
    setTags: (tags: Record<string, unknown>) => {
      recorded.tags.push(tags);
    },
  };
  const integration = (name: string) => () => ({ name });
  return {
    init: (options: Record<string, unknown>) => {
      recorded.initOptions = options;
      recorded.initialized = true;
    },
    isInitialized: () => recorded.initialized,
    withScope: (callback: (scope: unknown) => void) => {
      callback(scope);
    },
    captureMessage: (message: string, level: string) => {
      recorded.messages.push([message, level]);
    },
    captureException: (error: unknown) => {
      recorded.exceptions.push(error);
    },
    eventFiltersIntegration: integration('EventFilters'),
    functionToStringIntegration: integration('FunctionToString'),
    linkedErrorsIntegration: integration('LinkedErrors'),
    dedupeIntegration: integration('Dedupe'),
    onUncaughtExceptionIntegration: integration('OnUncaughtException'),
    onUnhandledRejectionIntegration: integration('OnUnhandledRejection'),
  };
});

import { captureClientError, captureRequestError, initErrorTracking } from './error-tracking';
import { installErrorReporter, reportToTracker } from './error-reporter';

beforeEach(() => {
  env.SENTRY_DSN = undefined;
  env.VERCEL_ENV = undefined;
  recorded.initOptions = null;
  recorded.initialized = false;
  recorded.tags.length = 0;
  recorded.messages.length = 0;
  recorded.exceptions.length = 0;
  installErrorReporter(null);
});

describe('initErrorTracking', () => {
  it('does nothing without a DSN: nothing is sent and nothing is installed', () => {
    initErrorTracking();

    expect(recorded.initOptions).toBeNull();
    reportToTracker('error', 'api:test', 'a message');
    expect(recorded.messages).toEqual([]);
  });

  it('starts Sentry when a DSN is set, in the Vercel environment', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';
    env.VERCEL_ENV = 'production';

    initErrorTracking();

    expect(recorded.initOptions).toMatchObject({
      dsn: 'https://key@o0.ingest.sentry.io/1',
      environment: 'production',
      tracesSampleRate: 0,
    });
  });

  it('collects no user, cookie, header, body or query data', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';

    initErrorTracking();

    expect(recorded.initOptions?.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
    });
  });

  it('installs none of the integrations that record console output, requests or variables', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';

    initErrorTracking();

    const names = (recorded.initOptions?.defaultIntegrations as { name: string }[]).map(
      (integration) => integration.name,
    );
    expect(names).toEqual([
      'EventFilters',
      'FunctionToString',
      'LinkedErrors',
      'Dedupe',
      'OnUncaughtException',
      'OnUnhandledRejection',
    ]);
  });

  it('is idempotent', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';

    initErrorTracking();
    const first = recorded.initOptions;
    recorded.initOptions = null;
    initErrorTracking();

    expect(first).not.toBeNull();
    expect(recorded.initOptions).toBeNull();
  });

  it('strips the request and user, and masks personal data, from every event', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';
    initErrorTracking();
    const beforeSend = recorded.initOptions?.beforeSend as (event: Record<string, unknown>) => {
      request?: unknown;
      user?: unknown;
      message?: string;
      exception?: { values: { value: string }[] };
    };

    const event = beforeSend({
      request: { url: 'https://store/x', cookies: { session: 'v1.a.b' } },
      user: { email: 'a@b.co' },
      message: 'failed for ali@example.com',
      exception: { values: [{ value: 'rang 03001234567' }] },
    });

    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.message).toBe('failed for [email]');
    expect(event.exception?.values[0]?.value).toBe('rang [phone]');
  });

  it('routes what the logger reports to Sentry, at its level, with the context as a tag', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';
    initErrorTracking();

    reportToTracker('warning', 'made-to-measure', 'point has no words');

    expect(recorded.messages).toEqual([['point has no words', 'warning']]);
    expect(recorded.tags).toContainEqual({ context: 'made-to-measure' });
  });
});

describe('captureRequestError', () => {
  const request = {
    method: 'POST',
    headers: {
      'x-request-id': 'req-123',
      cookie: 'session=v1.secret',
      authorization: 'Bearer token',
    },
  };
  const context = {
    routePath: '/app/order/[orderNumber]',
    routeType: 'route',
    routerKind: 'App Router',
  };

  it('sends nothing before Sentry is started', () => {
    captureRequestError(new Error('boom'), request, context);

    expect(recorded.exceptions).toEqual([]);
  });

  it('sends the error with the route pattern, method, kind and request id — nothing else', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';
    initErrorTracking();
    const error = new Error('boom');

    captureRequestError(error, request, context);

    expect(recorded.exceptions).toEqual([error]);
    expect(recorded.tags).toContainEqual({
      routePath: '/app/order/[orderNumber]',
      routeType: 'route',
      routerKind: 'App Router',
      method: 'POST',
      requestId: 'req-123',
    });
    const sent = JSON.stringify(recorded);
    expect(sent).not.toContain('v1.secret');
    expect(sent).not.toContain('Bearer');
  });

  it('falls back to the platform’s request id, and leaves it out when there is none', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';
    initErrorTracking();

    captureRequestError(
      new Error('a'),
      { method: 'GET', headers: { 'x-vercel-id': ['bom1::abc'] } },
      context,
    );
    captureRequestError(new Error('b'), { method: 'GET', headers: {} }, context);

    expect(recorded.tags).toContainEqual(expect.objectContaining({ requestId: 'bom1::abc' }));
    expect(recorded.tags.at(-1)).not.toHaveProperty('requestId');
  });
});

describe('captureClientError', () => {
  it('sends the masked message with the digest and pathname as tags', () => {
    env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/1';
    initErrorTracking();

    captureClientError({
      message: 'render failed for ali@example.com',
      digest: 'd1',
      path: '/bag',
    });

    expect(recorded.messages).toEqual([['render failed for [email]', 'error']]);
    expect(recorded.tags).toContainEqual({ source: 'browser', digest: 'd1', path: '/bag' });
  });

  it('sends nothing before Sentry is started', () => {
    captureClientError({ message: 'x', digest: null, path: '/' });

    expect(recorded.messages).toEqual([]);
  });
});
