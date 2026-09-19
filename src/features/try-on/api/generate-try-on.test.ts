import { setupServer } from 'msw/node';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { productIdSchema } from '@/lib/domain/ids';
import { CATALOGUE } from '@/lib/mocks/catalogue-db';
import { handlers } from '@/lib/mocks/handlers';

import { generateTryOn } from './generate-try-on';

/**
 * §24's `generate` below the Route Handler: the real API client, its contract,
 * and module 14's stand-in at the HTTP layer (TEST-04), both sides of the Result
 * (TEST-05).
 *
 * What it pins is the refusal. A photograph the module will not use is the one
 * failure the customer can fix — by choosing another file — so it has to reach
 * the route as VALIDATION, which the route passes on as the 400 the panel reads
 * as "that file is not a photo we can use". The module used to answer 400, which
 * the client reads as SERVER, and the customer was told to try the same file
 * again.
 */

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const PRODUCT = productIdSchema.parse(CATALOGUE[0]?.id);

async function photograph(): Promise<File> {
  const jpeg = await sharp({
    create: { width: 48, height: 64, channels: 3, background: { r: 150, g: 120, b: 100 } },
  })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(jpeg)], 'me.jpg', { type: 'image/jpeg' });
}

describe('generateTryOn', () => {
  it.each([
    ['a format it never offered', new File(['GIF89a'], 'me.gif', { type: 'image/gif' })],
    [
      'bytes that are not a picture behind an accepted type',
      new File(['not a photograph'], 'me.jpg', { type: 'image/jpeg' }),
    ],
  ])('reports %s as VALIDATION, the customer’s to fix', async (_case, file) => {
    const result = await generateTryOn(PRODUCT, file);

    expect(result).toMatchObject({ ok: false, error: { kind: 'VALIDATION' } });
  });

  it('answers a usable photograph with the module’s own outcome', async () => {
    const result = await generateTryOn(PRODUCT, await photograph());

    // With no provider connected, the SAMPLE placeholder — and it says so.
    expect(result).toMatchObject({ ok: true, value: { status: 'SAMPLE' } });
  }, 15_000);
});
