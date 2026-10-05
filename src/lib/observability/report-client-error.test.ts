import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reportClientError } from './report-client-error';

/**
 * F-08 — the browser's error boundaries tell the server once per error, with a
 * beacon, and can never make the failure they report worse.
 */

const beacon = vi.fn<(url: string, data: Blob) => boolean>();

beforeEach(() => {
  beacon.mockReset();
  beacon.mockReturnValue(true);
  vi.stubGlobal('navigator', { sendBeacon: beacon });
  vi.stubGlobal('window', { location: { pathname: '/catalogue/some-product' } });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function sentBody(): Promise<unknown> {
  const blob = beacon.mock.calls[0]?.[1];
  return JSON.parse(await (blob?.text() ?? Promise.resolve('null'))) as unknown;
}

describe('reportClientError', () => {
  it('beacons the message, digest and pathname to the error route', async () => {
    const error = Object.assign(new Error('render failed'), { digest: 'dg-1' });

    reportClientError(error);

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]?.[0]).toBe('/api/client-error');
    expect(await sentBody()).toEqual({
      message: 'render failed',
      digest: 'dg-1',
      path: '/catalogue/some-product',
    });
  });

  it('sends a null digest for an error with none, and never the stack', async () => {
    reportClientError(new Error('plain'));

    expect(await sentBody()).toEqual({
      message: 'plain',
      digest: null,
      path: '/catalogue/some-product',
    });
  });

  it('cuts a long message to 500 characters', async () => {
    reportClientError(new Error('x'.repeat(900)));

    expect(((await sentBody()) as { message: string }).message).toHaveLength(500);
  });

  it('reports a given error once, however often the boundary runs its effect', () => {
    const error = new Error('again');

    reportClientError(error);
    reportClientError(error);
    reportClientError(error);

    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('reports two different errors separately', () => {
    reportClientError(new Error('one'));
    reportClientError(new Error('two'));

    expect(beacon).toHaveBeenCalledTimes(2);
  });

  it('never throws, even when the browser refuses the beacon', () => {
    beacon.mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => {
      reportClientError(new Error('x'));
    }).not.toThrow();
  });

  it('never throws in a browser with no sendBeacon at all', () => {
    vi.stubGlobal('navigator', {});

    expect(() => {
      reportClientError(new Error('y'));
    }).not.toThrow();
  });
});
