import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { resetCarts } from './bag-db';
import { startMockServer, stopMockServer } from './node';

/**
 * D1 — the mock layer has to KEEP intercepting under Next's dev server, not just
 * start intercepting.
 *
 * Next's dev server captures `globalThis.fetch` at boot and, on every server-side
 * hot update, puts that pristine fetch back (`resetFetch`) so its own patch can be
 * re-applied. That throws MSW's proxy away. With Server Fast Refresh the module
 * holding the "armed" flag is usually NOT re-evaluated, so the old flag said
 * armed while every mocked call went to the network. These tests replay what
 * Next does to `globalThis.fetch` and ask whether a mocked endpoint still answers.
 */

const PRISTINE_FETCH = globalThis.fetch;

/* An origin that cannot resolve: only an intercepted request is ever answered. */
const BACKEND = 'http://backend.invalid';

/** What Next's `resetFetch()` does on a hot update. */
function nextResetsFetch(): void {
  globalThis.fetch = PRISTINE_FETCH;
}

/** What Next's `patchFetch()` does on the next request: wrap whatever is in force. */
function nextWrapsFetch(): void {
  const inner = globalThis.fetch;
  globalThis.fetch = (input, init) => inner(input, init);
}

/** A new cart's id from the mock, or null when nothing intercepted the request. */
async function createCartThroughFetch(): Promise<string | null> {
  const response = await fetch(`${BACKEND}${ENDPOINTS.bag.summary}`, { method: 'POST' }).then(
    (result) => result,
    () => null,
  );
  if (response === null || response.status !== 201) return null;

  const body: unknown = await response.json();
  return typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'string'
    ? body.id
    : null;
}

beforeEach(() => {
  resetCarts();
});

afterEach(() => {
  stopMockServer();
  globalThis.fetch = PRISTINE_FETCH;
});

describe('startMockServer', () => {
  it('intercepts once armed', async () => {
    startMockServer();

    expect(await createCartThroughFetch()).not.toBeNull();
  });

  it('re-arms after Next puts its boot-time fetch back, although this module was not re-evaluated', async () => {
    startMockServer();
    nextResetsFetch();
    nextWrapsFetch();

    startMockServer();

    expect(await createCartThroughFetch()).not.toBeNull();
  });

  it('keeps intercepting through a fetch Next wrapped around the proxy', async () => {
    startMockServer();
    nextWrapsFetch();

    startMockServer();
    const wrappedOnce = globalThis.fetch;
    startMockServer();

    expect(await createCartThroughFetch()).not.toBeNull();
    // Armed for the fetch in force, so a second call changes nothing.
    expect(globalThis.fetch).toBe(wrappedOnce);
  });

  it('handles one request once, however many times it has re-armed', async () => {
    startMockServer();
    nextResetsFetch();
    startMockServer();
    nextWrapsFetch();
    startMockServer();

    const first = await createCartThroughFetch();
    const second = await createCartThroughFetch();

    /* Cart ids are a sequence: a request handled twice would skip one. */
    expect(first?.endsWith('000000000001')).toBe(true);
    expect(second?.endsWith('000000000002')).toBe(true);
  });
});
