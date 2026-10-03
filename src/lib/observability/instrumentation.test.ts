import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onRequestError, register } from '../../../instrumentation';

/**
 * F-08 — `instrumentation.ts` wires the tracker into Next: started once on the
 * Node.js runtime, handed every error Next catches, and absent from the Edge
 * runtime.
 */

const calls = vi.hoisted(() => ({ init: 0, requests: [] as unknown[][] }));
vi.mock('./error-tracking', () => ({
  initErrorTracking: () => {
    calls.init += 1;
  },
  captureRequestError: (...args: unknown[]) => {
    calls.requests.push(args);
  },
}));

const REQUEST = { path: '/order/AA100001?mobile=03001234567', method: 'GET', headers: {} };
const CONTEXT = {
  routerKind: 'App Router',
  routePath: '/app/order/[orderNumber]',
  routeType: 'render',
  renderSource: 'react-server-components',
  revalidateReason: undefined,
  renderType: 'dynamic',
} as const;

const original = process.env.NEXT_RUNTIME;

beforeEach(() => {
  calls.init = 0;
  calls.requests.length = 0;
});
afterEach(() => {
  if (original === undefined) delete process.env.NEXT_RUNTIME;
  else process.env.NEXT_RUNTIME = original;
});

describe('register', () => {
  it('starts the tracker on the Node.js runtime', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';

    await register();

    expect(calls.init).toBe(1);
  });

  it('starts nothing on the Edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';

    await register();

    expect(calls.init).toBe(0);
  });
});

describe('onRequestError', () => {
  it('hands the error, the request and the context to the tracker on Node.js', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    const error = new Error('boom');

    await onRequestError(error, REQUEST, CONTEXT);

    expect(calls.requests).toEqual([[error, REQUEST, CONTEXT]]);
  });

  it('reports nothing from the Edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';

    await onRequestError(new Error('boom'), REQUEST, CONTEXT);

    expect(calls.requests).toEqual([]);
  });
});
