import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ProductCardData } from '@/features/catalogue';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { productIdSchema } from '@/lib/domain/ids';

import { generateTryOn } from './generate-try-on';

/**
 * §24's `generate` below the Route Handler, both sides of the Result (TEST-05).
 *
 * The module does not cross the wire to reach the image model — it calls it
 * directly — but it DOES read the catalogue for the garment, so that read is
 * answered at the HTTP layer (TEST-04), per case.
 *
 * What it pins first is the refusal. A photograph the module will not use is
 * the one failure the customer can fix — by choosing another file — so it has
 * to reach the route as VALIDATION, which the route passes on as the 400 the
 * panel reads as "that file is not a photo we can use". The module used to
 * answer 400, which the client reads as SERVER, and the customer was told to
 * try the same file again.
 */

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => {
  server.close();
});

const PRODUCT = productIdSchema.parse('7d1f0a2c-0000-4000-8000-000000000003');

/** The card the catalogue answers with; its photograph is a real file under `public/`. */
function card(images: string[]): ProductCardData {
  return {
    id: PRODUCT,
    slug: 'kameez-ash',
    name: 'Kameez',
    type: 'SIMPLE',
    pieceCount: 1,
    images,
    workType: 'Plain',
    fabricName: 'Cotton',
    colourName: 'Ash',
    pricing: { currentMinor: 450_000, originalMinor: null },
    metreage: null,
    isNew: false,
    isMadeToMeasure: false,
  };
}

function catalogueAnswers(response: () => Response): void {
  server.use(http.get(`*${ENDPOINTS.catalogue.byIds}`, response));
}

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
    catalogueAnswers(() => HttpResponse.json([card(['/products/kameez-ash.avif'])]));

    const result = await generateTryOn(PRODUCT, file, 'en');

    expect(result).toMatchObject({ ok: false, error: { kind: 'VALIDATION' } });
  });

  it('answers a usable photograph with the module’s own outcome', async () => {
    catalogueAnswers(() => HttpResponse.json([card(['/products/kameez-ash.avif'])]));

    const result = await generateTryOn(PRODUCT, await photograph(), 'en');

    // No provider is configured in the test environment: §28.5's unavailable state.
    expect(result).toMatchObject({
      ok: true,
      value: { status: 'UNAVAILABLE', reason: 'PROVIDER_DISABLED' },
    });
  }, 15_000);

  it.each([
    ['a product the store does not sell', () => HttpResponse.json([]), 'NOT_FOUND'],
    ['a catalogue it cannot reach', () => HttpResponse.error(), 'NETWORK'],
  ])('reports %s as the store’s fault', async (_case, answer, kind) => {
    catalogueAnswers(answer);

    const result = await generateTryOn(PRODUCT, await photograph(), 'en');

    expect(result).toMatchObject({ ok: false, error: { kind } });
  });

  /*
   * ERR-10 — a garment the store cannot read answers exactly what a model
   * refusing does, so the log line is the only thing that tells the two apart.
   */
  it('says in the log when the garment photograph cannot be read', async () => {
    catalogueAnswers(() => HttpResponse.json([card(['/products/not-a-file.avif'])]));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await generateTryOn(PRODUCT, await photograph(), 'en');

    expect(result).toMatchObject({
      ok: true,
      value: { status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' },
    });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('[try-on:garment]'));
  });

  /*
   * R-04 — a garment on a host that is not the media host is refused, and the
   * refusal is ONE log line naming the address without any query string.
   */
  it('refuses a garment on a foreign host with one log line', async () => {
    catalogueAnswers(() =>
      HttpResponse.json([
        card(['https://elsewhere.example.com/p/front-1600-0a1b2c3d.avif?sig=abc']),
      ]),
    );
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await generateTryOn(PRODUCT, await photograph(), 'en');

    expect(result).toMatchObject({
      ok: true,
      value: { status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' },
    });
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged.mock.calls[0]?.[0]).toContain('[try-on:garment]');
    expect(logged.mock.calls[0]?.[0]).not.toContain('sig=abc');
  });
});
