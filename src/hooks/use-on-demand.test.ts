import { describe, expect, it, vi } from 'vitest';

import { onDemandPart, onDemandState } from './use-on-demand';

/**
 * TEST-08 — a part of the page downloaded on demand used to be a `next/dynamic`
 * lazy component, which THROWS when its download fails and keeps the rejection:
 * the studio lost every figure typed to its route's error page, the bag or the
 * search panel swapped the whole store for the root's, and every later attempt
 * failed the same way until a reload. A failed download is a value now, and it
 * is not kept.
 */
const CHUNK_LOAD_ERROR = new Error('Failed to load chunk /_next/static/chunks/review.js');

describe('a part of the page downloaded on demand', () => {
  it('answers a failed download as a value, never a rejection (DATA-03)', async () => {
    const part = onDemandPart(() => Promise.reject(CHUNK_LOAD_ERROR));

    await expect(part.get()).resolves.toBeNull();
    expect(part.arrived()).toBeUndefined();
  });

  it('downloads again when asked after a failure, rather than keeping the refusal', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(CHUNK_LOAD_ERROR)
      .mockResolvedValueOnce('the review');
    const part = onDemandPart(load);

    await expect(part.get()).resolves.toBeNull();
    await expect(part.get()).resolves.toBe('the review');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one download among everything that asks while it is in flight', async () => {
    const load = vi.fn(() => Promise.resolve('the panel'));
    const part = onDemandPart(load);

    const [first, second] = await Promise.all([part.get(), part.get()]);

    expect([first, second]).toEqual(['the panel', 'the panel']);
    expect(load).toHaveBeenCalledOnce();
  });

  it('keeps what arrived, so it is never downloaded twice', async () => {
    const load = vi.fn(() => Promise.resolve('the form'));
    const part = onDemandPart(load);

    part.warm();
    await part.get();
    await part.get();

    expect(part.arrived()).toBe('the form');
    expect(load).toHaveBeenCalledOnce();
  });

  it('tells every surface drawing it the moment it arrives, and not after it stops listening', async () => {
    const part = onDemandPart(() => Promise.resolve('the contents'));
    const drawing = vi.fn();
    const closed = vi.fn();
    part.subscribe(drawing);
    part.subscribe(closed)();

    await part.get();

    expect(drawing).toHaveBeenCalledOnce();
    expect(closed).not.toHaveBeenCalled();
  });

  it('tells nobody about a failure, which stays with the surface that asked', async () => {
    const part = onDemandPart(() => Promise.reject(CHUNK_LOAD_ERROR));
    const listener = vi.fn();
    part.subscribe(listener);

    await part.get();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('where a part is, as a surface draws it', () => {
  it.each<[string, string | undefined, boolean, boolean, string]>([
    ['not asked for yet', undefined, false, false, 'IDLE'],
    ['asked for and on its way', undefined, false, true, 'LOADING'],
    ['refused by the network', undefined, true, true, 'FAILED'],
    ['arrived', 'the part', false, true, 'READY'],
    ['arrived after another surface asked again', 'the part', true, true, 'READY'],
    ['arrived before it was wanted, from a warm-up', 'the part', false, false, 'READY'],
  ])('%s', (_label, arrived, hasFailed, isWanted, status) => {
    expect(onDemandState(arrived, hasFailed, isWanted).status).toBe(status);
  });
});
